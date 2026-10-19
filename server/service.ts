import { randomUUID } from 'node:crypto';
import type { Store, State, StoredUser, StoredFile } from './store.js';
import type {
  Person,
  Role,
  Snapshot,
  Audit,
  Submission,
  Version,
} from '../src/production/types.js';
import {
  requireThat,
  text,
  hashPassword,
  checkPassword,
  digest,
  opaqueToken,
  sameSecret,
} from './security.js';
import { unzipSync } from 'fflate';
export const MAX_FILE = 25 * 1024 * 1024;
export function verifyFileBytes(file: StoredFile, bytes: Uint8Array) {
  requireThat(
    bytes.length === file.size && bytes.length <= MAX_FILE,
    400,
    'ขนาดไฟล์ไม่ตรงกับที่ระบุ',
  );
  const header = Buffer.from(bytes.subarray(0, 8));
  if (file.kind === 'pdf') {
    requireThat(
      header.subarray(0, 5).toString() === '%PDF-' &&
        Buffer.from(bytes.subarray(Math.max(0, bytes.length - 2048))).includes(
          Buffer.from('%%EOF'),
        ),
      400,
      'เนื้อหาไฟล์ PDF ไม่ถูกต้อง',
    );
    return;
  }
  requireThat(header[0] === 0x50 && header[1] === 0x4b, 400, 'เนื้อหาไฟล์ Excel ไม่ถูกต้อง');
  try {
    let expanded = 0;
    let count = 0;
    const entries = unzipSync(bytes, {
      filter: (entry) => {
        count++;
        expanded += entry.originalSize;
        requireThat(
          count <= 5000 && expanded <= 100 * 1024 * 1024,
          400,
          'ไฟล์ Excel มีข้อมูลขยายขนาดเกินกำหนด',
        );
        requireThat(!/vbaProject\.bin$/i.test(entry.name), 400, 'ไม่รองรับไฟล์ Excel ที่มีมาโคร');
        return entry.name === '[Content_Types].xml' || entry.name === 'xl/workbook.xml';
      },
    });
    requireThat(
      entries['[Content_Types].xml'] && entries['xl/workbook.xml'],
      400,
      'ไฟล์นี้ไม่ใช่สมุดงาน .xlsx',
    );
  } catch (e) {
    if (e instanceof Error && e.name === 'ApiError') throw e;
    requireThat(false, 400, 'ไม่สามารถอ่านโครงสร้างไฟล์ .xlsx');
  }
}
const ROLES: Role[] = ['TEACHER', 'REVIEWER', 'EXECUTIVE', 'ADMIN'];
const publicUser = ({ passwordHash: _, ...user }: StoredUser): Person => user;
const now = () => new Date().toISOString();
const id = () => randomUUID();
export class Service {
  constructor(
    public store: Store,
    public storage: 'local' | 'blob',
    public setupToken: string,
  ) {}
  identity(state: State, token: string): StoredUser {
    const session = state.sessions[digest(token)];
    const user = state.users.find((u) => u.id === session?.userId && u.active);
    requireThat(
      token && session && session.expiresAt > Date.now() && user,
      401,
      'กรุณาเข้าสู่ระบบอีกครั้ง',
    );
    return user;
  }
  actor(state: State, token: string, role: Role, allowed: Role[] = ROLES) {
    const user = this.identity(state, token);
    requireThat(
      ROLES.includes(role) && user.roles.includes(role) && allowed.includes(role),
      403,
      'คุณไม่มีสิทธิ์ดำเนินการนี้',
    );
    return user;
  }
  log(state: State, user: Person, action: string, target: string, details: Audit['details'] = {}) {
    state.audit.push({
      id: id(),
      at: now(),
      actorId: user.id,
      actorName: user.name,
      action,
      target,
      details,
    });
  }
  session(state: State, user: Person) {
    const token = opaqueToken();
    for (const [key, session] of Object.entries(state.sessions))
      if (session.expiresAt <= Date.now()) delete state.sessions[key];
    state.sessions[digest(token)] = { userId: user.id, expiresAt: Date.now() + 8 * 3600_000 };
    return token;
  }
  async setup(body: any) {
    requireThat(
      this.setupToken.length >= 32 &&
        typeof body.token === 'string' &&
        sameSecret(body.token, this.setupToken),
      403,
      'รหัสเปิดใช้งานไม่ถูกต้อง',
    );
    const email = text(body.email, 'อีเมล').toLowerCase();
    requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 400, 'รูปแบบอีเมลไม่ถูกต้อง');
    const name = text(body.name, 'ชื่อผู้ดูแล');
    const passwordHash = await hashPassword(body.password);
    return this.store.write((s) => {
      requireThat(s.users.length === 0, 409, 'ระบบมีผู้ดูแลแล้ว กรุณาเข้าสู่ระบบ');
      const user: StoredUser = {
        id: id(),
        name,
        email,
        teacherId: 'ADMIN',
        roles: ['ADMIN'],
        active: true,
        passwordHash,
      };
      s.users.push(user);
      this.log(s, user, 'SETUP_COMPLETED', user.id);
      return this.session(s, user);
    });
  }
  async login(body: any, remoteIp: string) {
    const identifier = text(body.identifier, 'อีเมลหรือรหัสบุคลากร').toLowerCase();
    requireThat(
      typeof body.password === 'string' && body.password.length <= 128,
      400,
      'กรุณาระบุรหัสผ่าน',
    );
    const key = digest(`login:${remoteIp}:${identifier}`);
    const ipKey = digest(`login-ip:${remoteIp}`);
    // Persist attempts before the expensive password check so parallel workers share the limit.
    const user = await this.store.write((s) => {
      for (const [key, value] of Object.entries(s.attempts))
        if (value.until <= Date.now()) delete s.attempts[key];
      for (const [attemptKey, limit] of [
        [key, 8],
        [ipKey, 40],
      ] as const) {
        const a = s.attempts[attemptKey] || { count: 0, until: Date.now() + 15 * 60_000 };
        requireThat(a.count < limit, 429, 'ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาที');
        a.count++;
        s.attempts[attemptKey] = a;
      }
      return s.users.find(
        (u) => u.email.toLowerCase() === identifier || u.teacherId.toLowerCase() === identifier,
      );
    });
    const valid = await checkPassword(body.password, user?.passwordHash || 'scrypt:dummy:');
    requireThat(user && user.active && valid, 401, 'อีเมล/รหัสบุคลากรหรือรหัสผ่านไม่ถูกต้อง');
    return this.store.write((s) => {
      const current = s.users.find((u) => u.id === user.id);
      requireThat(
        current?.active && current.passwordHash === user.passwordHash,
        401,
        'ข้อมูลเข้าสู่ระบบเปลี่ยนแปลง กรุณาลองใหม่',
      );
      delete s.attempts[key];
      this.log(s, current, 'LOGIN', current.id);
      return this.session(s, current);
    });
  }
  async logout(token: string) {
    await this.store.write((s) => {
      const session = s.sessions[digest(token)];
      if (session) {
        const u = s.users.find((u) => u.id === session.userId);
        if (u) this.log(s, u, 'LOGOUT', u.id);
      }
      delete s.sessions[digest(token)];
    });
  }
  visible(s: State, user: Person, role: Role, courseId: string) {
    const c = s.courses.find((c) => c.id === courseId);
    return (
      c &&
      (role === 'ADMIN' ||
        role === 'EXECUTIVE' ||
        (role === 'TEACHER' && c.teacherId === user.id) ||
        (role === 'REVIEWER' && c.reviewerId === user.id && c.teacherId !== user.id))
    );
  }
  async snapshot(token: string, selected?: Role): Promise<Snapshot> {
    const s = await this.store.read();
    const user = this.identity(s, token);
    const role = selected || user.roles[0];
    this.actor(s, token, role);
    const courses = s.courses.filter((c) => this.visible(s, user, role, c.id));
    const ids = new Set(courses.map((c) => c.id));
    const peopleIds = new Set([user.id, ...courses.flatMap((c) => [c.teacherId, c.reviewerId])]);
    const submissions = s.submissions.filter((sub) => ids.has(sub.courseId));
    for (const sub of submissions) {
      if (sub.approval) peopleIds.add(sub.approval.by);
      for (const version of sub.versions) {
        peopleIds.add(version.submittedBy);
        if (version.review) peopleIds.add(version.review.by);
      }
    }
    return {
      user: publicUser(user),
      role,
      storage: this.storage,
      terms: s.terms,
      courses,
      people: s.users
        .filter((u) => role === 'ADMIN' || peopleIds.has(u.id))
        .map((u) => {
          const p = publicUser(u);
          return role === 'ADMIN' || u.id === user.id ? p : { ...p, email: '', teacherId: '' };
        }),
      submissions,
      audit: role === 'ADMIN' ? s.audit.slice(-200).reverse() : [],
    };
  }
  async createUser(token: string, role: Role, body: any) {
    const name = text(body.name, 'ชื่อ');
    const email = text(body.email, 'อีเมล').toLowerCase();
    const teacherId = text(body.teacherId, 'รหัสบุคลากร', 50);
    requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 400, 'รูปแบบอีเมลไม่ถูกต้อง');
    requireThat(
      Array.isArray(body.roles) &&
        body.roles.length > 0 &&
        body.roles.every((r: Role) => ROLES.includes(r)),
      400,
      'กรุณาระบุบทบาท',
    );
    this.actor(await this.store.read(), token, role, ['ADMIN']);
    const passwordHash = await hashPassword(body.password);
    await this.store.write((s) => {
      const admin = this.actor(s, token, role, ['ADMIN']);
      requireThat(
        !s.users.some(
          (u) => u.email === email || u.teacherId.toLowerCase() === teacherId.toLowerCase(),
        ),
        409,
        'อีเมลหรือรหัสบุคลากรนี้มีอยู่แล้ว',
      );
      const user: StoredUser = {
        id: id(),
        name,
        email,
        teacherId,
        roles: [...new Set(body.roles as Role[])],
        active: true,
        passwordHash,
      };
      s.users.push(user);
      this.log(s, admin, 'USER_CREATED', user.id, { roles: user.roles });
    });
  }
  async changePassword(token: string, body: any) {
    const user = this.identity(await this.store.read(), token);
    requireThat(
      typeof body.current === 'string' && (await checkPassword(body.current, user.passwordHash)),
      403,
      'รหัสผ่านเดิมไม่ถูกต้อง',
    );
    const passwordHash = await hashPassword(body.password);
    await this.store.write((s) => {
      const current = this.identity(s, token);
      requireThat(
        current.passwordHash === user.passwordHash,
        409,
        'ข้อมูลเปลี่ยนแปลง กรุณาเข้าสู่ระบบใหม่',
      );
      current.passwordHash = passwordHash;
      for (const [key, session] of Object.entries(s.sessions))
        if (session.userId === user.id) delete s.sessions[key];
      this.log(s, current, 'PASSWORD_CHANGED', user.id);
    });
  }
  async configure(token: string, role: Role, action: string, body: any) {
    await this.store.write((s) => {
      const admin = this.actor(s, token, role, ['ADMIN']);
      if (action === 'term') {
        requireThat(
          Number.isInteger(body.year) &&
            body.year >= 2500 &&
            body.year <= 2700 &&
            [1, 2].includes(body.semester),
          400,
          'ปีการศึกษาหรือภาคเรียนไม่ถูกต้อง',
        );
        requireThat(
          typeof body.deadline === 'string' && Number.isFinite(Date.parse(body.deadline)),
          400,
          'กรุณาระบุกำหนดส่ง',
        );
        requireThat(
          !s.terms.some((t) => t.year === body.year && t.semester === body.semester),
          409,
          'มีปี/ภาคเรียนนี้แล้ว',
        );
        s.terms.forEach((t) => {
          t.active = false;
        });
        const term = {
          id: id(),
          year: body.year,
          semester: body.semester,
          deadline: new Date(body.deadline).toISOString(),
          active: true,
        };
        s.terms.push(term);
        this.log(s, admin, 'TERM_CREATED', term.id);
      } else if (action === 'course') {
        const term = s.terms.find((t) => t.id === body.termId);
        requireThat(term, 400, 'ไม่พบภาคเรียน');
        const teacher = s.users.find(
          (u) => u.id === body.teacherId && u.active && u.roles.includes('TEACHER'),
        );
        const reviewer = s.users.find(
          (u) => u.id === body.reviewerId && u.active && u.roles.includes('REVIEWER'),
        );
        requireThat(
          teacher && reviewer && teacher.id !== reviewer.id,
          400,
          'เลือกครูและผู้ตรวจคนละคนตามสิทธิ์',
        );
        const code = text(body.code, 'รหัสวิชา', 50);
        const grade = text(body.grade, 'ชั้น/ห้อง', 50);
        requireThat(
          !s.courses.some((c) => c.termId === term.id && c.code === code && c.grade === grade),
          409,
          'มีรายวิชาและห้องนี้ในเทอมแล้ว',
        );
        const course = {
          id: id(),
          termId: term.id,
          code,
          grade,
          name: text(body.name, 'ชื่อวิชา'),
          teacherId: teacher.id,
          reviewerId: reviewer.id,
          open: true,
        };
        s.courses.push(course);
        this.log(s, admin, 'COURSE_CREATED', course.id);
      } else if (action === 'deadline') {
        const term = s.terms.find((t) => t.id === body.id);
        requireThat(term, 404, 'ไม่พบภาคเรียน');
        requireThat(Number.isFinite(Date.parse(body.deadline)), 400, 'กำหนดส่งไม่ถูกต้อง');
        term.deadline = new Date(body.deadline).toISOString();
        this.log(s, admin, 'DEADLINE_CHANGED', term.id, {
          reason: text(body.reason, 'เหตุผล'),
          deadline: term.deadline,
        });
      } else if (action === 'course-open') {
        const c = s.courses.find((c) => c.id === body.id);
        requireThat(c && typeof body.open === 'boolean', 400, 'ข้อมูลไม่ถูกต้อง');
        c.open = body.open;
        this.log(s, admin, 'COURSE_OPEN_CHANGED', c.id, { open: c.open });
      } else if (action === 'user-active') {
        const u = s.users.find((u) => u.id === body.id);
        requireThat(
          u && u.id !== admin.id && typeof body.active === 'boolean',
          400,
          'ไม่สามารถเปลี่ยนสถานะบัญชีนี้',
        );
        u.active = body.active;
        for (const [key, session] of Object.entries(s.sessions))
          if (session.userId === u.id) delete s.sessions[key];
        this.log(s, admin, 'USER_ACTIVE_CHANGED', u.id, { active: u.active });
      } else requireThat(false, 404, 'ไม่พบคำสั่ง');
    });
  }
  submissionCourse(s: State, user: Person, courseId: string) {
    const c = s.courses.find((c) => c.id === courseId);
    requireThat(c && c.teacherId === user.id, 403, 'ส่งได้เฉพาะรายวิชาของคุณ');
    const term = s.terms.find((t) => t.id === c.termId);
    requireThat(
      term?.active && c.open && Date.parse(term.deadline) >= Date.now(),
      409,
      'รายวิชาหรือรอบส่งปิดแล้ว กรุณาติดต่อผู้ดูแล',
    );
    const previous = s.submissions.find((sub) => sub.courseId === c.id);
    requireThat(
      !previous || previous.status === 'REJECTED_REVISION',
      409,
      'รายการนี้ส่งแล้วหรือถูกล็อก ไม่สามารถส่งซ้ำ',
    );
    return { course: c, previous };
  }
  async reserve(token: string, role: Role, body: any) {
    return this.store.write((s) => {
      const user = this.actor(s, token, role, ['TEACHER']);
      this.submissionCourse(s, user, body.courseId);
      requireThat(body.kind === 'pdf' || body.kind === 'excel', 400, 'ประเภทไฟล์ไม่ถูกต้อง');
      const name = text(body.name, 'ชื่อไฟล์', 180).replace(/[\\/\u0000-\u001f]/g, '_');
      const extension = name.toLowerCase().split('.').pop();
      requireThat(
        body.kind === 'pdf' ? extension === 'pdf' : extension === 'xlsx',
        400,
        'รองรับเฉพาะ .xlsx และ .pdf',
      );
      requireThat(
        Number.isInteger(body.size) && body.size > 0 && body.size <= MAX_FILE,
        400,
        'ไฟล์ต้องมีขนาดไม่เกิน 25 MB',
      );
      const pending = Object.values(s.files).filter(
        (f) => f.ownerId === user.id && !f.used && f.expiresAt > Date.now(),
      );
      requireThat(pending.length < 20, 429, 'มีไฟล์รอส่งหลายรายการ กรุณารอสักครู่');
      const file: StoredFile = {
        id: id(),
        ownerId: user.id,
        courseId: body.courseId,
        name,
        kind: body.kind,
        size: body.size,
        sha256: '',
        pathname: '',
        ready: false,
        used: false,
        expiresAt: Date.now() + 30 * 60_000,
      };
      file.pathname = `pp5/${user.id}/${file.id}.${extension}`;
      s.files[file.id] = file;
      return file;
    });
  }
  async pendingFile(token: string, fileId: string) {
    const s = await this.store.read();
    const user = this.identity(s, token);
    const f = s.files[fileId];
    requireThat(
      user.roles.includes('TEACHER') &&
        f &&
        f.ownerId === user.id &&
        !f.used &&
        f.expiresAt > Date.now(),
      403,
      'ไม่พบไฟล์ที่คุณมีสิทธิ์อัปโหลด',
    );
    return f;
  }
  async readyFile(token: string, fileId: string, bytes: Uint8Array) {
    const f = await this.pendingFile(token, fileId);
    verifyFileBytes(f, bytes);
    const sha256 = digest(bytes);
    await this.store.write((s) => {
      const u = this.identity(s, token);
      const file = s.files[fileId];
      requireThat(
        file?.ownerId === u.id && !file.used && file.expiresAt > Date.now(),
        409,
        'ไฟล์หมดอายุหรือใช้งานแล้ว',
      );
      file.sha256 = sha256;
      file.ready = true;
    });
    return { id: f.id, name: f.name, kind: f.kind, size: f.size, sha256 };
  }
  async submit(token: string, role: Role, body: any) {
    await this.store.write((s) => {
      const user = this.actor(s, token, role, ['TEACHER']);
      const { course, previous } = this.submissionCourse(s, user, body.courseId);
      requireThat(body.confirmed === true, 400, 'กรุณายืนยันตรวจสอบเอกสารก่อนส่ง');
      const excel = s.files[body.excelId],
        pdf = s.files[body.pdfId];
      for (const [file, kind] of [
        [excel, 'excel'],
        [pdf, 'pdf'],
      ] as const)
        requireThat(
          file &&
            file.ownerId === user.id &&
            file.courseId === course.id &&
            file.kind === kind &&
            file.ready &&
            !file.used &&
            file.expiresAt > Date.now(),
          400,
          'กรุณาอัปโหลดไฟล์ Excel และ PDF ให้ครบ',
        );
      const sub: Submission = previous || {
        id: id(),
        courseId: course.id,
        status: 'PENDING_REVIEW',
        revision: 0,
        versions: [],
      };
      requireThat(
        (body.expectedRevision ?? 0) === sub.revision,
        409,
        'รายการเปลี่ยนแปลงแล้ว กรุณารีเฟรช',
      );
      const safe = (f: StoredFile) => ({
        id: f.id,
        name: f.name,
        kind: f.kind,
        size: f.size,
        sha256: f.sha256,
      });
      const version: Version = {
        number: sub.versions.length + 1,
        excel: safe(excel),
        pdf: safe(pdf),
        submittedBy: user.id,
        submittedAt: now(),
        notes: typeof body.notes === 'string' ? body.notes.slice(0, 4000) : '',
      };
      excel.used = true;
      pdf.used = true;
      sub.versions.push(version);
      sub.status = 'PENDING_REVIEW';
      sub.revision++;
      delete sub.approval;
      if (!previous) s.submissions.push(sub);
      this.log(s, user, previous ? 'REVISION_SUBMITTED' : 'SUBMISSION_CREATED', sub.id, {
        version: version.number,
        excelHash: excel.sha256,
        pdfHash: pdf.sha256,
      });
    });
  }
  async review(token: string, role: Role, body: any) {
    await this.store.write((s) => {
      const user = this.actor(s, token, role, ['REVIEWER']);
      const sub = s.submissions.find((sub) => sub.id === body.id);
      const c = s.courses.find((c) => c.id === sub?.courseId);
      requireThat(
        sub && c && c.reviewerId === user.id && c.teacherId !== user.id,
        403,
        'คุณไม่ได้รับมอบหมายหรือเป็นผู้สอนวิชานี้',
      );
      requireThat(
        sub.status === 'PENDING_REVIEW' && sub.revision === body.expectedRevision,
        409,
        'สถานะเปลี่ยนแล้ว กรุณารีเฟรช',
      );
      requireThat(
        typeof body.pass === 'boolean' &&
          Array.isArray(body.checks) &&
          body.checks.length === 4 &&
          body.checks.every((c: unknown) => typeof c === 'boolean'),
        400,
        'กรุณาประเมินทั้ง 4 ด้าน',
      );
      requireThat(!body.pass || body.checks.every(Boolean), 400, 'รับรองได้เมื่อผ่านทั้ง 4 ด้าน');
      const notes = text(body.notes, 'ผลตรวจหรือเหตุผล', 4000);
      sub.versions.at(-1)!.review = {
        by: user.id,
        at: now(),
        pass: body.pass,
        notes,
        checks: body.checks,
      };
      sub.status = body.pass ? 'PENDING_DIRECTOR' : 'REJECTED_REVISION';
      sub.revision++;
      this.log(s, user, body.pass ? 'REVIEW_PASSED' : 'REVIEW_REJECTED', sub.id, {
        notes,
        checks: body.checks,
      });
    });
  }
  async approve(token: string, role: Role, body: any) {
    await this.store.write((s) => {
      const user = this.actor(s, token, role, ['EXECUTIVE']);
      const sub = s.submissions.find((sub) => sub.id === body.id);
      const c = s.courses.find((c) => c.id === sub?.courseId);
      requireThat(
        sub && c && c.teacherId !== user.id && c.reviewerId !== user.id,
        403,
        'ผู้อนุมัติต้องเป็นคนละคนกับผู้สอนและผู้ตรวจ',
      );
      requireThat(
        sub.status === 'PENDING_DIRECTOR' && sub.revision === body.expectedRevision,
        409,
        'รายการไม่อยู่ในสถานะรออนุมัติหรือเปลี่ยนแปลงแล้ว',
      );
      requireThat(body.confirmed === true, 400, 'กรุณายืนยันการอนุมัติเอกสาร');
      requireThat(
        typeof body.signature === 'string' &&
          /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(body.signature) &&
          body.signature.length >= 100 &&
          body.signature.length <= 200_000,
        400,
        'กรุณาลงลายมือชื่อ',
      );
      const version = sub.versions.at(-1)!;
      requireThat(version.review?.pass, 409, 'เอกสารยังไม่ผ่านการตรวจ');
      const at = now();
      const manifest = JSON.stringify({
        submissionId: sub.id,
        version: version.number,
        excel: version.excel.sha256,
        pdf: version.pdf.sha256,
        by: user.id,
        at,
        signature: digest(body.signature),
      });
      sub.approval = {
        by: user.id,
        at,
        signature: body.signature,
        manifest,
        manifestHash: digest(manifest),
        pdfHash: version.pdf.sha256,
        excelHash: version.excel.sha256,
      };
      sub.status = 'FINAL_LOCKED';
      sub.revision++;
      this.log(s, user, 'DIRECTOR_APPROVED_LOCKED', sub.id, {
        manifestHash: sub.approval.manifestHash,
        version: version.number,
      });
    });
  }
  async accessibleFile(token: string, role: Role, fileId: string) {
    const s = await this.store.read();
    const user = this.actor(s, token, role);
    const sub = s.submissions.find((sub) =>
      sub.versions.some((v) => v.excel.id === fileId || v.pdf.id === fileId),
    );
    requireThat(
      sub && this.visible(s, user, role, sub.courseId),
      404,
      'ไม่พบไฟล์หรือคุณไม่มีสิทธิ์',
    );
    const file = s.files[fileId];
    requireThat(file?.ready && file.used, 404, 'ไม่พบไฟล์');
    return file;
  }
}
