import { Readable } from 'node:stream';
import { digest, opaqueToken, requireThat, ApiError } from './security.js';
import type { Store, StoredFile } from './store.js';
import type { ObjectStorage } from './storage.js';
import type { Service } from './service.js';

export interface DriveConfig {
  url: string;
  folderId: string;
  enabled: boolean;
  folderName: string;
  ownerEmail: string;
  verifiedAt: string;
}
export interface DriveJob {
  kind: 'probe' | 'write' | 'read' | 'delete' | 'organize';
  layout?: string[];
  folderId: string;
  fileId?: string;
  driveId?: string;
  size?: number;
  sha256?: string;
  expiresAt: number;
}
const idPattern = /^[A-Za-z0-9_-]{1,200}$/;
export function bridgeUrl(value: unknown) {
  let url: URL;
  try {
    url = new URL(String(value));
  } catch {
    throw new ApiError(400, 'URL ตัวรับไฟล์ไม่ถูกต้อง');
  }
  requireThat(
    url.origin === 'https://script.google.com' &&
      /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password,
    400,
    'ใช้ URL เว็บแอป Apps Script ที่ลงท้าย /exec เท่านั้น',
  );
  return url.toString();
}
export class DriveBridge {
  constructor(
    public store: Store,
    private source: ObjectStorage,
    private transport: typeof fetch = fetch,
  ) {}
  async payload(key: unknown) {
    requireThat(
      typeof key === 'string' && /^[a-f0-9]{64}$/.test(key),
      403,
      'คำขอรับส่งไฟล์ไม่ถูกต้อง',
    );
    const job = await this.store.write((s) => {
      const hash = digest(key),
        job = s.driveJobs?.[hash];
      requireThat(job && job.expiresAt > Date.now(), 403, 'คำขอหมดอายุหรือถูกใช้แล้ว');
      delete s.driveJobs![hash];
      return job;
    });
    const info = { protocol: 'PP5-DRIVE-1', kind: job.kind, folderId: job.folderId };
    if (job.kind === 'probe') return info;
    const f = (await this.store.read()).files[job.fileId!];
    requireThat(f && f.size === job.size, 409, 'รายการไฟล์เปลี่ยนแปลง');
    const file = {
      id: f.id,
      name: f.name,
      kind: f.kind,
      size: job.size,
      sha256: job.sha256,
      driveId: job.driveId,
      layout: job.layout,
    };
    if (job.kind === 'read' || job.kind === 'delete' || job.kind === 'organize')
      return { ...info, file };
    const bytes = await this.source.bytes(f);
    requireThat(
      bytes.length === job.size && digest(bytes) === job.sha256,
      409,
      'ไฟล์ต้นทางเปลี่ยนแปลง',
    );
    return { ...info, file, base64: Buffer.from(bytes).toString('base64') };
  }
  private async invoke(
    config: Pick<DriveConfig, 'url' | 'folderId'>,
    job: Omit<DriveJob, 'expiresAt' | 'folderId'>,
  ) {
    const key = opaqueToken(),
      hash = digest(key);
    await this.store.write((s) => {
      s.driveJobs ||= {};
      for (const [k, v] of Object.entries(s.driveJobs))
        if (v.expiresAt <= Date.now()) delete s.driveJobs[k];
      requireThat(
        Object.keys(s.driveJobs).length < 40,
        429,
        'มีไฟล์กำลังรับส่งหลายรายการ กรุณาลองใหม่',
      );
      s.driveJobs[hash] = { ...job, folderId: config.folderId, expiresAt: Date.now() + 180_000 };
    });
    try {
      let response = await this.transport(bridgeUrl(config.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
        redirect: 'manual',
        signal: AbortSignal.timeout(50_000),
      });
      if ([301, 302, 303].includes(response.status)) {
        const location = response.headers.get('location');
        requireThat(location, 502, 'ตัวรับไฟล์ไม่ตอบกลับ');
        const redirect = new URL(location);
        requireThat(
          redirect.origin === 'https://script.googleusercontent.com' &&
            !redirect.username &&
            !redirect.password,
          502,
          'ตัวรับไฟล์ยังไม่เปิดให้ PP5 เชื่อมต่อ กรุณาตรวจการเผยแพร่',
        );
        response = await this.transport(redirect, {
          redirect: 'error',
          signal: AbortSignal.timeout(50_000),
        });
      }
      requireThat(
        response.ok && response.headers.get('content-type')?.includes('application/json'),
        502,
        'ตัวรับไฟล์ Google Drive ยังไม่พร้อมใช้งาน',
      );
      requireThat(response.body, 502, 'Google Drive ไม่ส่งข้อมูลกลับ');
      const chunks: Uint8Array[] = [];
      let size = 0;
      const reader = response.body.getReader();
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.length;
          requireThat(size <= 36 * 1024 * 1024, 502, 'ข้อมูลตอบกลับ Drive เกินกำหนด');
          chunks.push(part.value);
        }
      } finally {
        await reader.cancel();
      }
      let result: any;
      try {
        result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        throw new ApiError(502, 'ข้อมูลตอบกลับ Drive ไม่ถูกต้อง');
      }
      requireThat(result?.protocol === 'PP5-DRIVE-1', 502, 'รุ่นตัวรับไฟล์ Drive ไม่ถูกต้อง');
      const errors: Record<string, string> = {
        PRIVATE_FOLDER: 'โฟลเดอร์ Drive ต้องตั้งการเข้าถึงทั่วไปเป็นแบบจำกัด',
        ACCESS: 'บัญชีตัวรับไฟล์ไม่มีสิทธิ์ในโฟลเดอร์โรงเรียน',
        CHANGED: 'ไฟล์ใน Drive เปลี่ยนแปลงจากฉบับที่ส่ง',
        QUOTA: 'พื้นที่หรือโควตา Google Drive ไม่เพียงพอ กรุณาติดต่อผู้ดูแล',
      };
      requireThat(
        result.ok === true,
        409,
        errors[result.error] || 'รับส่งไฟล์กับ Google Drive ไม่สำเร็จ ยังไม่ได้ยืนยันบันทึก',
      );
      requireThat(
        result.folderId === config.folderId && result.private === true,
        409,
        'โฟลเดอร์ Drive ปลายทางไม่ตรงหรือเปิดเผยเป็นสาธารณะ',
      );
      return result;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(502, 'ติดต่อ Google Drive ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      await this.store.write((s) => {
        if (s.driveJobs) delete s.driveJobs[hash];
      });
    }
  }
  async configure(service: Service, token: string, role: any, body: any) {
    service.actor(await this.store.read(), token, role, ['ADMIN']);
    const url = bridgeUrl(body.url),
      folderId = String(body.folderId || '');
    requireThat(idPattern.test(folderId), 400, 'รหัสโฟลเดอร์ไม่ถูกต้อง');
    requireThat(body.confirmed === true, 400, 'กรุณายืนยันใช้พื้นที่ของโรงเรียนเป็นที่เก็บไฟล์');
    const before = await this.store.read();
    requireThat(
      !Object.values(before.files).some((f) => f.drive && f.drive.folderId !== folderId),
      409,
      'มีไฟล์อยู่ใน Drive เดิมแล้ว กรุณาย้ายข้อมูลอย่างเป็นระบบก่อนเปลี่ยนโฟลเดอร์',
    );
    const result = await this.invoke({ url, folderId }, { kind: 'probe' });
    requireThat(result.verified === true, 409, 'ตัวรับไฟล์ยังไม่ผ่านการทดสอบบันทึกและเปิดอ่าน');
    await this.store.write((s) => {
      const admin = service.actor(s, token, role, ['ADMIN']);
      requireThat(
        !Object.values(s.files).some((f) => f.drive && f.drive.folderId !== folderId),
        409,
        'โฟลเดอร์เปลี่ยนแปลงแล้ว',
      );
      s.driveConfig = {
        url,
        folderId,
        enabled: true,
        folderName: String(result.name || 'ปพ.5').slice(0, 200),
        ownerEmail: String(result.ownerEmail || '').slice(0, 200),
        verifiedAt: new Date().toISOString(),
      };
      s.settings ||= {};
      s.settings.organizationDriveUrl = `https://drive.google.com/drive/folders/${folderId}`;
      service.log(s, admin, 'DRIVE_CONNECTED', folderId, { folderName: s.driveConfig.folderName });
    });
  }
  async persist(file: StoredFile, bytes: Uint8Array): Promise<StoredFile['drive']> {
    if (file.drive) return file.drive;
    const config = (await this.store.read()).driveConfig;
    if (!config?.enabled) return undefined;
    requireThat(
      file.size === bytes.length && file.sha256 === digest(bytes),
      409,
      'ข้อมูลไฟล์ไม่ตรงกับต้นฉบับ',
    );
    const writeToken = opaqueToken();
    const layout = await this.store.write((s) => {
      requireThat(
        !Object.values(s.purges || {}).some((p) => p.fileIds.includes(file.id)),
        409,
        'ไฟล์อยู่ระหว่างลบถาวร',
      );
      requireThat(
        !s.storageWrites?.[file.id] || s.storageWrites[file.id].expiresAt <= Date.now(),
        409,
        'ไฟล์กำลังบันทึกอยู่',
      );
      s.storageWrites ||= {};
      s.storageWrites[file.id] = { token: writeToken, expiresAt: Date.now() + 150000 };
      return this.layout(s, file);
    });
    try {
      const r = await this.invoke(config, {
        kind: 'write',
        layout,
        fileId: file.id,
        size: file.size,
        sha256: file.sha256,
      });
      requireThat(
        idPattern.test(String(r.id)) &&
          r.sha256 === file.sha256 &&
          r.size === file.size &&
          r.organized === true &&
          idPattern.test(String(r.parentId)),
        409,
        'ไฟล์ Drive ไม่ตรงกับต้นฉบับ',
      );
      const pointer = {
        id: r.id,
        folderId: config.folderId,
        webViewLink: `https://drive.google.com/file/d/${r.id}/view`,
        copiedAt: new Date().toISOString(),
        parentId: r.parentId as string,
        layout,
      };
      // Save the pointer before releasing the storage lease, including an upload that later expires.
      await this.store.write((s) => {
        const current = s.files[file.id];
        requireThat(current && current.size === file.size, 409, 'รายการไฟล์เปลี่ยนแปลง');
        current.drive = pointer;
      });
      return pointer;
    } finally {
      await this.store.write((s) => {
        if (s.storageWrites?.[file.id]?.token === writeToken) delete s.storageWrites[file.id];
      });
    }
  }
  async remove(file: StoredFile) {
    const s = await this.store.read();
    requireThat(
      Object.values(s.purges || {}).some((job) => job.fileIds.includes(file.id)),
      403,
      'ลบไฟล์ได้เฉพาะรายการลบถาวรที่ยืนยันแล้ว',
    );
    if (file.drive || s.driveConfig?.enabled) {
      const config = s.driveConfig;
      requireThat(
        config && (!file.drive || config.folderId === file.drive.folderId),
        503,
        'ตัวรับไฟล์ Drive ของรายการนี้ไม่พร้อม',
      );
      const r = await this.invoke(config, {
        kind: 'delete',
        fileId: file.id,
        driveId: file.drive?.id,
        size: file.size,
        sha256: file.sha256,
        layout: file.drive?.layout || this.layout(s, file),
      });
      requireThat(r.deleted === true && r.fileId === file.id, 409, 'Drive ยังไม่ได้ยืนยันลบไฟล์');
    }
    if (!file.sourceReleased) {
      requireThat(this.source.remove, 503, 'พื้นที่เดิมยังไม่รองรับลบไฟล์');
      await this.source.remove(file);
    }
  }
  async bytes(file: StoredFile) {
    if (!file.drive) return this.source.bytes(file);
    const config = (await this.store.read()).driveConfig;
    requireThat(
      config && config.folderId === file.drive.folderId,
      503,
      'กรุณาเชื่อมตัวรับไฟล์ Drive ของโรงเรียน',
    );
    const r = await this.invoke(config, {
      kind: 'read',
      fileId: file.id,
      driveId: file.drive.id,
      size: file.size,
      sha256: file.sha256,
    });
    requireThat(
      typeof r.base64 === 'string' && r.base64.length <= Math.ceil(file.size / 3) * 4,
      409,
      'ขนาดข้อมูล Drive ไม่ตรงกัน',
    );
    const bytes = Buffer.from(r.base64, 'base64');
    requireThat(
      bytes.length === file.size && digest(bytes) === file.sha256,
      409,
      'ไฟล์ใน Drive เปลี่ยนแปลงจากต้นฉบับ',
    );
    return bytes;
  }
  async migrate(service: Service, token: string, role: any, fileId: string) {
    const s = await this.store.read(),
      user = service.actor(s, token, role, ['ADMIN']);
    const f = s.files[fileId];
    requireThat(f?.ready && f.used, 404, 'ไม่พบไฟล์ที่ส่งแล้ว');
    requireThat(s.driveConfig?.enabled, 409, 'เชื่อม Drive ก่อนย้ายไฟล์');
    if (f.drive) return;
    const bytes = await this.source.bytes(f),
      drive = await this.persist(f, bytes);
    requireThat(drive, 409, 'Drive ยังไม่พร้อม');
    await this.store.write((s) => {
      service.actor(s, token, role, ['ADMIN']);
      requireThat(s.files[f.id]?.sha256 === f.sha256, 409, 'ไฟล์เปลี่ยนแปลง');
      s.files[f.id].drive = drive;
      service.log(s, user, 'FILE_COPIED_TO_DRIVE', f.id, { sha256: f.sha256 });
    });
    // Keep the previous originals when migrating existing submitted documents.
  }
  async cleanupSource(service: Service, token: string, role: any, body: any) {
    service.actor(await this.store.read(), token, role, ['ADMIN']);
    requireThat(body.confirmed === true, 400, 'กรุณายืนยันคืนพื้นที่สำเนาชั่วคราว');
    const file = (await this.store.read()).files[body.id];
    requireThat(file?.ready && file.drive, 409, 'ไฟล์นี้ยังไม่มีฉบับที่ยืนยันแล้วใน Drive');
    await this.releaseSource(file, true, true);
    requireThat(
      (await this.store.read()).files[file.id]?.sourceReleased,
      503,
      'พื้นที่เดิมยังไม่รองรับคืนพื้นที่',
    );
    await this.store.write((s) =>
      service.log(s, service.actor(s, token, role, ['ADMIN']), 'TEMPORARY_COPY_RELEASED', file.id, {
        driveId: file.drive!.id,
        sha256: file.sha256,
      }),
    );
  }
  private async releaseSource(file: StoredFile, verify = false, allowUsed = false) {
    if (!file.drive || file.sourceReleased || (file.used && !allowUsed) || !this.source.remove)
      return;
    const lease = opaqueToken();
    const saved = await this.store.write((s) => {
      const current = s.files[file.id];
      requireThat(
        current?.ready && current.drive?.id === file.drive!.id && current.sha256 === file.sha256,
        409,
        'ข้อมูลไฟล์เปลี่ยนแปลง จึงยังไม่คืนพื้นที่',
      );
      if (current.sourceReleased) return undefined;
      requireThat(
        !Object.values(s.purges || {}).some((p) => p.fileIds.includes(file.id)) &&
          (s.storageWrites?.[file.id]?.expiresAt || 0) <= Date.now(),
        409,
        'ไฟล์กำลังบันทึกหรือกำลังลบ',
      );
      s.storageWrites ||= {};
      s.storageWrites[file.id] = { token: lease, expiresAt: Date.now() + 150000 };
      return structuredClone(current);
    });
    if (!saved) return;
    try {
      // Old retained copies must be verified against the actual Drive bytes again.
      // New uploads already passed the receiver's exact-byte check before ready=true.
      if (verify) await this.bytes(saved);
      await this.source.remove(saved);
      await this.store.write((s) => {
        requireThat(
          s.files[file.id]?.drive?.id === saved.drive!.id &&
            s.files[file.id]?.sha256 === saved.sha256,
          409,
          'ตำแหน่งไฟล์เปลี่ยนแปลง',
        );
        s.files[file.id].sourceReleased = true;
      });
    } finally {
      await this.store.write((s) => {
        if (s.storageWrites?.[file.id]?.token === lease) delete s.storageWrites[file.id];
      });
    }
  }
  private layout(s: import('./store.js').State, file: StoredFile) {
    const c = s.courses.find((c) => c.id === file.courseId);
    const t = s.terms.find((t) => t.id === c?.termId);
    requireThat(c && t, 409, 'ไม่พบรายวิชาหรือภาคเรียนของไฟล์');
    const safe = (v: string) =>
      v
        .replace(/[\\/\u0000-\u001f]/g, '-')
        .trim()
        .slice(0, 140) || 'ไม่ระบุ';
    return [
      `ปีการศึกษา ${t.year} ภาคเรียนที่ ${t.semester}`,
      `ชั้น ${safe(c.grade)}`,
      safe(`${c.code} ${c.name}`),
    ];
  }
  async organize(service: Service, token: string, role: any, fileId: string) {
    const s = await this.store.read();
    service.actor(s, token, role, ['ADMIN']);
    const f = s.files[fileId];
    requireThat(
      f?.ready && f.used && f.drive && s.driveConfig?.enabled,
      409,
      'ไม่พบไฟล์ที่ส่งแล้วใน Drive',
    );
    const layout = this.layout(s, f),
      lease = opaqueToken();
    await this.store.write((state) => {
      service.actor(state, token, role, ['ADMIN']);
      service.noCoursePurge(state, f.courseId);
      requireThat(
        !Object.values(state.purges || {}).some((p) => p.fileIds.includes(f.id)) &&
          (state.storageWrites?.[f.id]?.expiresAt || 0) <= Date.now(),
        409,
        'ไฟล์กำลังบันทึกหรือลบอยู่',
      );
      state.storageWrites ||= {};
      state.storageWrites[f.id] = { token: lease, expiresAt: Date.now() + 150000 };
    });
    try {
      const r = await this.invoke(s.driveConfig!, {
        kind: 'organize',
        fileId: f.id,
        driveId: f.drive!.id,
        size: f.size,
        sha256: f.sha256,
        layout,
      });
      requireThat(
        r.organized === true &&
          r.id === f.drive!.id &&
          r.sha256 === f.sha256 &&
          r.size === f.size &&
          idPattern.test(String(r.parentId)),
        409,
        'Drive ยังไม่ได้ยืนยันจัดโฟลเดอร์',
      );
      await this.store.write((state) => {
        const current = state.files[f.id];
        requireThat(current?.drive?.id === f.drive!.id, 409, 'ไฟล์เปลี่ยนแปลงแล้ว');
        current.drive.parentId = r.parentId;
        current.drive.layout = layout;
        service.log(
          state,
          service.actor(state, token, role, ['ADMIN']),
          'DRIVE_FILE_ORGANIZED',
          f.id,
          { layout },
        );
      });
    } finally {
      await this.store.write((state) => {
        if (state.storageWrites?.[f.id]?.token === lease) delete state.storageWrites[f.id];
      });
    }
  }
  storage(): ObjectStorage {
    return {
      kind: this.source.kind,
      remove: (f) => this.remove(f),
      write: this.source.write,
      bytes: (f) => this.bytes(f),
      read: async (f) => (f.drive ? Readable.from([await this.bytes(f)]) : this.source.read(f)),
      persist: (f, b) => this.persist(f, b),
      release: (f) => this.releaseSource(f),
    };
  }
}
