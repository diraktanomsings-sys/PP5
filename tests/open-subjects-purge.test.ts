import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { zipSync } from 'fflate';
import { emptyState, type Store } from '../server/store.js';
import { Service } from '../server/service.js';
import { ApiError, digest } from '../server/security.js';
import { previewPurge, purgeStep } from '../server/purge.js';
import type { ObjectStorage } from '../server/storage.js';

const pdf = Buffer.from('%PDF-1.7\nSynthetic annotated document\n%%EOF');
const excel = zipSync({
  '[Content_Types].xml': Buffer.from('<Types/>'),
  'xl/workbook.xml': Buffer.from('<workbook><sheets/></workbook>'),
});
const denied = (work: () => Promise<unknown>, code: number) =>
  assert.rejects(work, (e: unknown) => e instanceof ApiError && e.status === code);
function fixture() {
  let state = emptyState();
  for (const [id, roles, department] of [
    ['admin', ['ADMIN'], ''],
    ['a', ['TEACHER'], 'คณิตศาสตร์'],
    ['b', ['TEACHER', 'REVIEWER'], 'ภาษาไทย'],
    ['reviewer', ['REVIEWER'], 'สังคมศึกษา'],
  ] as const) {
    state.users.push({
      id,
      roles: [...roles],
      department,
      name: id,
      email: `${id}@example.test`,
      teacherId: id,
      active: true,
      passwordHash: '',
    });
    state.sessions[digest(id)] = { userId: id, expiresAt: Date.now() + 3600000 };
  }
  state.terms.push(
    { id: 'term', year: 2569, semester: 1, active: true, deadline: '2027-12-31' },
    { id: 'old', year: 2568, semester: 1, active: false, deadline: '2025-12-31' },
  );
  for (const [id, termId, open] of [
    ['course', 'term', true],
    ['second', 'term', true],
    ['closed', 'term', false],
    ['past', 'old', true],
  ] as const)
    state.courses.push({
      id,
      termId,
      open,
      code: id,
      name: 'คณิตศาสตร์',
      department: 'คณิตศาสตร์',
      grade: 'ป.1/1',
      teacherId: 'a',
      reviewerId: 'b',
    });
  const store: Store = {
    read: async () => structuredClone(state),
    write: async (fn) => {
      const next = structuredClone(state);
      const result = fn(next);
      state = next;
      return structuredClone(result);
    },
  };
  const service = new Service(store, 'local', '');
  const buffers = new Map<string, Uint8Array>();
  let failureId = '';
  let failure = true;
  const storage: ObjectStorage = {
    kind: 'local',
    bytes: async (f) => buffers.get(f.id)!,
    read: async (f) => Readable.from([buffers.get(f.id)!]),
    remove: async (f) => {
      if (f.id === failureId && failure) {
        failure = false;
        throw Error('Synthetic storage interruption');
      }
      buffers.delete(f.id);
    },
  };
  async function upload(
    user: string,
    courseId: string,
    kind: 'excel' | 'pdf',
    purpose?: 'annotation',
  ) {
    const bytes = kind === 'excel' ? excel : pdf;
    const file = await service.reserve(user, purpose ? 'REVIEWER' : 'TEACHER', {
      courseId,
      kind,
      purpose,
      name: `synthetic.${kind === 'excel' ? 'xlsx' : 'pdf'}`,
      size: bytes.length,
    });
    buffers.set(file.id, bytes);
    await service.readyFile(user, file.id, bytes);
    return file.id;
  }
  const pair = async (user: string, courseId = 'course') => ({
    excelId: await upload(user, courseId, 'excel'),
    pdfId: await upload(user, courseId, 'pdf'),
  });
  return {
    service,
    store,
    storage,
    buffers,
    upload,
    pair,
    setFailure: (id: string) => {
      failureId = id;
    },
    configure: (action: string, id: string) =>
      service.configure('admin', 'ADMIN', action, { id, confirmed: true }),
  };
}
test('admin creates and restores a course without a teacher; actual sender becomes its owner', async () => {
  const f = fixture();
  const body = {
    termId: 'term',
    code: 'UNASSIGNED',
    name: 'วิชาเลือก',
    grade: 'ป.2/1',
    reviewerId: 'b',
  };
  await denied(
    () => f.service.configure('admin', 'ADMIN', 'course', { ...body, teacherId: 'missing' }),
    400,
  );
  await f.service.configure('admin', 'ADMIN', 'course', body);
  const course = (await f.store.read()).courses.find((c) => c.code === 'UNASSIGNED')!;
  assert.equal(course.teacherId, '');
  await f.configure('course-delete', course.id);
  await f.configure('course-restore', course.id);
  await f.service.configure('admin', 'ADMIN', 'course-open', { id: course.id, open: true });
  assert.ok((await f.service.snapshot('b', 'TEACHER')).courses.some((c) => c.id === course.id));
  const files = await f.pair('b', course.id);
  await f.service.submit('b', 'TEACHER', { courseId: course.id, ...files, confirmed: true });
  const saved = (await f.store.read()).courses.find((c) => c.id === course.id)!;
  assert.equal(saved.teacherId, 'b');
  assert.equal(saved.reviewerId, '');
  await denied(
    () => f.service.configure('admin', 'ADMIN', 'course-edit', { id: course.id, teacherId: '' }),
    409,
  );
});
test('teachers select any open unsubmitted subject across departments; first committed sender owns the course and other documents remain private', async () => {
  const f = fixture();
  const s = await f.service.snapshot('b', 'TEACHER');
  assert.deepEqual(s.courses.map((c) => c.id).sort(), ['course', 'second']);
  const loser = await f.pair('a'),
    winner = await f.pair('b');
  await f.service.submit('b', 'TEACHER', { courseId: 'course', ...winner, confirmed: true });
  const saved = (await f.store.read()).courses.find((c) => c.id === 'course')!;
  assert.equal(saved.teacherId, 'b');
  assert.equal(saved.department, 'คณิตศาสตร์');
  assert.equal(saved.reviewerId, '');
  assert.equal((await f.service.snapshot('a', 'TEACHER')).submissions.length, 0);
  await denied(
    () => f.service.submit('a', 'TEACHER', { courseId: 'course', ...loser, confirmed: true }),
    403,
  );
  await denied(() => f.service.accessibleFile('a', 'TEACHER', winner.pdfId), 404);
  await denied(
    () =>
      f.service.reserve('a', 'TEACHER', {
        courseId: 'course',
        kind: 'pdf',
        name: 'new.pdf',
        size: pdf.length,
      }),
    403,
  );
  await denied(
    () =>
      f.service.reserve('b', 'TEACHER', {
        courseId: 'closed',
        kind: 'pdf',
        name: 'new.pdf',
        size: pdf.length,
      }),
    409,
  );
  const second = await f.pair('b', 'second');
  await f.service.submit('b', 'TEACHER', { courseId: 'second', ...second, confirmed: true });
  assert.equal((await f.service.snapshot('b', 'TEACHER')).submissions.length, 2);
});
test('teacher withdraws only own unapproved submission, deletes every owned version/annotation and keeps the course selectable', async () => {
  const f = fixture();
  const foreignDraft = await f.pair('a');
  const pair = await f.pair('b');
  await f.service.submit('b', 'TEACHER', { courseId: 'course', ...pair, confirmed: true });
  let sub = (await f.store.read()).submissions[0];
  await denied(() => previewPurge(f.service, 'a', 'TEACHER', 'submission', sub.id), 403);
  await denied(() => previewPurge(f.service, 'admin', 'ADMIN', 'submission', sub.id), 403);
  await f.service.configure('admin', 'ADMIN', 'reviewers', {
    assignments: [{ courseId: 'course', reviewerId: 'reviewer' }],
  });
  const annotatedId = await f.upload('reviewer', 'course', 'pdf', 'annotation');
  await f.service.review('reviewer', 'REVIEWER', {
    id: sub.id,
    expectedRevision: sub.revision,
    pass: false,
    checks: [false, false, false, false],
    notes: 'Synthetic return',
    annotatedId,
  });
  const revisionFiles = await f.pair('b');
  await f.service.submit('b', 'TEACHER', {
    courseId: 'course',
    ...revisionFiles,
    confirmed: true,
    expectedRevision: (await f.store.read()).submissions[0].revision,
  });
  const p = await previewPurge(f.service, 'b', 'TEACHER', 'submission', sub.id);
  assert.equal(p.fileCount, 5);
  assert.equal(p.versionCount, 2);
  const body = {
    kind: 'submission',
    id: sub.id,
    planHash: p.planHash,
    confirmed: true,
    confirmation: 'ลบถาวร',
  };
  await denied(
    () => purgeStep(f.service, f.storage, 'b', 'TEACHER', { ...body, planHash: 'stale' }),
    409,
  );
  await denied(
    () => purgeStep(f.service, f.storage, 'b', 'TEACHER', { ...body, confirmation: '' }),
    400,
  );
  f.setFailure(pair.pdfId);
  let result = { done: false };
  let hadFailure = false;
  for (let i = 0; i < 8 && !result.done; i++) {
    try {
      result = await purgeStep(f.service, f.storage, 'b', 'TEACHER', body);
    } catch (e) {
      assert.match(String(e), /Synthetic storage interruption/);
      hadFailure = true;
    }
    if (!result.done) {
      await denied(
        () =>
          f.service.reserve('b', 'TEACHER', {
            courseId: 'course',
            kind: 'pdf',
            name: 'new.pdf',
            size: pdf.length,
          }),
        409,
      );
      await denied(() => f.service.review('reviewer', 'REVIEWER', { id: sub.id }), 409);
      await denied(() => f.configure('course-delete', 'course'), 409);
      assert.equal((await f.store.read()).submissions.length, 1);
    }
  }
  assert.ok(hadFailure);
  assert.equal(result.done, true);
  const state = await f.store.read();
  assert.equal(state.submissions.length, 0);
  assert.equal(state.courses.find((c) => c.id === 'course')!.teacherId, '');
  assert.ok(f.buffers.has(foreignDraft.pdfId));
  for (const id of [
    pair.excelId,
    pair.pdfId,
    annotatedId,
    revisionFiles.excelId,
    revisionFiles.pdfId,
  ])
    assert.equal(f.buffers.has(id), false);
  await f.service.submit('a', 'TEACHER', { courseId: 'course', ...foreignDraft, confirmed: true });
  sub = (await f.store.read()).submissions[0];
  await f.service.review('reviewer', 'REVIEWER', {
    id: sub.id,
    expectedRevision: sub.revision,
    pass: true,
    checks: [true, true, true, true],
    notes: 'Synthetic pass',
  });
  await denied(() => previewPurge(f.service, 'a', 'TEACHER', 'submission', sub.id), 409);
});
test('assigned reviewer returns a real annotated PDF; only the actual sender can retrieve it and its history survives revision', async () => {
  const f = fixture();
  const files = await f.pair('b');
  await f.service.submit('b', 'TEACHER', { courseId: 'course', ...files, confirmed: true });
  await f.service.configure('admin', 'ADMIN', 'reviewers', {
    assignments: [{ courseId: 'course', reviewerId: 'reviewer' }],
  });
  let sub = (await f.store.read()).submissions[0];
  await denied(
    () =>
      f.service.review('b', 'REVIEWER', {
        id: sub.id,
        pass: false,
        checks: [false, false, false, false],
        notes: 'self',
        expectedRevision: sub.revision,
      }),
    403,
  );
  const annotatedId = await f.upload('reviewer', 'course', 'pdf', 'annotation');
  await f.service.review('reviewer', 'REVIEWER', {
    id: sub.id,
    pass: false,
    checks: [false, true, true, true],
    notes: 'Synthetic correction request',
    annotatedId,
    expectedRevision: sub.revision,
  });
  assert.equal(
    digest(await f.storage.bytes(await f.service.accessibleFile('b', 'TEACHER', annotatedId))),
    digest(pdf),
  );
  await denied(() => f.service.accessibleFile('a', 'TEACHER', annotatedId), 404);
  sub = (await f.store.read()).submissions[0];
  const v2 = await f.pair('b');
  await f.service.submit('b', 'TEACHER', {
    courseId: 'course',
    ...v2,
    confirmed: true,
    expectedRevision: sub.revision,
  });
  assert.equal(
    (await f.store.read()).submissions[0].versions[0].review?.annotated?.id,
    annotatedId,
  );
  assert.equal((await f.service.accessibleFile('b', 'TEACHER', annotatedId)).sha256, digest(pdf));
});
test('permanent purge previews exact files, requires typed confirmation and resumes storage failure without falsely completing', async () => {
  const f = fixture();
  const files = await f.pair('b');
  await f.service.submit('b', 'TEACHER', { courseId: 'course', ...files, confirmed: true });
  await f.configure('course-delete', 'course');
  const preview = await previewPurge(f.service, 'admin', 'ADMIN', 'course', 'course');
  assert.equal(preview.fileCount, 2);
  assert.equal(preview.versionCount, 1);
  await denied(() => previewPurge(f.service, 'b', 'TEACHER', 'course', 'course'), 403);
  const body = {
    kind: 'course',
    id: 'course',
    planHash: preview.planHash,
    confirmed: true,
    confirmation: 'ลบถาวร',
  };
  await denied(
    () => purgeStep(f.service, f.storage, 'admin', 'ADMIN', { ...body, confirmation: 'wrong' }),
    400,
  );
  await denied(
    () => purgeStep(f.service, f.storage, 'admin', 'ADMIN', { ...body, planHash: 'stale' }),
    409,
  );
  const ids = Object.keys((await f.store.read()).files).sort();
  f.setFailure(ids[1]);
  const first = await purgeStep(f.service, f.storage, 'admin', 'ADMIN', body);
  assert.equal(first.done, false);
  assert.equal(first.removed, 1);
  await assert.rejects(
    () => purgeStep(f.service, f.storage, 'admin', 'ADMIN', body),
    /Synthetic storage interruption/,
  );
  assert.ok((await f.store.read()).courses.some((c) => c.id === 'course'));
  assert.equal((await previewPurge(f.service, 'admin', 'ADMIN', 'course', 'course')).removed, 1);
  await denied(() => f.configure('course-restore', 'course'), 409);
  const done = await purgeStep(f.service, f.storage, 'admin', 'ADMIN', body);
  assert.equal(done.done, true);
  const final = await f.store.read();
  assert.ok(!final.courses.some((c) => c.id === 'course'));
  assert.equal(final.submissions.length, 0);
  assert.equal(Object.keys(final.files).length, 0);
  assert.equal(f.buffers.size, 0);
  assert.equal(Object.keys(final.purges || {}).length, 0);
  assert.ok(final.audit.some((a) => a.action === 'PERMANENTLY_DELETED'));
  await denied(() => f.service.accessibleFile('b', 'TEACHER', files.pdfId), 404);
});
test('purge respects storage leases and all historical dependencies; user and term records become reclaimable after course purges', async () => {
  const f = fixture();
  const files = await f.pair('b');
  await f.service.submit('b', 'TEACHER', { courseId: 'course', ...files, confirmed: true });
  await f.configure('course-delete', 'course');
  await f.store.write((s) => {
    s.storageWrites = { [files.pdfId]: { token: randomUUID(), expiresAt: Date.now() + 60000 } };
  });
  await denied(() => previewPurge(f.service, 'admin', 'ADMIN', 'course', 'course'), 409);
  await f.store.write((s) => {
    s.storageWrites = {};
  });
  await denied(() => f.configure('user-delete', 'b'), 409);
  await f.store.write((s) => {
    for (const c of s.courses) if (c.id !== 'course') c.reviewerId = 'reviewer';
  });
  await f.configure('user-delete', 'b');
  await denied(() => previewPurge(f.service, 'admin', 'ADMIN', 'user', 'b'), 409);
  const p = await previewPurge(f.service, 'admin', 'ADMIN', 'course', 'course');
  let result;
  do {
    result = await purgeStep(f.service, f.storage, 'admin', 'ADMIN', {
      ...p,
      confirmation: 'ลบถาวร',
      confirmed: true,
    });
  } while (!result.done);
  const u = await previewPurge(f.service, 'admin', 'ADMIN', 'user', 'b');
  assert.equal(
    (
      await purgeStep(f.service, f.storage, 'admin', 'ADMIN', {
        ...u,
        confirmation: 'ลบถาวร',
        confirmed: true,
      })
    ).done,
    true,
  );
  assert.ok(!(await f.store.read()).users.some((u) => u.id === 'b'));
  // An empty inactive term can be removed completely, then re-created with the same year/semester.
  await f.store.write((s) => {
    s.courses = s.courses.filter((c) => c.termId !== 'old');
  });
  await f.configure('term-delete', 'old');
  const t = await previewPurge(f.service, 'admin', 'ADMIN', 'term', 'old');
  await purgeStep(f.service, f.storage, 'admin', 'ADMIN', {
    ...t,
    confirmation: 'ลบถาวร',
    confirmed: true,
  });
  await f.service.configure('admin', 'ADMIN', 'term', {
    year: 2568,
    semester: 1,
    deadline: '2027-12-31',
  });
});
