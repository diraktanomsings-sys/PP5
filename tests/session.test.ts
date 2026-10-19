import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Readable } from 'node:stream';
import { emptyState, type Store } from '../server/store.js';
import { Service } from '../server/service.js';
import { createHttp } from '../server/http.js';
import { digest } from '../server/security.js';

async function setup() {
  const state = emptyState();
  state.users = [
    {
      id: 'admin',
      name: 'Admin',
      email: 'admin@example.test',
      teacherId: 'admin',
      roles: ['ADMIN'],
      active: true,
      passwordHash: 'private-password-hash',
    },
    {
      id: 'teacher',
      name: 'Teacher',
      email: 'teacher@example.test',
      teacherId: 'teacher',
      roles: ['TEACHER'],
      active: true,
      passwordHash: 'another-private-hash',
    },
  ];
  state.sessions[digest('test-session')] = { userId: 'teacher', expiresAt: Date.now() + 60000 };
  state.files['private-file'] = {
    id: 'private-file',
    kind: 'pdf',
    name: 'restricted.pdf',
    size: 5,
    sha256: 'secret-sha',
    ownerId: 'admin',
    courseId: 'hidden-course',
    pathname: 'secret-storage-path',
    ready: true,
    used: true,
    expiresAt: 0,
  };
  state.driveConfig = {
    url: 'https://script.google.com/macros/s/private/exec',
    enabled: true,
    folderId: 'school-folder',
    folderName: 'School',
    ownerEmail: 'private-owner@example.test',
    verifiedAt: '',
  };
  state.driveJobs = {
    privateJob: { kind: 'probe', folderId: 'school-folder', expiresAt: Date.now() + 10000 },
  };
  let reads = 0;
  const store: Store = {
    read: async () => {
      reads++;
      return structuredClone(state);
    },
    write: async (fn) => fn(state),
  };
  const source = {
    kind: 'local' as const,
    bytes: async () => new Uint8Array(),
    read: async () => Readable.from([]),
  };
  const server = createHttp(
    new Service(store, 'local', 'test-only'),
    source,
    'http://localhost',
  ).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/pp5`;
  return {
    state,
    get reads() {
      return reads;
    },
    get: async (action: string, authenticated = false, role = 'TEACHER') => {
      const r = await fetch(base + '?action=' + action, {
        headers: {
          ...(authenticated ? { Cookie: 'pp5_session=test-session' } : {}),
          'X-PP5-Role': role,
        },
      });
      return {
        status: r.status,
        cache: r.headers.get('cache-control'),
        timing: r.headers.get('server-timing'),
        body: await r.json(),
      };
    },
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    },
  };
}
test('startup returns only public status to anonymous visitors with one database read', async () => {
  const f = await setup();
  try {
    const r = await f.get('session');
    assert.equal(r.status, 200);
    assert.equal(f.reads, 1);
    assert.deepEqual(r.body, { ready: true, initialized: true, schoolLogo: '' });
    assert.match(r.cache!, /no-store/);
    assert.match(r.timing!, /^app;dur=/);
    assert.equal((await f.get('state')).status, 401);
  } finally {
    await f.close();
  }
});
test('authenticated startup uses one read and preserves role filtering without exposing stored secrets', async () => {
  const f = await setup();
  try {
    const r = await f.get('session', true);
    assert.equal(r.status, 200);
    assert.equal(f.reads, 1);
    assert.equal(r.body.snapshot.user.id, 'teacher');
    assert.equal(r.body.snapshot.role, 'TEACHER');
    assert.equal(r.body.snapshot.people.length, 1);
    assert.equal(r.body.snapshot.courses.length, 0);
    assert.equal(r.body.snapshot.drive.url, undefined);
    for (const secret of [
      'private-password-hash',
      'another-private-hash',
      'secret-storage-path',
      'privateJob',
      'private-owner@example.test',
    ])
      assert.ok(!JSON.stringify(r.body).includes(secret));
    assert.equal((await f.get('session', true, 'ADMIN')).status, 403);
  } finally {
    await f.close();
  }
});
test('expired or revoked sessions never receive cached identities or private snapshots', async () => {
  const f = await setup();
  try {
    assert.ok((await f.get('session', true)).body.snapshot);
    f.state.sessions[digest('test-session')].expiresAt = 0;
    const expired = await f.get('session', true);
    assert.equal(expired.body.snapshot, undefined);
    assert.equal((await f.get('state', true)).status, 401);
    f.state.sessions[digest('test-session')].expiresAt = Date.now() + 60000;
    f.state.users[1].active = false;
    assert.equal((await f.get('session', true)).body.snapshot, undefined);
  } finally {
    await f.close();
  }
});
test('empty installations still expose setup status while all protected state stays unavailable', async () => {
  const f = await setup();
  try {
    f.state.users = [];
    const r = await f.get('session');
    assert.equal(r.body.initialized, false);
    assert.equal(r.body.snapshot, undefined);
    assert.equal(f.reads, 1);
    assert.equal((await f.get('state')).status, 401);
  } finally {
    await f.close();
  }
});
