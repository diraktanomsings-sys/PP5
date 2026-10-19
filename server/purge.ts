import { randomUUID } from 'node:crypto';
import type { State, StoredFile } from './store.js';
import type { Service } from './service.js';
import type { Role, PurgePreview } from '../src/production/types.js';
import type { ObjectStorage } from './storage.js';
import { digest, requireThat } from './security.js';

export type PurgeKind = 'user' | 'course' | 'term';
export interface PurgeTask {
  kind: PurgeKind;
  targetId: string;
  planHash: string;
  fileIds: string[];
  removed: string[];
  startedAt: string;
  leaseToken?: string;
  leaseUntil?: number;
}
export const purgeKey = (kind: string, id: string) => `${kind}:${id}`;
function plan(state: State, kind: PurgeKind, id: string): PurgePreview & { files: StoredFile[] } {
  requireThat(
    ['user', 'course', 'term'].includes(kind) && typeof id === 'string',
    400,
    'ประเภทรายการไม่ถูกต้อง',
  );
  const item = (
    kind === 'user' ? state.users : kind === 'course' ? state.courses : state.terms
  ).find((v) => v.id === id);
  requireThat(item?.deletedAt, 409, 'ย้ายรายการลงถังขยะก่อนลบถาวร');
  if (kind === 'user') {
    requireThat(
      !state.courses.some((c) => c.teacherId === id || c.reviewerId === id),
      409,
      'ยังมีรายวิชาอ้างอิงบัญชีนี้ รวมรายการในถังขยะ กรุณาลบถาวรรายวิชาหรือเปลี่ยนผู้รับผิดชอบก่อน',
    );
    requireThat(
      !state.submissions.some(
        (s) =>
          s.approval?.by === id ||
          s.approvalHistory?.some((h) => h.by === id || h.approval.by === id) ||
          s.versions.some(
            (v) =>
              v.submittedBy === id || v.review?.by === id || v.findings?.some((f) => f.by === id),
          ),
      ),
      409,
      'ยังมีเอกสารหรือหลักฐานอนุมัติอ้างอิงบัญชีนี้ กรุณาจัดการรายวิชาที่เกี่ยวข้องก่อน',
    );
  }
  if (kind === 'term')
    requireThat(
      !state.courses.some((c) => c.termId === id),
      409,
      'ยังมีรายวิชาในภาคเรียนนี้ รวมถังขยะ กรุณาลบถาวรรายวิชาก่อน',
    );
  const files = Object.values(state.files)
    .filter((f) =>
      kind === 'course' ? f.courseId === id : kind === 'user' ? f.ownerId === id : false,
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const fileIds = new Set(files.map((f) => f.id));
  requireThat(
    !state.submissions.some(
      (s) =>
        (kind !== 'course' || s.courseId !== id) &&
        s.versions.some((v) =>
          [v.excel.id, v.pdf.id, v.review?.annotated?.id].some((f) => f && fileIds.has(f)),
        ),
    ),
    409,
    'มีไฟล์ถูกใช้อยู่ในเอกสารอื่น จึงยังลบถาวรไม่ได้',
  );
  const task = state.purges?.[purgeKey(kind, id)];
  if (!task) {
    requireThat(
      !files.some((f) => !f.ready && f.expiresAt + 180000 > Date.now()),
      409,
      'มีไฟล์อัปโหลดค้าง กรุณารอให้การอัปโหลดเสร็จหรือหมดอายุก่อนลบถาวร',
    );
    requireThat(
      !files.some((f) => (state.storageWrites?.[f.id]?.expiresAt || 0) > Date.now()),
      409,
      'มีไฟล์กำลังบันทึกหรือย้ายเข้า Drive กรุณาลองใหม่เมื่อเสร็จ',
    );
  }
  const submissions = state.submissions.filter((s) => kind === 'course' && s.courseId === id);
  const hash = digest(JSON.stringify({ kind, id, deletedAt: item.deletedAt, files, submissions }));
  const label =
    kind === 'user'
      ? state.users.find((u) => u.id === id)!.name
      : kind === 'course'
        ? `${state.courses.find((c) => c.id === id)!.code} ${state.courses.find((c) => c.id === id)!.grade}`
        : `${state.terms.find((t) => t.id === id)!.year}/${state.terms.find((t) => t.id === id)!.semester}`;
  return {
    kind,
    id,
    label,
    files,
    fileCount: files.length,
    bytes: files.reduce((n, f) => n + f.size, 0),
    submissionCount: submissions.length,
    versionCount: submissions.reduce((n, s) => n + s.versions.length, 0),
    planHash: task?.planHash || hash,
    removed: task?.removed.length || 0,
    continuing: !!task,
  };
}
export async function previewPurge(
  service: Service,
  token: string,
  role: Role,
  kind: PurgeKind,
  id: string,
): Promise<PurgePreview> {
  const state = await service.store.read();
  service.actor(state, token, role, ['ADMIN']);
  const { files, ...preview } = plan(state, kind, id);
  return preview;
}
export async function purgeStep(
  service: Service,
  storage: ObjectStorage,
  token: string,
  role: Role,
  body: any,
) {
  const key = purgeKey(body.kind, body.id),
    lease = randomUUID();
  const task = await service.store.write((s) => {
    const admin = service.actor(s, token, role, ['ADMIN']);
    requireThat(
      body.confirmed === true && body.confirmation === 'ลบถาวร',
      400,
      'พิมพ์ ลบถาวร เพื่อยืนยัน',
    );
    requireThat(body.kind !== 'user' || body.id !== admin.id, 400, 'ลบบัญชีตนเองไม่ได้');
    const p = plan(s, body.kind, body.id);
    requireThat(body.planHash === p.planHash, 409, 'ข้อมูลเปลี่ยนแล้ว กรุณาเปิดสรุปการลบอีกครั้ง');
    requireThat(!p.fileCount || storage.remove, 503, 'พื้นที่เก็บไฟล์ยังไม่รองรับลบถาวร');
    s.purges ||= {};
    const job = (s.purges[key] ||= {
      kind: body.kind,
      targetId: body.id,
      planHash: p.planHash,
      fileIds: p.files.map((f) => f.id),
      removed: [],
      startedAt: new Date().toISOString(),
    });
    requireThat(
      !job.leaseUntil || job.leaseUntil < Date.now(),
      409,
      'รายการนี้กำลังลบอยู่ กรุณารอสักครู่แล้วลองต่อ',
    );
    job.leaseToken = lease;
    job.leaseUntil = Date.now() + 150000;
    return structuredClone(job);
  });
  try {
    const nextId = task.fileIds.find((id) => !task.removed.includes(id));
    if (nextId) {
      const file = (await service.store.read()).files[nextId];
      requireThat(file, 409, 'ข้อมูลไฟล์เปลี่ยนแปลง กรุณาติดต่อผู้ดูแล');
      await storage.remove!(file);
      await service.store.write((s) => {
        const job = s.purges?.[key];
        requireThat(job?.leaseToken === lease, 409, 'งานลบเปลี่ยนแปลง');
        if (!job.removed.includes(nextId)) job.removed.push(nextId);
      });
    }
    return await service.store.write((s) => {
      const job = s.purges?.[key];
      requireThat(job?.leaseToken === lease, 409, 'งานลบเปลี่ยนแปลง');
      if (job.removed.length < job.fileIds.length)
        return { done: false, removed: job.removed.length, total: job.fileIds.length };
      const admin = service.actor(s, token, role, ['ADMIN']);
      const targetIds = new Set([job.targetId, ...job.fileIds]);
      if (job.kind === 'course') {
        for (const sub of s.submissions.filter((sub) => sub.courseId === job.targetId))
          targetIds.add(sub.id);
        s.submissions = s.submissions.filter((sub) => sub.courseId !== job.targetId);
        s.courses = s.courses.filter((c) => c.id !== job.targetId);
      } else if (job.kind === 'term') s.terms = s.terms.filter((t) => t.id !== job.targetId);
      else {
        s.users = s.users.filter((u) => u.id !== job.targetId);
        for (const [key, session] of Object.entries(s.sessions))
          if (session.userId === job.targetId) delete s.sessions[key];
        for (const event of s.audit)
          if (event.actorId === job.targetId) {
            event.actorName = 'บัญชีที่ลบถาวร';
            event.actorId = '';
          }
      }
      for (const id of job.fileIds) {
        delete s.files[id];
        if (s.storageWrites) delete s.storageWrites[id];
      }
      for (const [key, v] of Object.entries(s.driveJobs || {}))
        if (v.fileId && targetIds.has(v.fileId)) delete s.driveJobs![key];
      s.audit = s.audit.filter((a) => !targetIds.has(a.target));
      service.log(s, admin, 'PERMANENTLY_DELETED', job.targetId, {
        kind: job.kind,
        files: job.fileIds.length,
        planHash: job.planHash,
      });
      delete s.purges![key];
      return { done: true, removed: job.fileIds.length, total: job.fileIds.length };
    });
  } finally {
    await service.store.write((s) => {
      const job = s.purges?.[key];
      if (job?.leaseToken === lease) {
        delete job.leaseToken;
        delete job.leaseUntil;
      }
    });
  }
}
