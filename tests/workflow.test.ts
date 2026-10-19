import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { zipSync, unzipSync } from 'fflate';
import { localDatabase, localStorage } from '../server/local.js';
import { createStore } from '../server/store.js';
import { Service } from '../server/service.js';
import { createHttp } from '../server/http.js';
import { digest } from '../server/security.js';
import type { Role, Snapshot } from '../src/production/types.js';

const password = 'Test-only-Password-2026!';
const setup = 'test-only-setup-token-'.repeat(3);
const origin = 'http://localhost:3000';
const excel = zipSync({
  '[Content_Types].xml': Buffer.from(
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
  ),
  'xl/workbook.xml': Buffer.from(
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets/></workbook>',
  ),
});
const pdf = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
);
const signature =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhZkAAAAASUVORK5CYII=';

test('PP5 durable multi-account workflow and authorization', { timeout: 120_000 }, async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'pp5-workflow-'));
  let db = await localDatabase(path.join(directory, 'db'));
  let store = await createStore(db);
  const storage = await localStorage(path.join(directory, 'files'));
  let service = new Service(store, 'local', setup);
  let server = createHttp(service, storage, origin).listen(0, '127.0.0.1');
  await once(server, 'listening');
  let base = `http://127.0.0.1:${(server.address() as any).port}/api/pp5`;
  const closeServer = () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  t.after(async () => {
    await closeServer();
    await db.close();
  });
  const cookies: Record<string, string> = {};
  async function request(
    account: string,
    role: Role | undefined,
    action: string,
    body?: any,
    expected = 200,
  ) {
    const response = await fetch(`${base}?action=${action}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Origin: origin,
        Cookie: cookies[account] || '',
        ...(role ? { 'X-PP5-Role': role } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    assert.equal(response.status, expected, `${action}: ${JSON.stringify(result)}`);
    const cookie = response.headers.get('set-cookie');
    if (cookie) cookies[account] = cookie.split(';')[0];
    return result;
  }
  let people: Snapshot['people'];
  let courseId: string;
  let adminId: string;
  let excelId: string;
  let pdfId: string;
  let submissionId: string;
  await t.test('anonymous access denied and bootstrap happens only once', async () => {
    assert.equal((await request('', undefined, 'health')).initialized, false);
    await request('', undefined, 'state', undefined, 401);
    await request(
      'admin',
      undefined,
      'setup',
      { token: 'wrong', email: 'admin@example.test', name: 'Test Admin', password },
      403,
    );
    await request('admin', undefined, 'setup', {
      token: setup,
      email: 'admin@example.test',
      name: 'Test Admin',
      password,
    });
    await request(
      '',
      undefined,
      'setup',
      { token: setup, email: 'admin2@example.test', name: 'Other', password },
      409,
    );
    const state = await request('admin', 'ADMIN', 'state');
    adminId = state.user.id;
    assert.ok(!JSON.stringify(state).includes('passwordHash'));
    assert.ok(!JSON.stringify(state).includes(password));
  });
  await t.test('create independent accounts, term and course', async () => {
    for (const [key, roles] of [
      ['teacher', ['TEACHER', 'REVIEWER', 'EXECUTIVE']],
      ['reviewer', ['REVIEWER']],
      ['executive', ['EXECUTIVE']],
      ['outsider', ['TEACHER']],
    ] as const) {
      await request('admin', 'ADMIN', 'user', {
        name: `Test ${key}`,
        email: `${key}@example.test`,
        teacherId: key,
        roles,
        password,
      });
      await request(key, undefined, 'login', { identifier: `${key}@example.test`, password });
    }
    await request('admin', 'ADMIN', 'term', {
      year: 2569,
      semester: 1,
      deadline: new Date(Date.now() + 86400_000).toISOString(),
    });
    let state = await request('admin', 'ADMIN', 'state');
    people = state.people;
    const body = {
      termId: state.terms[0].id,
      code: 'TEST101',
      name: 'Test Course',
      grade: 'Test/1',
      teacherId: people.find((p) => p.teacherId === 'teacher')!.id,
      reviewerId: people.find((p) => p.teacherId === 'reviewer')!.id,
    };
    await request('admin', 'ADMIN', 'course', { ...body, reviewerId: body.teacherId }, 400);
    await request('admin', 'ADMIN', 'course', body);
    state = await request('teacher', 'TEACHER', 'state');
    courseId = state.courses[0].id;
    assert.equal((await request('outsider', 'TEACHER', 'state')).courses.length, 1);
    await request('teacher', 'ADMIN', 'state', undefined, 403);
    const response = await fetch(`${base}?action=user`, {
      method: 'POST',
      headers: {
        Origin: 'https://evil.example',
        Cookie: cookies.admin,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    assert.equal(response.status, 403);
  });
  async function upload(kind: 'excel' | 'pdf', bytes: Uint8Array) {
    const file = await request('teacher', 'TEACHER', 'reserve', {
      courseId,
      name: `test.${kind === 'excel' ? 'xlsx' : 'pdf'}`,
      size: bytes.length,
      kind,
    });
    const response = await fetch(`${base}?action=upload&id=${file.id}`, {
      method: 'POST',
      headers: {
        Origin: origin,
        Cookie: cookies.teacher,
        'Content-Type': 'application/octet-stream',
      },
      body: Buffer.from(bytes),
    });
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.equal(result.sha256, digest(bytes));
    return result.id as string;
  }
  await t.test(
    'requires two real files, allows selecting unsubmitted subjects and rejects wrong/oversized types',
    async () => {
      await request('teacher', 'TEACHER', 'submit', { courseId, confirmed: true }, 400);
      await request(
        'outsider',
        'TEACHER',
        'reserve',
        { courseId, kind: 'pdf', name: 'file.pdf', size: 20 },
        200,
      );
      await request(
        'teacher',
        'TEACHER',
        'reserve',
        { courseId, kind: 'pdf', name: 'file.exe', size: 20 },
        400,
      );
      await request(
        'teacher',
        'TEACHER',
        'reserve',
        { courseId, kind: 'pdf', name: 'file.pdf', size: 26 * 1024 * 1024 },
        400,
      );
      const bad = await request('teacher', 'TEACHER', 'reserve', {
        courseId,
        kind: 'pdf',
        name: 'bad.pdf',
        size: 5,
      });
      const result = await fetch(`${base}?action=upload&id=${bad.id}`, {
        method: 'POST',
        headers: {
          Origin: origin,
          Cookie: cookies.teacher,
          'Content-Type': 'application/octet-stream',
        },
        body: 'hello',
      });
      assert.equal(result.status, 400);
      excelId = await upload('excel', excel);
      pdfId = await upload('pdf', pdf);
      await request('teacher', 'TEACHER', 'submit', {
        courseId,
        excelId,
        pdfId,
        expectedRevision: 0,
        confirmed: true,
        notes: 'test submission',
      });
      const state = await request('teacher', 'TEACHER', 'state');
      submissionId = state.submissions[0].id;
      assert.equal(state.submissions[0].status, 'PENDING_REVIEW');
    },
  );
  await t.test('survives server and database restart', async () => {
    await closeServer();
    await db.close();
    db = await localDatabase(path.join(directory, 'db'));
    store = await createStore(db);
    service = new Service(store, 'local', setup);
    server = createHttp(service, storage, origin).listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${(server.address() as any).port}/api/pp5`;
    assert.equal((await request('reviewer', 'REVIEWER', 'state')).submissions[0].id, submissionId);
    const response = await fetch(`${base}?action=file&id=${pdfId}&role=REVIEWER`, {
      headers: { Cookie: cookies.reviewer },
    });
    assert.equal(response.status, 200);
    assert.equal(digest(new Uint8Array(await response.arrayBuffer())), digest(pdf));
    assert.equal(
      (
        await fetch(`${base}?action=file&id=${pdfId}&role=TEACHER`, {
          headers: { Cookie: cookies.outsider },
        })
      ).status,
      404,
    );
    assert.equal((await fetch(`${base}?action=file&id=${pdfId}&role=TEACHER`)).status, 401);
  });
  await t.test('Four-Eyes, stale writes and revision history are enforced on server', async () => {
    const body = {
      id: submissionId,
      expectedRevision: 1,
      pass: true,
      checks: [true, true, true, true],
      notes: 'checked',
    };
    await request('teacher', 'REVIEWER', 'review', body, 403);
    await request(
      'reviewer',
      'REVIEWER',
      'review',
      { ...body, checks: [true, false, true, true] },
      400,
    );
    await request('reviewer', 'REVIEWER', 'review', { ...body, expectedRevision: 0 }, 409);
    await request('reviewer', 'REVIEWER', 'review', {
      ...body,
      pass: false,
      notes: 'Please correct test',
    });
    excelId = await upload('excel', excel);
    pdfId = await upload('pdf', pdf);
    await request('teacher', 'TEACHER', 'submit', {
      courseId,
      excelId,
      pdfId,
      expectedRevision: 2,
      confirmed: true,
    });
    const state = await request('reviewer', 'REVIEWER', 'state');
    assert.equal(state.submissions[0].versions.length, 2);
    assert.equal(state.submissions[0].versions[0].review.pass, false);
    const results = await Promise.all(
      [0, 1].map(async () => {
        const response = await fetch(`${base}?action=review`, {
          method: 'POST',
          headers: {
            Origin: origin,
            Cookie: cookies.reviewer,
            'X-PP5-Role': 'REVIEWER',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...body, expectedRevision: 3 }),
        });
        await response.json();
        return response.status;
      }),
    );
    assert.deepEqual(results.sort(), [200, 409]);
  });
  await t.test(
    'approval locks current version; archive contains actual original bytes',
    async () => {
      await request(
        'teacher',
        'EXECUTIVE',
        'approve',
        { id: submissionId, expectedRevision: 4, signature, confirmed: true },
        403,
      );
      await request(
        'executive',
        'EXECUTIVE',
        'approve',
        { id: submissionId, expectedRevision: 4, signature },
        400,
      );
      await request('executive', 'EXECUTIVE', 'approve', {
        id: submissionId,
        expectedRevision: 4,
        signature,
        confirmed: true,
      });
      const state = await request('executive', 'EXECUTIVE', 'state');
      const sub = state.submissions[0];
      assert.equal(sub.status, 'FINAL_LOCKED');
      assert.equal(sub.approval.pdfHash, digest(pdf));
      assert.equal(sub.approval.manifestHash, digest(sub.approval.manifest));
      const teacher = await request('teacher', 'TEACHER', 'state');
      assert.ok(teacher.people.find((p: any) => p.id === sub.approval.by));
      await request(
        'teacher',
        'TEACHER',
        'reserve',
        { courseId, kind: 'pdf', name: 'new.pdf', size: 20 },
        409,
      );
      const response = await fetch(`${base}?action=archive&role=EXECUTIVE`, {
        headers: { Cookie: cookies.executive },
      });
      assert.equal(response.status, 200);
      const zip = unzipSync(new Uint8Array(await response.arrayBuffer()));
      const name = Object.keys(zip).find((name) => name.endsWith('.pdf'))!;
      assert.equal(digest(zip[name]), digest(pdf));
      const admin = await request('admin', 'ADMIN', 'state');
      assert.ok(admin.audit.some((a: any) => a.action === 'DIRECTOR_APPROVED_LOCKED'));
      assert.equal(admin.user.id, adminId);
    },
  );
  await t.test('logout revokes session and default passwords never work', async () => {
    const previousCookie = cookies.teacher;
    await request('teacher', 'TEACHER', 'logout', {});
    cookies.teacher = previousCookie;
    await request('teacher', 'TEACHER', 'state', undefined, 401);
    await request(
      'teacher',
      undefined,
      'login',
      { identifier: 'teacher', password: '12345678' },
      401,
    );
    for (let i = 0; i < 8; i++)
      await request(
        'invalid',
        undefined,
        'login',
        { identifier: 'invalid', password: 'wrong' },
        401,
      );
    await request('invalid', undefined, 'login', { identifier: 'invalid', password: 'wrong' }, 429);
  });
  await t.test(
    'password changes and disabled accounts revoke sessions; deadline enforced',
    async () => {
      await request('outsider', undefined, 'login', { identifier: 'outsider', password });
      await request('outsider', 'TEACHER', 'password', {
        current: password,
        password: 'New-test-only-password-2026!',
      });
      await request('outsider', 'TEACHER', 'state', undefined, 401);
      await request('outsider', undefined, 'login', { identifier: 'outsider', password }, 401);
      await request('outsider', undefined, 'login', {
        identifier: 'outsider',
        password: 'New-test-only-password-2026!',
      });
      const outsider = people.find((p) => p.teacherId === 'outsider')!;
      await request('admin', 'ADMIN', 'user-active', { id: outsider.id, active: false });
      await request('outsider', 'TEACHER', 'state', undefined, 401);
      await request(
        'outsider',
        undefined,
        'login',
        { identifier: 'outsider', password: 'New-test-only-password-2026!' },
        401,
      );
      const state = await request('admin', 'ADMIN', 'state');
      await request('admin', 'ADMIN', 'course', {
        termId: state.terms[0].id,
        code: 'CLOSED101',
        name: 'Closed course',
        grade: 'Test/2',
        teacherId: people.find((p) => p.teacherId === 'teacher')!.id,
        reviewerId: people.find((p) => p.teacherId === 'reviewer')!.id,
      });
      await request('admin', 'ADMIN', 'deadline', {
        id: state.terms[0].id,
        deadline: new Date(Date.now() - 86400_000).toISOString(),
        reason: 'test expired deadline',
      });
      await request('teacher', undefined, 'login', { identifier: 'teacher', password });
      const courses = (await request('teacher', 'TEACHER', 'state')).courses;
      await request(
        'teacher',
        'TEACHER',
        'reserve',
        {
          courseId: courses.find((c: any) => c.code === 'CLOSED101').id,
          name: 'file.pdf',
          kind: 'pdf',
          size: 10,
        },
        409,
      );
    },
  );
});
