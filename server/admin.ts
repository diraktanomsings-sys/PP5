import { randomUUID } from 'node:crypto';
import type { Service } from './service.js';
import type { State } from './store.js';
import type { Role, Course } from '../src/production/types.js';
import { requireThat, text, hashPassword, checkPassword } from './security.js';

const roles: Role[] = ['ADMIN', 'EXECUTIVE', 'REVIEWER', 'TEACHER'];
const optional = (value: unknown, length = 200) =>
  typeof value === 'string' ? value.trim().slice(0, length) : '';
const date = (value: unknown) => {
  requireThat(
    typeof value === 'string' && Number.isFinite(Date.parse(value)),
    400,
    'วันที่ไม่ถูกต้อง',
  );
  return new Date(value).toISOString();
};
export function driveUrl(value: unknown) {
  if (!value) return '';
  let url: URL;
  try {
    url = new URL(String(value));
  } catch {
    requireThat(false, 400, 'ลิงก์ Google Drive ไม่ถูกต้อง');
  }
  requireThat(
    url!.protocol === 'https:' &&
      ['drive.google.com', 'docs.google.com'].includes(url!.hostname) &&
      !url!.username &&
      !url!.password,
    400,
    'ใช้ลิงก์ HTTPS ของ Google Drive เท่านั้น',
  );
  return url!.toString().slice(0, 2000);
}
export function courseData(s: State, body: any): Omit<Course, 'id' | 'createdAt'> {
  requireThat(
    s.terms.some((t) => t.id === body.termId && !t.deletedAt),
    400,
    'ไม่พบภาคเรียน',
  );
  const teacher = s.users.find(
    (u) => u.id === body.teacherId && u.active && u.roles.includes('TEACHER'),
  );
  requireThat(teacher, 400, 'กรุณาเลือกครูผู้สอนที่มีสิทธิ์');
  const reviewerId = optional(body.reviewerId);
  if (reviewerId)
    requireThat(
      s.users.some((u) => u.id === reviewerId && u.active && u.roles.includes('REVIEWER')) &&
        reviewerId !== teacher.id,
      400,
      'ผู้ตรวจต้องมีสิทธิ์และเป็นคนละคนกับผู้สอน',
    );
  const creditHours = Number(body.creditHours ?? 0);
  requireThat(
    Number.isFinite(creditHours) && creditHours >= 0 && creditHours <= 100,
    400,
    'หน่วยกิตไม่ถูกต้อง',
  );
  const scoreRatio = optional(body.scoreRatio, 20) || '70:30';
  requireThat(
    /^\d{1,3}:\d{1,3}$/.test(scoreRatio) &&
      scoreRatio.split(':').reduce((a, b) => a + Number(b), 0) === 100,
    400,
    'สัดส่วนคะแนนต้องรวมเป็น 100',
  );
  return {
    termId: body.termId,
    code: text(body.code, 'รหัสวิชา', 50),
    name: text(body.name, 'ชื่อวิชา'),
    grade: text(body.grade, 'ชั้น/ห้อง', 50),
    teacherId: teacher.id,
    reviewerId,
    open: body.open !== false,
    department: optional(body.department),
    creditHours,
    scoreRatio,
    assignmentType: body.assignmentType === 'GRADE_LEVEL' ? 'GRADE_LEVEL' : 'DEPARTMENT',
  };
}
export const adminActions = new Set([
  'user-delete',
  'user-restore',
  'course-delete',
  'course-restore',
  'term-delete',
  'term-restore',
  'school-settings',
  'user-edit',
  'user-password',
  'term-active',
  'term-edit',
  'course-edit',
  'courses-import',
  'courses-clone',
  'reviewers',
  'unlock',
]);
export async function adminCommand(
  service: Service,
  token: string,
  role: Role,
  action: string,
  body: any,
) {
  const before = await service.store.read();
  const actor = service.actor(before, token, role, ['ADMIN']);
  let passwordHash: string | undefined;
  if (action === 'user-password') {
    requireThat(body.id !== actor.id, 400, 'เปลี่ยนรหัสของตนเองที่เมนูเปลี่ยนรหัสผ่าน');
    passwordHash = await hashPassword(body.password);
  }
  if (action === 'unlock')
    requireThat(
      typeof body.password === 'string' && (await checkPassword(body.password, actor.passwordHash)),
      403,
      'รหัสผ่านผู้ดูแลไม่ถูกต้อง',
    );
  return service.store.write((s) => {
    const admin = service.actor(s, token, role, ['ADMIN']);
    if (
      [
        'user-delete',
        'user-restore',
        'course-delete',
        'course-restore',
        'term-delete',
        'term-restore',
      ].includes(action)
    ) {
      requireThat(body.confirmed === true, 400, 'กรุณายืนยันรายการ');
      const [kind, command] = action.split('-');
      const remove = command === 'delete';
      const list = kind === 'user' ? s.users : kind === 'course' ? s.courses : s.terms;
      const item = list.find((v) => v.id === body.id);
      requireThat(item, 404, 'ไม่พบรายการ');
      requireThat(
        !s.purges?.[`${kind}:${item.id}`],
        409,
        'รายการนี้เริ่มลบถาวรแล้ว กรุณากดลบถาวรเพื่อดำเนินการต่อ',
      );
      requireThat(
        remove ? !item.deletedAt : !!item.deletedAt,
        409,
        'สถานะรายการเปลี่ยนแล้ว กรุณารีเฟรช',
      );
      if (kind === 'user') {
        const u = s.users.find((u) => u.id === item.id)!;
        requireThat(u.id !== admin.id, 400, 'ลบบัญชีของตนเองไม่ได้');
        if (remove)
          requireThat(
            !s.courses.some((c) => !c.deletedAt && (c.teacherId === u.id || c.reviewerId === u.id)),
            409,
            'ครูยังมีรายวิชาหรืองานตรวจ กรุณาย้ายผู้รับผิดชอบหรือลบรายวิชาก่อน',
          );
        u.active = false;
        for (const [key, session] of Object.entries(s.sessions))
          if (session.userId === u.id) delete s.sessions[key];
      } else if (kind === 'course') {
        const c = s.courses.find((c) => c.id === item.id)!;
        if (!remove)
          requireThat(
            s.terms.some((t) => t.id === c.termId && !t.deletedAt) &&
              s.users.some(
                (u) =>
                  u.id === c.teacherId && !u.deletedAt && u.active && u.roles.includes('TEACHER'),
              ) &&
              (!c.reviewerId ||
                s.users.some(
                  (u) =>
                    u.id === c.reviewerId &&
                    !u.deletedAt &&
                    u.active &&
                    u.roles.includes('REVIEWER'),
                )),
            409,
            'กู้คืนภาคเรียนและเปิดใช้งานครูผู้สอน/ผู้ตรวจก่อนกู้คืนรายวิชา',
          );
        c.open = false;
        const sub = s.submissions.find((sub) => sub.courseId === c.id);
        if (sub) sub.revision++;
      } else {
        const term = s.terms.find((t) => t.id === item.id)!;
        if (remove) {
          requireThat(!term.active, 409, 'ตั้งภาคเรียนอื่นเป็นภาคเรียนปัจจุบันก่อนลบ');
          requireThat(
            !s.courses.some((c) => c.termId === term.id && !c.deletedAt),
            409,
            'ภาคเรียนยังมีรายวิชา กรุณาลบรายวิชาในภาคเรียนนี้ก่อน',
          );
        }
        term.active = false;
      }
      if (remove) item.deletedAt = new Date().toISOString();
      else delete item.deletedAt;
      service.log(s, admin, `${kind.toUpperCase()}_${remove ? 'DELETED' : 'RESTORED'}`, item.id, {
        recoverable: true,
      });
    } else if (action === 'user-password') {
      const u = s.users.find((u) => u.id === body.id);
      requireThat(u && !u.deletedAt && passwordHash, 404, 'ไม่พบบัญชีที่ใช้งานอยู่');
      u.passwordHash = passwordHash;
      for (const [key, session] of Object.entries(s.sessions))
        if (session.userId === u.id) delete s.sessions[key];
      service.log(s, admin, 'USER_PASSWORD_RESET', u.id);
    } else if (action === 'user-edit') {
      const u = s.users.find((u) => u.id === body.id);
      requireThat(u && !u.deletedAt, 404, 'ไม่พบบัญชีที่ใช้งานอยู่');
      const nextRoles = body.roles ?? u.roles;
      requireThat(
        Array.isArray(nextRoles) &&
          nextRoles.length > 0 &&
          nextRoles.every((r) => roles.includes(r)),
        400,
        'บทบาทไม่ถูกต้อง',
      );
      const active = body.active ?? u.active;
      requireThat(typeof active === 'boolean', 400, 'สถานะไม่ถูกต้อง');
      if (u.roles.includes('ADMIN') && (!active || !nextRoles.includes('ADMIN')))
        requireThat(
          s.users.some((p) => p.id !== u.id && p.active && p.roles.includes('ADMIN')),
          400,
          'ต้องมีผู้ดูแลที่ใช้งานได้อย่างน้อยหนึ่งคน',
        );
      const email = text(body.email ?? u.email, 'อีเมล').toLowerCase();
      const teacherId = text(body.teacherId ?? u.teacherId, 'รหัสบุคลากร', 50);
      const citizenId =
        typeof (body.citizenId ?? u.citizenId) === 'string'
          ? (body.citizenId ?? u.citizenId).trim()
          : '';
      requireThat(!citizenId || /^\d{13}$/.test(citizenId), 400, 'เลขประจำตัวต้องมี 13 หลัก');
      requireThat(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
          !s.users.some(
            (p) =>
              p.id !== u.id &&
              (p.email === email ||
                p.teacherId.toLowerCase() === teacherId.toLowerCase() ||
                (citizenId && p.citizenId === citizenId)),
          ),
        400,
        'อีเมลหรือรหัสบุคลากรซ้ำหรือไม่ถูกต้อง',
      );
      const changed = u.active !== active || JSON.stringify(u.roles) !== JSON.stringify(nextRoles);
      Object.assign(u, {
        name: text(body.name ?? u.name, 'ชื่อ'),
        email,
        teacherId,
        citizenId,
        department: optional(body.department ?? u.department),
        active,
        roles: [...new Set(nextRoles)],
      });
      if (changed)
        for (const [key, session] of Object.entries(s.sessions))
          if (session.userId === u.id) delete s.sessions[key];
      service.log(s, admin, 'USER_UPDATED', u.id, { roles: u.roles, active });
    } else if (action === 'school-settings') {
      s.settings ||= {};
      if (body.schoolLogo !== undefined) {
        const logo = body.schoolLogo;
        requireThat(
          typeof logo === 'string' && logo.length <= 210_000,
          400,
          'ตราโรงเรียนต้องมีขนาดไม่เกิน 150 KB',
        );
        if (logo) {
          requireThat(
            /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo),
            400,
            'รองรับ PNG JPEG หรือ WebP',
          );
          const bytes = Buffer.from(logo.split(',')[1], 'base64');
          requireThat(
            bytes.length <= 150_000 &&
              (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
                bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
                (bytes.toString('ascii', 0, 4) === 'RIFF' &&
                  bytes.toString('ascii', 8, 12) === 'WEBP')),
            400,
            'ไฟล์รูปภาพไม่ถูกต้อง',
          );
        }
        s.settings.schoolLogo = logo;
      }
      if (body.organizationDriveUrl !== undefined) {
        const url = driveUrl(body.organizationDriveUrl);
        requireThat(
          !s.driveConfig?.enabled ||
            url === `https://drive.google.com/drive/folders/${s.driveConfig.folderId}`,
          409,
          'เปลี่ยนปลายทางผ่านการเชื่อม Google Drive เท่านั้น',
        );
        s.settings.organizationDriveUrl = url;
      }
      if (body.organizationDriveTitle !== undefined)
        s.settings.organizationDriveTitle = text(body.organizationDriveTitle, 'ชื่อโฟลเดอร์');
      service.log(s, admin, 'SCHOOL_SETTINGS_UPDATED', 'school', {
        logoChanged: body.schoolLogo !== undefined,
        driveChanged: body.organizationDriveUrl !== undefined,
      });
    } else if (action === 'term-active' || action === 'term-edit') {
      const t = s.terms.find((t) => t.id === body.id);
      requireThat(t && !t.deletedAt, 404, 'ไม่พบภาคเรียนที่ใช้งานอยู่');
      if (action === 'term-active') {
        s.terms.forEach((t) => (t.active = false));
        t.active = true;
        t.archived = false;
      } else {
        if (body.deadline) t.deadline = date(body.deadline);
        if (body.reviewDeadline) t.reviewDeadline = date(body.reviewDeadline);
        if (typeof body.archived === 'boolean') {
          requireThat(!body.archived || !t.active, 400, 'ปิดรอบปัจจุบันก่อนจัดเก็บ');
          t.archived = body.archived;
        }
      }
      service.log(s, admin, 'TERM_UPDATED', t.id);
    } else if (action === 'course-edit') {
      const c = s.courses.find((c) => c.id === body.id);
      requireThat(c && !c.deletedAt, 404, 'ไม่พบรายวิชาที่ใช้งานอยู่');
      const data = courseData(s, { ...c, ...body });
      requireThat(
        !s.submissions.some((sub) => sub.courseId === c.id) ||
          (data.teacherId === c.teacherId && data.termId === c.termId),
        409,
        'รายวิชาที่มีเอกสารแล้วเปลี่ยนครูหรือภาคเรียนไม่ได้',
      );
      requireThat(
        !s.courses.some(
          (p) =>
            p.id !== c.id &&
            p.termId === data.termId &&
            p.code === data.code &&
            p.grade === data.grade,
        ),
        409,
        'รายวิชาซ้ำ',
      );
      Object.assign(c, data);
      service.log(s, admin, 'COURSE_MODIFIED', c.id);
    } else if (action === 'courses-import' || action === 'courses-clone') {
      let rows = body.courses;
      if (action === 'courses-clone') {
        requireThat(
          body.fromTermId !== body.termId && s.terms.some((t) => t.id === body.termId),
          400,
          'เลือกภาคเรียนต้นทางและปลายทางคนละรอบ',
        );
        rows = s.courses
          .filter((c) => c.termId === body.fromTermId && !c.deletedAt)
          .map((c) => ({ ...c, termId: body.termId }));
      }
      requireThat(
        Array.isArray(rows) && rows.length > 0 && rows.length <= 200,
        400,
        'นำเข้าได้ 1–200 รายวิชาต่อครั้ง',
      );
      let count = 0;
      for (const row of rows) {
        const data = courseData(s, row);
        const duplicate = s.courses.some(
          (c) => c.termId === data.termId && c.code === data.code && c.grade === data.grade,
        );
        if (action === 'courses-clone' && duplicate) continue;
        requireThat(!duplicate, 409, `รายวิชาซ้ำ: ${data.code} ${data.grade}`);
        s.courses.push({ ...data, id: randomUUID(), createdAt: new Date().toISOString() });
        count++;
      }
      service.log(
        s,
        admin,
        action === 'courses-import' ? 'COURSES_IMPORTED' : 'COURSES_CLONED',
        body.termId || 'courses',
        { count },
      );
    } else if (action === 'reviewers') {
      requireThat(
        Array.isArray(body.assignments) &&
          body.assignments.length > 0 &&
          body.assignments.length <= 200,
        400,
        'รายการมอบหมายไม่ถูกต้อง',
      );
      const seen = new Set<string>();
      for (const a of body.assignments) {
        const c = s.courses.find((c) => c.id === a.courseId);
        requireThat(c && !c.deletedAt && !seen.has(c.id), 400, 'รายวิชาไม่ถูกต้องหรือถูกลบหรือซ้ำ');
        seen.add(c.id);
        requireThat(
          s.users.some((u) => u.id === a.reviewerId && u.active && u.roles.includes('REVIEWER')) &&
            a.reviewerId !== c.teacherId,
          400,
          'ผู้ตรวจต้องมีสิทธิ์และไม่ใช่ผู้สอน',
        );
        c.reviewerId = a.reviewerId;
        c.assignmentType = a.type === 'GRADE_LEVEL' ? 'GRADE_LEVEL' : 'DEPARTMENT';
        service.log(s, admin, 'REVIEWER_ASSIGNED', c.id, {
          reviewerId: c.reviewerId,
          type: c.assignmentType,
        });
      }
    } else if (action === 'unlock') {
      requireThat(
        admin.passwordHash === actor.passwordHash,
        409,
        'บัญชีเปลี่ยนแปลง กรุณาเข้าสู่ระบบใหม่',
      );
      const sub = s.submissions.find((sub) => sub.id === body.id);
      requireThat(
        s.courses.some((c) => c.id === sub?.courseId && !c.deletedAt),
        409,
        'กู้คืนรายวิชาก่อนปลดล็อกเอกสาร',
      );
      requireThat(
        sub &&
          sub.status === 'FINAL_LOCKED' &&
          sub.approval &&
          sub.revision === body.expectedRevision,
        409,
        'สถานะเปลี่ยนแปลงแล้ว',
      );
      const reason = text(body.reason, 'เหตุผลปลดล็อก', 4000);
      sub.approvalHistory ||= [];
      sub.approvalHistory.push({
        version: sub.versions.at(-1)!.number,
        approval: structuredClone(sub.approval),
        unlockedAt: new Date().toISOString(),
        by: admin.id,
        reason,
      });
      sub.status = 'REJECTED_REVISION';
      sub.revision++;
      delete sub.approval;
      service.log(s, admin, 'EMERGENCY_UNLOCKED', sub.id, {
        reason,
        version: sub.versions.at(-1)!.number,
      });
    }
  });
}
