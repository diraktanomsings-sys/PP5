import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { PDFDocument } from 'pdf-lib';
import { DOMParser } from '@xmldom/xmldom';
import { zipSync } from 'fflate';
import { localDatabase, localStorage } from '../server/local.js';
import { createStore } from '../server/store.js';
import { Service } from '../server/service.js';
import { createHttp } from '../server/http.js';
import { digest, ApiError } from '../server/security.js';
import { readWorkbook, workbookMetrics } from '../src/lib/workbook.js';
import { parseCsv, parseCourseCsv } from '../src/lib/csv.js';
const password = 'Test-only-Password-2026!';
const signature =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhZkAAAAASUVORK5CYII=';
const workbook = () =>
  zipSync(
    Object.fromEntries(
      Object.entries({
        '[Content_Types].xml':
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
        'xl/workbook.xml':
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="คะแนนจริง" r:id="r1"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels':
          '<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/></Relationships>',
        'xl/sharedStrings.xml':
          '<sst><si><t>เลขที่</t></si><si><t>ผลการเรียน</t></si><si><t>ร้อยละเวลาเรียน</t></si></sst>',
        'xl/worksheets/sheet1.xml':
          '<worksheet><sheetData><row><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row><row><c r="A2"><v>1</v></c><c r="B2"><v>4</v></c><c r="C2"><v>100</v></c></row><row><c r="A3"><v>2</v></c><c r="B3"><v>0</v></c><c r="C3"><v>80</v></c></row></sheetData></worksheet>',
      }).map(([k, v]) => [k, Buffer.from(v)]),
    ),
  );
const rejects = (work: () => Promise<unknown>, status: number) =>
  assert.rejects(work, (e: unknown) => e instanceof ApiError && e.status === status);

test('real spreadsheet parsing, metrics and CSV validation', () => {
  const sheets = readWorkbook(workbook(), new DOMParser());
  assert.equal(sheets[0].name, 'คะแนนจริง');
  assert.equal(sheets[0].rows[1][1], '4');
  assert.deepEqual(workbookMetrics(sheets), {
    averageGpa: 2,
    passPercentage: 50,
    averageAttendance: 90,
    studentCount: 2,
  });
  assert.equal(workbookMetrics([{ name: 'unknown', rows: [['ข้อมูล'], ['1', '4']] }]), undefined);
  assert.equal(
    workbookMetrics([
      {
        name: 'incomplete',
        rows: [
          ['เลขที่', 'ผลการเรียน'],
          ['1', '4'],
          ['2', 'ร'],
        ],
      },
    ]),
    undefined,
  );
  const hostile = zipSync({
    'xl/workbook.xml': Buffer.from('<!DOCTYPE a [<!ENTITY x SYSTEM "file:///private">]><a>&x;</a>'),
  });
  assert.throws(() => readWorkbook(hostile, new DOMParser()), /DTD/);
  assert.deepEqual(parseCsv('\uFEFFcode,name\r\nX,"A, B"\r\nY,"line\n2"'), [
    ['code', 'name'],
    ['X', 'A, B'],
    ['Y', 'line\n2'],
  ]);
  assert.throws(() => parseCsv('a,"unfinished'), /CSV/);
  assert.throws(
    () =>
      parseCourseCsv('course_code,course_name,grade_level,teacher_id\nA,Test,ป.1,unknown', 't', []),
    /แถว/,
  );
});

test(
  'restored administration, findings, batch signing and preserved approval history',
  { timeout: 120_000 },
  async (t) => {
    const dir = await mkdtemp(path.join(tmpdir(), 'pp5-restored-'));
    const db = await localDatabase(path.join(dir, 'db'));
    const store = await createStore(db);
    const storage = await localStorage(path.join(dir, 'files'));
    const service = new Service(store, 'local', 'test-only-setup-token-'.repeat(3));
    const admin = await service.setup({
      token: 'test-only-setup-token-'.repeat(3),
      email: 'admin@example.test',
      name: 'ผู้ดูแลทดสอบ',
      password,
    });
    const sessions: Record<string, string> = { admin };
    for (const [key, roles] of [
      ['teacher', ['TEACHER', 'REVIEWER', 'EXECUTIVE']],
      ['reviewer', ['REVIEWER', 'EXECUTIVE']],
      ['executive', ['EXECUTIVE']],
      ['other', ['TEACHER']],
    ] as const) {
      await service.createUser(admin, 'ADMIN', {
        name: key,
        email: key + '@example.test',
        teacherId: key,
        roles,
        password,
      });
      sessions[key] = await service.login({ identifier: key, password }, key);
    }
    const people = (await store.read()).users;
    const teacher = people.find((p) => p.teacherId === 'teacher')!,
      reviewer = people.find((p) => p.teacherId === 'reviewer')!;
    const adminId = people[0].id;
    const server = createHttp(service, storage, 'http://localhost:3000').listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${(server.address() as any).port}/api/pp5`;
    t.after(async () => {
      await new Promise<void>((r) => server.close(() => r()));
      await db.close();
    });
    let termId = '',
      courseId = '',
      subId = '';
    const state = () => service.snapshot(admin, 'ADMIN');
    await t.test('administrative edits persist and protected fields are enforced', async () => {
      await rejects(
        () =>
          service.configure(sessions.teacher, 'TEACHER', 'school-settings', {
            organizationDriveUrl: 'https://drive.google.com/drive/folders/test',
          }),
        403,
      );
      await rejects(
        () =>
          service.configure(admin, 'ADMIN', 'school-settings', {
            organizationDriveUrl: 'https://evil.example',
          }),
        400,
      );
      await service.configure(admin, 'ADMIN', 'school-settings', {
        organizationDriveUrl: 'https://drive.google.com/drive/folders/test',
        schoolLogo: signature,
      });
      assert.equal((await state()).settings?.schoolLogo, signature);
      await rejects(
        () => service.configure(admin, 'ADMIN', 'user-edit', { id: adminId, roles: ['TEACHER'] }),
        400,
      );
      await rejects(
        () =>
          service.configure(admin, 'ADMIN', 'user-edit', {
            id: teacher.id,
            citizenId: '12345678901234',
          }),
        400,
      );
      await service.configure(admin, 'ADMIN', 'user-edit', {
        id: teacher.id,
        department: 'ภาษาไทย',
        citizenId: '1234567890123',
      });
      assert.equal((await state()).people.find((p) => p.id === teacher.id)?.department, 'ภาษาไทย');
      assert.ok(await service.login({ identifier: '1234567890123', password }, 'citizen-test'));
      await service.configure(admin, 'ADMIN', 'term', {
        year: 2569,
        semester: 1,
        deadline: new Date(Date.now() + 86400_000).toISOString(),
        reviewDeadline: new Date(Date.now() + 172800_000).toISOString(),
      });
      termId = (await state()).terms[0].id;
      await rejects(
        () => service.configure(admin, 'ADMIN', 'term-edit', { id: termId, archived: true }),
        400,
      );
    });
    await t.test('CSV import is atomic and cloning does not overwrite courses', async () => {
      const row = {
        termId,
        code: 'T101',
        name: 'ภาษาไทย',
        grade: 'ป.1/1',
        teacherId: teacher.id,
        reviewerId: reviewer.id,
        department: 'ภาษาไทย',
        creditHours: 1,
        scoreRatio: '70:30',
      };
      await rejects(
        () => service.configure(admin, 'ADMIN', 'courses-import', { courses: [row, row] }),
        409,
      );
      assert.equal((await state()).courses.length, 0);
      await service.configure(admin, 'ADMIN', 'courses-import', { courses: [row] });
      courseId = (await state()).courses[0].id;
      await service.configure(admin, 'ADMIN', 'term', {
        year: 2569,
        semester: 2,
        deadline: new Date(Date.now() + 86400_000).toISOString(),
      });
      const target = (await state()).terms.find((t) => t.semester === 2)!.id;
      await service.configure(admin, 'ADMIN', 'courses-clone', {
        fromTermId: termId,
        termId: target,
      });
      await service.configure(admin, 'ADMIN', 'courses-clone', {
        fromTermId: termId,
        termId: target,
      });
      assert.equal((await state()).courses.length, 2);
      await rejects(
        () =>
          service.configure(admin, 'ADMIN', 'reviewers', {
            assignments: [{ courseId, reviewerId: teacher.id }],
          }),
        400,
      );
      await service.configure(admin, 'ADMIN', 'term-active', { id: termId });
      await service.configure(admin, 'ADMIN', 'term-edit', { id: target, archived: true });
    });
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    const pdf = await doc.save();
    const excel = workbook();
    async function upload(
      account: string,
      kind: 'pdf' | 'excel',
      bytes: Uint8Array,
      purpose?: 'annotation',
    ) {
      const f = await service.reserve(sessions[account], purpose ? 'REVIEWER' : 'TEACHER', {
        courseId,
        kind,
        size: bytes.length,
        name: `test.${kind === 'excel' ? 'xlsx' : 'pdf'}`,
        purpose,
      });
      await storage.write!(f, bytes);
      await service.readyFile(sessions[account], f.id, bytes);
      return f.id;
    }
    async function submit() {
      const old = (await state()).submissions.find((s) => s.courseId === courseId);
      await service.submit(sessions.teacher, 'TEACHER', {
        courseId,
        excelId: await upload('teacher', 'excel', excel),
        pdfId: await upload('teacher', 'pdf', pdf),
        expectedRevision: old?.revision || 0,
        confirmed: true,
        driveUrl: 'https://drive.google.com/file/d/test/view',
      });
      subId = (await state()).submissions.find((s) => s.courseId === courseId)!.id;
    }
    const sub = async () => (await state()).submissions.find((s) => s.id === subId)!;
    await t.test(
      'findings and annotated PDF belong to the assigned review and survive refresh',
      async () => {
        await submit();
        assert.equal((await sub()).versions[0].metrics?.averageGpa, 2);
        await rejects(
          () =>
            service.finding(sessions.teacher, 'REVIEWER', {
              id: subId,
              expectedRevision: 1,
              location: 'B2',
              comment: 'test',
              issueType: 'FORMULA',
            }),
          403,
        );
        await service.finding(sessions.reviewer, 'REVIEWER', {
          id: subId,
          expectedRevision: 1,
          location: 'B2',
          comment: 'ตรวจสูตรแล้ว',
          issueType: 'FORMULA',
        });
        assert.equal((await sub()).versions[0].findings?.[0].comment, 'ตรวจสูตรแล้ว');
        await rejects(
          () =>
            service.review(sessions.reviewer, 'REVIEWER', {
              id: subId,
              expectedRevision: 1,
              pass: true,
              checks: [true, true, true, true],
              notes: 'checked',
            }),
          409,
        );
        const annotatedId = await upload('reviewer', 'pdf', pdf, 'annotation');
        await service.review(sessions.reviewer, 'REVIEWER', {
          id: subId,
          expectedRevision: 2,
          pass: true,
          checks: [true, true, true, true],
          notes: 'checked',
          annotatedId,
        });
        assert.equal(
          (await service.accessibleFile(sessions.teacher, 'TEACHER', annotatedId)).sha256,
          digest(pdf),
        );
        await rejects(() => service.accessibleFile(sessions.other, 'TEACHER', annotatedId), 404);
        await rejects(
          () =>
            service.configure(admin, 'ADMIN', 'course-edit', {
              id: courseId,
              teacherId: people.find((p) => p.teacherId === 'other')!.id,
            }),
          409,
        );
      },
    );
    await t.test(
      'batch approval rolls back fully, checks actual reviewer, and generates a readable Thai PDF copy',
      async () => {
        const revision = (await sub()).revision;
        await rejects(
          () =>
            service.approveBatch(sessions.executive, 'EXECUTIVE', {
              items: [
                { id: subId, expectedRevision: revision },
                { id: 'missing', expectedRevision: 0 },
              ],
              signature,
              confirmed: true,
            }),
          403,
        );
        assert.equal((await sub()).status, 'PENDING_DIRECTOR');
        await service
          .configure(admin, 'ADMIN', 'reviewers', {
            assignments: [
              { courseId, reviewerId: people.find((p) => p.teacherId === 'other')!.id },
            ],
          })
          .then(
            () => assert.fail('invalid role'),
            () => {},
          );
        await rejects(
          () =>
            service.approve(sessions.reviewer, 'EXECUTIVE', {
              id: subId,
              expectedRevision: revision,
              signature,
              confirmed: true,
            }),
          403,
        );
        await service.approveBatch(sessions.executive, 'EXECUTIVE', {
          items: [{ id: subId, expectedRevision: revision }],
          signature,
          confirmed: true,
        });
        const response = await fetch(`${base}?action=signed&role=EXECUTIVE&id=${subId}`, {
          headers: { Cookie: `pp5_session=${sessions.executive}` },
        });
        assert.equal(
          response.status,
          200,
          await (response.status === 200 ? Promise.resolve('') : response.text()),
        );
        const signed = await PDFDocument.load(await response.arrayBuffer());
        assert.equal(signed.getPageCount(), 2);
        assert.equal(
          digest(
            await storage.bytes(
              await service.accessibleFile(admin, 'ADMIN', (await sub()).versions[0].pdf.id),
            ),
          ),
          digest(pdf),
        );
        assert.equal(
          (
            await fetch(`${base}?action=signed&role=TEACHER&id=${subId}`, {
              headers: { Cookie: `pp5_session=${sessions.other}` },
            })
          ).status,
          404,
        );
      },
    );
    await t.test(
      'password-confirmed unlock retains prior approval, hashes and complete version history',
      async () => {
        const before = await sub(),
          approval = structuredClone(before.approval);
        await rejects(
          () =>
            service.configure(admin, 'ADMIN', 'unlock', {
              id: subId,
              expectedRevision: before.revision,
              reason: 'test correction',
              password: 'wrong',
            }),
          403,
        );
        await service.configure(admin, 'ADMIN', 'unlock', {
          id: subId,
          expectedRevision: before.revision,
          reason: 'test correction',
          password,
        });
        assert.deepEqual((await sub()).approvalHistory?.[0].approval, approval);
        await submit();
        assert.equal((await sub()).versions.length, 2);
        assert.equal((await sub()).approvalHistory?.length, 1);
        assert.equal((await sub()).versions[0].pdf.sha256, approval!.pdfHash);
        const audits = (await state()).audit;
        assert.equal(audits.find((a) => a.action === 'FINDING_ADDED')?.details.role, 'REVIEWER');
        assert.ok(
          !JSON.stringify((await service.snapshot(sessions.reviewer, 'REVIEWER')).people).includes(
            '1234567890123',
          ),
        );
      },
    );
    await t.test(
      'admin role changes revoke sessions and reset passwords require fresh login',
      async () => {
        const other = people.find((p) => p.teacherId === 'other')!;
        await service.configure(admin, 'ADMIN', 'user-edit', {
          id: other.id,
          roles: ['TEACHER', 'REVIEWER'],
        });
        await rejects(() => service.snapshot(sessions.other, 'TEACHER'), 401);
        sessions.other = await service.login({ identifier: 'other', password }, 'other');
        await service.configure(admin, 'ADMIN', 'user-password', {
          id: other.id,
          password: 'Another-test-password-2026!',
        });
        await rejects(() => service.snapshot(sessions.other, 'TEACHER'), 401);
        assert.ok(
          await service.login(
            { identifier: 'other', password: 'Another-test-password-2026!' },
            'other',
          ),
        );
      },
    );
  },
);
