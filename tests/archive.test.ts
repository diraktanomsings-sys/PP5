import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { Readable } from 'node:stream';
import { unzipSync } from 'fflate';
import { emptyState, type Store } from '../server/store.js';
import { Service } from '../server/service.js';
import { createHttp } from '../server/http.js';
import { digest } from '../server/security.js';
import { latestArchiveVersion, archiveRows, sameGradeLevel } from '../src/lib/archive.js';
import { notificationView } from '../src/lib/navigation.js';
test('workflow notifications stay inside the current role instead of routing to forbidden views', () => {
  for (const role of ['TEACHER', 'REVIEWER', 'EXECUTIVE', 'ADMIN'] as const)
    for (const status of ['PENDING_REVIEW', 'PENDING_DIRECTOR', 'REJECTED_REVISION'] as const)
      assert.ok(notificationView(role, status).startsWith(role.toLowerCase() + '/'));
  assert.equal(notificationView('REVIEWER', 'REJECTED_REVISION'), 'reviewer/revisions');
  assert.equal(notificationView('TEACHER', 'REJECTED_REVISION'), 'teacher/detail');
});

test('archive picks the highest submitted version rather than the last item and normalizes grade labels', () => {
  const versions = [
    { version_number: 'V002', pdf_file_name: 'new.pdf' },
    { version_number: 'V001', pdf_file_name: 'old.pdf' },
  ] as any;
  assert.equal(latestArchiveVersion(versions)?.pdf_file_name, 'new.pdf');
  assert.equal(latestArchiveVersion([...versions].reverse())?.pdf_file_name, 'new.pdf');
  assert.equal(latestArchiveVersion([]), undefined);
  assert.ok(sameGradeLevel('ป. 3/1', 'ป.3'));
  assert.ok(sameGradeLevel('ป.3-2', 'ป.3'));
  assert.ok(!sameGradeLevel('ป.10/1', 'ป.1'));
  const data: any = {
    submissions: [{ id: 's', course_id: 'c', status: 'PENDING_REVIEW', versions }],
    courses: [
      {
        id: 'c',
        term_id: 't',
        teacher_id: 'u',
        course_name: 'ภาษาไทย',
        course_code: 'ท101',
        grade_level: 'ป. 3/1',
      },
    ],
    terms: [{ id: 't', year: 2569 }],
    users: [{ id: 'u', full_name: 'ครูสมมติ' }],
  };
  const filters: any = { termId: 'ALL', year: 'ALL', grade: 'ป.3', status: 'ALL', q: 'ครูสมมติ' };
  assert.equal(archiveRows(data, filters).length, 1);
  assert.equal(archiveRows(data, { ...filters, status: 'FINAL_LOCKED' }).length, 0);
  assert.equal(archiveRows(data, { ...filters, year: '2568' }).length, 0);
});
test('archive HTTP downloads exact selected latest originals and keeps approval and role boundaries', async (t) => {
  const s = emptyState();
  const buffers = new Map<string, Buffer>();
  for (const id of ['admin', 'teacher', 'other']) {
    s.users.push({
      id,
      name: id,
      email: id + '@example.test',
      teacherId: id,
      roles: [id === 'admin' ? 'ADMIN' : 'TEACHER'],
      active: true,
      passwordHash: '',
    });
    s.sessions[digest(id)] = { userId: id, expiresAt: Date.now() + 60000 };
  }
  s.terms.push({ id: 't', year: 2569, semester: 1, deadline: '2026-12-31', active: true });
  const make = (owner: string, status: 'PENDING_REVIEW' | 'FINAL_LOCKED', two = false) => {
    const cid = randomUUID();
    s.courses.push({
      id: cid,
      termId: 't',
      code: '../ท101',
      name: 'ภาษาไทย',
      grade: 'ป. 3/1',
      teacherId: owner,
      reviewerId: 'reviewer',
      open: true,
    });
    const versions = Array.from({ length: two ? 2 : 1 }, (_, i) => {
      const pair: any = {};
      for (const kind of ['excel', 'pdf'] as const) {
        const id = randomUUID(),
          bytes = Buffer.from(kind + '-version-' + (i + 1));
        buffers.set(id, bytes);
        const f = {
          id,
          name: `v${i + 1}.${kind === 'pdf' ? 'pdf' : 'xlsx'}`,
          kind,
          size: bytes.length,
          sha256: digest(bytes),
        };
        s.files[id] = {
          ...f,
          ownerId: owner,
          courseId: cid,
          pathname: id,
          ready: true,
          used: true,
          expiresAt: 0,
        };
        pair[kind] = f;
      }
      return { ...pair, number: i + 1, submittedAt: '2026-10-19', submittedBy: owner, notes: '' };
    });
    const sub: any = { id: randomUUID(), courseId: cid, status, revision: 1, versions };
    if (status === 'FINAL_LOCKED')
      sub.approval = { by: 'executive', at: '2026-10-19', manifestHash: 'test-only-hash' };
    s.submissions.push(sub);
    return sub;
  };
  const pending = make('teacher', 'PENDING_REVIEW', true),
    approved = make('teacher', 'FINAL_LOCKED'),
    foreign = make('other', 'FINAL_LOCKED');
  const store: Store = { read: async () => structuredClone(s), write: async (fn) => fn(s) };
  const storage = {
    kind: 'local' as const,
    bytes: async (f: any) => buffers.get(f.id)!,
    read: async (f: any) => Readable.from([buffers.get(f.id)!]),
  };
  const server = createHttp(
    new Service(store, 'local', 'test-only'),
    storage,
    'http://localhost',
  ).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  });
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/pp5`;
  const get = (q: string, user = 'teacher') =>
    fetch(base + '?action=archive&' + q, {
      headers: {
        Cookie: 'pp5_session=' + user,
        'X-PP5-Role': user === 'admin' ? 'ADMIN' : 'TEACHER',
      },
    });
  await t.test('default remains approved only for existing API callers', async () => {
    const r = await get('');
    assert.equal(r.status, 200);
    const z = unzipSync(new Uint8Array(await r.arrayBuffer()));
    assert.ok(Object.keys(z).every((k) => k.includes(approved.id.slice(0, 8))));
    assert.ok(Object.keys(z).some((k) => k.endsWith('approval.json')));
  });
  await t.test(
    'selected pending files download as current originals without a fake approval',
    async () => {
      const r = await get('status=ALL&ids=' + pending.id);
      assert.equal(r.status, 200);
      const z = unzipSync(new Uint8Array(await r.arrayBuffer()));
      assert.ok(!Object.keys(z).some((k) => k.includes('approval.json')));
      assert.ok(Object.keys(z).every((k) => !k.startsWith('../') && !k.includes('/../')));
      const pdf = z[Object.keys(z).find((k) => k.endsWith('.pdf'))!];
      assert.equal(digest(pdf), pending.versions[1].pdf.sha256);
      assert.equal(
        JSON.parse(
          Buffer.from(z[Object.keys(z).find((k) => k.endsWith('submission.json'))!]).toString(),
        ).status,
        'PENDING_REVIEW',
      );
    },
  );
  await t.test('selection cannot include another teacher or unauthorized files', async () => {
    assert.equal((await get('status=ALL&ids=' + foreign.id)).status, 403);
    assert.equal((await fetch(base + '?action=archive&status=ALL')).status, 401);
  });
  await t.test('status, term, grade and explicit ID filters are validated', async () => {
    assert.equal((await get('status=not-a-status')).status, 400);
    assert.equal((await get('status=ALL&ids=invalid')).status, 400);
    assert.equal((await get('status=ALL&ids=' + pending.id + ',' + pending.id)).status, 400);
    assert.equal((await get('status=ALL&year=2568')).status, 404);
    const r = await get('status=ALL&grade=' + encodeURIComponent('ป.3'));
    assert.equal(r.status, 200);
    await r.arrayBuffer();
  });
});
