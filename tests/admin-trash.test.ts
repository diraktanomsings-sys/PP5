import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, type Store } from '../server/store.js';
import { Service } from '../server/service.js';
import { ApiError, digest, hashPassword, checkPassword } from '../server/security.js';
import { selectArchive } from '../server/archive.js';

const denied = (work: () => Promise<unknown>, status: number) =>
  assert.rejects(work, (e: unknown) => e instanceof ApiError && e.status === status);
async function fixture() {
  let state = emptyState();
  const passwordHash = await hashPassword('Synthetic-only-password-2026!');
  for (const [id, role] of [
    ['admin', 'ADMIN'],
    ['teacher', 'TEACHER'],
    ['reviewer', 'REVIEWER'],
    ['executive', 'EXECUTIVE'],
    ['unused', 'TEACHER'],
  ] as const) {
    state.users.push({
      id,
      name: id,
      email: id + '@example.test',
      teacherId: id,
      roles: [role],
      active: true,
      passwordHash,
    });
    state.sessions[digest(id)] = { userId: id, expiresAt: Date.now() + 60000 };
  }
  state.terms.push(
    { id: 'old', year: 2568, semester: 1, active: false, deadline: '2027-01-01' },
    { id: 'current', year: 2569, semester: 1, active: true, deadline: '2027-01-01' },
  );
  state.courses.push({
    id: 'course',
    termId: 'old',
    code: 'TEST',
    name: 'Synthetic course',
    grade: 'ป.1/1',
    teacherId: 'teacher',
    reviewerId: 'reviewer',
    open: true,
  });
  const excel = {
    id: 'excel',
    name: 'old.xlsx',
    kind: 'excel' as const,
    size: 2,
    sha256: 'exact-excel-hash',
  };
  const pdf = {
    id: 'pdf',
    name: 'old.pdf',
    kind: 'pdf' as const,
    size: 2,
    sha256: 'exact-pdf-hash',
  };
  for (const file of [excel, pdf])
    state.files[file.id] = {
      ...file,
      ownerId: 'teacher',
      courseId: 'course',
      pathname: file.id,
      ready: true,
      used: true,
      expiresAt: 0,
    };
  state.submissions.push({
    id: 'submission',
    courseId: 'course',
    status: 'FINAL_LOCKED',
    revision: 3,
    versions: [
      {
        number: 1,
        excel,
        pdf,
        submittedAt: '2026-10-19',
        submittedBy: 'teacher',
        notes: '',
        review: {
          by: 'reviewer',
          at: '2026-10-19',
          pass: true,
          notes: 'Synthetic',
          checks: [true, true, true, true],
        },
      },
    ],
    approval: {
      by: 'executive',
      at: '2026-10-19',
      signature: 'synthetic',
      manifest: 'unchanged',
      manifestHash: 'original-approval-hash',
      pdfHash: pdf.sha256,
      excelHash: excel.sha256,
    },
  });
  const store: Store = {
    read: async () => structuredClone(state),
    write: async (fn) => {
      const draft = structuredClone(state);
      const result = await fn(draft);
      state = draft;
      return result;
    },
  };
  const service = new Service(store, 'local', '');
  const command = (action: string, id: string) =>
    service.configure('admin', 'ADMIN', action, { id, confirmed: true });
  return { service, store, command };
}

test('trash mutations require admin and explicit confirmation; deletion revokes access', async () => {
  const { service, store, command } = await fixture();
  for (const role of ['TEACHER', 'REVIEWER', 'EXECUTIVE'] as const)
    for (const action of [
      'user-delete',
      'user-restore',
      'course-delete',
      'course-restore',
      'term-delete',
      'term-restore',
    ])
      await denied(
        () =>
          service.configure(role.toLowerCase(), role, action, { id: 'unused', confirmed: true }),
        403,
      );
  await denied(() => service.configure('admin', 'ADMIN', 'user-delete', { id: 'unused' }), 400);
  await denied(() => command('user-delete', 'admin'), 400);
  await denied(() => command('user-delete', 'teacher'), 409);
  await command('user-delete', 'unused');
  await denied(() => service.snapshot('unused', 'TEACHER'), 401);
  await denied(
    () => service.configure('admin', 'ADMIN', 'user-active', { id: 'unused', active: true }),
    400,
  );
  await denied(
    () =>
      service.configure('admin', 'ADMIN', 'user-password', {
        id: 'unused',
        password: 'Replacement-only-password-2026!',
      }),
    404,
  );
  await command('user-restore', 'unused');
  assert.equal((await store.read()).users.find((u) => u.id === 'unused')?.active, false);
  await service.configure('admin', 'ADMIN', 'user-active', { id: 'unused', active: true });
  assert.equal(
    (
      await service.login(
        { identifier: 'unused', password: 'Synthetic-only-password-2026!' },
        '127.0.0.1',
      )
    ).length > 20,
    true,
  );
});

test('course/term trash retains original archive, approval and history while blocking work and invalid restores', async () => {
  const { service, store, command } = await fixture();
  await denied(() => command('term-delete', 'current'), 409);
  await denied(() => command('term-delete', 'old'), 409);
  const before = (await store.read()).submissions[0];
  await command('course-delete', 'course');
  await denied(
    () => service.configure('admin', 'ADMIN', 'course-open', { id: 'course', open: true }),
    400,
  );
  await denied(
    () =>
      service.reserve('teacher', 'TEACHER', {
        courseId: 'course',
        name: 'new.pdf',
        kind: 'pdf',
        size: 2,
      }),
    403,
  );
  await denied(
    () =>
      service.review('reviewer', 'REVIEWER', {
        id: 'submission',
        expectedRevision: 3,
        pass: true,
        checks: [true, true, true, true],
        notes: 'stale',
      }),
    403,
  );
  const snapshot = await service.snapshot('teacher', 'TEACHER');
  assert.equal(selectArchive(snapshot, {}).length, 1);
  assert.equal(
    (await service.accessibleFile('teacher', 'TEACHER', 'pdf')).sha256,
    'exact-pdf-hash',
  );
  assert.equal(snapshot.courses[0].open, false);
  assert.ok(snapshot.courses[0].deletedAt);
  const after = (await store.read()).submissions[0];
  assert.deepEqual(after.approval, before.approval);
  assert.deepEqual(after.versions, before.versions);
  assert.equal(after.revision, before.revision + 1);
  await command('term-delete', 'old');
  await denied(() => command('course-restore', 'course'), 409);
  await denied(() => service.configure('admin', 'ADMIN', 'term-active', { id: 'old' }), 404);
  await command('user-delete', 'teacher');
  await command('term-restore', 'old');
  await denied(() => command('course-restore', 'course'), 409);
  await command('user-restore', 'teacher');
  await denied(() => command('course-restore', 'course'), 409);
  await service.configure('admin', 'ADMIN', 'user-active', { id: 'teacher', active: true });
  await command('course-restore', 'course');
  const restored = (await store.read()).courses[0];
  assert.equal(restored.deletedAt, undefined);
  assert.equal(restored.open, false);
  assert.equal(
    (await store.read()).submissions[0].approval?.manifestHash,
    'original-approval-hash',
  );
  assert.ok((await store.read()).audit.some((a) => a.action === 'TERM_DELETED'));
});

test('password reset stores a hash only, revokes old sessions and never returns plaintext in snapshots or audit', async () => {
  const { service, store } = await fixture();
  const replacement = 'Replacement-only-password-2026!';
  await service.configure('admin', 'ADMIN', 'user-password', {
    id: 'unused',
    password: replacement,
  });
  const saved = (await store.read()).users.find((u) => u.id === 'unused')!;
  assert.ok(saved.passwordHash.startsWith('scrypt:'));
  assert.ok(await checkPassword(replacement, saved.passwordHash));
  await denied(() => service.snapshot('unused', 'TEACHER'), 401);
  const json = JSON.stringify(await service.snapshot('admin', 'ADMIN'));
  assert.ok(!json.includes(replacement));
  assert.ok(!json.includes('passwordHash'));
  assert.ok(!JSON.stringify((await store.read()).audit).includes(replacement));
});
