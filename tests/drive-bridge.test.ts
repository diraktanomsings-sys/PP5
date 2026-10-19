import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { DriveBridge, bridgeUrl } from '../server/drive-bridge.js';
import { Service } from '../server/service.js';
import { emptyState, type Store, type StoredFile } from '../server/store.js';
import { ApiError, digest } from '../server/security.js';
import { createHttp } from '../server/http.js';

const folderId = '1_9hk4918HBD1wmy2vK92W83jzYsPbrh4';
const url = 'https://script.google.com/macros/s/test-script/exec';
const bytes = Buffer.from('%PDF-1.7\nSchool Drive integration test\n%%EOF');
const json = (v: unknown) =>
  new Response(JSON.stringify(v), { headers: { 'Content-Type': 'application/json' } });
const fail = (f: () => Promise<unknown>, status: number) =>
  assert.rejects(f, (e: unknown) => e instanceof ApiError && e.status === status);
function fixture() {
  let state = emptyState();
  state.terms.push({ id: 'term', year: 2569, semester: 1, active: true, deadline: '2027-01-01' });
  state.courses.push({
    id: 'course',
    termId: 'term',
    code: 'ท13101',
    name: 'ภาษาไทย',
    grade: 'ป.3/1',
    teacherId: 'teacher',
    reviewerId: '',
    open: true,
  });
  state.users.push({
    id: 'admin',
    teacherId: 'admin',
    name: 'Test admin',
    email: 'admin@example.test',
    roles: ['ADMIN'],
    active: true,
    passwordHash: '',
  });
  state.users.push({
    id: 'teacher',
    teacherId: 'teacher',
    name: 'Test teacher',
    email: 'teacher@example.test',
    roles: ['TEACHER'],
    active: true,
    passwordHash: '',
  });
  for (const userId of ['admin', 'teacher'])
    state.sessions[digest(userId)] = { userId, expiresAt: Date.now() + 60000 };
  const file: StoredFile = {
    id: randomUUID(),
    name: 'ตัวอย่าง.pdf',
    kind: 'pdf',
    size: bytes.length,
    sha256: digest(bytes),
    ownerId: 'teacher',
    courseId: 'course',
    pathname: 'test-private-path',
    ready: true,
    used: true,
    expiresAt: Date.now() + 60000,
  };
  state.files[file.id] = file;
  const store: Store = {
    read: async () => structuredClone(state),
    write: async (fn) => {
      const next = structuredClone(state);
      const result = fn(next);
      state = next;
      return structuredClone(result);
    },
  };
  let removed = 0,
    permanentlyDeleted = 0,
    calls = 0,
    shared = false;
  const files = new Map<string, any>();
  const iterator = (values: any[]) => {
    let i = 0;
    return { hasNext: () => i < values.length, next: () => values[i++] };
  };
  const blob = (data: any, mime?: string, name?: string) => ({
    getBytes: () => Buffer.from(typeof data === 'string' ? data : data),
    name,
  });
  const folders = new Map<string, any>();
  function makeFolder(id: string, name: string, parent?: any): any {
    const folder = {
      id,
      name,
      parent,
      getId: () => id,
      getName: () => name,
      isTrashed: () => false,
      getParents: () => iterator(folder.parent ? [folder.parent] : []),
      shared: false,
      getSharingAccess: () => (shared || folder.shared ? 'ANYONE' : 'PRIVATE'),
      getFoldersByName: (name: string) =>
        iterator([...folders.values()].filter((f) => f.name === name && f.parent === folder)),
      createFolder: (name: string) => makeFolder(randomUUID(), name, folder),
      getFiles: () =>
        iterator([...files.values()].filter((f) => f.parent === folder && !f.trashed)),
      getFilesByName: (name: string) =>
        iterator(
          [...files.values()].filter((f) => f.name === name && !f.trashed && f.parent === folder),
        ),
      createFile: (b: any) => {
        const id = randomUUID();
        const f = {
          id,
          name: b.name,
          data: Buffer.from(b.getBytes()),
          trashed: false,
          outside: false,
          parent: folder,
          getId: () => id,
          getName: () => f.name,
          getSize: () => f.data.length,
          getBlob: () => blob(f.data),
          getParents: () => iterator(f.outside ? [] : [f.parent]),
          moveTo: (destination: any) => {
            f.parent = destination;
          },
          isTrashed: () => f.trashed,
          setTrashed: (v: boolean) => {
            f.trashed = v;
          },
        };
        files.set(id, f);
        return f;
      },
    };
    folders.set(id, folder);
    return folder;
  }
  const root = makeFolder(folderId, 'ปพ.5');
  let payload: any;
  const context = vm.createContext({
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s: string) => ({
        text: s,
        setMimeType() {
          return this;
        },
      }),
    },
    DriveApp: {
      Access: { PRIVATE: 'PRIVATE' },
      getFolderById: (id: string) => {
        if (!folders.has(id)) throw Error('Missing folder');
        return folders.get(id);
      },
      getFilesByName: (name: string) =>
        iterator([...files.values()].filter((f) => f.name === name && !f.trashed)),
      getFileById: (id: string) => files.get(id),
    },
    UrlFetchApp: {
      fetch: (target: string, init: any) => {
        if (target.startsWith('https://www.googleapis.com/drive/v3/files/')) {
          assert.equal(init.headers.Authorization, 'Bearer test-only-oauth-token');
          assert.equal(init.followRedirects, false);
          const id = new URL(target).pathname.split('/').pop()!;
          const file = files.get(id);
          if (!file) return { getResponseCode: () => 404, getContentText: () => '{}' };
          if (init.method === 'delete') {
            files.delete(id);
            permanentlyDeleted++;
            return { getResponseCode: () => 204, getContentText: () => '' };
          }
          return {
            getResponseCode: () => 200,
            getContentText: () =>
              JSON.stringify({
                id,
                name: file.name,
                size: String(file.data.length),
                parents: [file.outside ? 'another-folder' : file.parent.id],
                mimeType: file.folder ? 'application/vnd.google-apps.folder' : 'application/pdf',
              }),
          };
        }
        assert.equal(target, 'https://pp-5-gray.vercel.app/api/pp5?action=drive-job');
        assert.equal(init.followRedirects, false);
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify(payload) };
      },
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (_: unknown, b: any) => [
        ...createHash('sha256').update(Buffer.from(b)).digest(),
      ],
      getUuid: randomUUID,
      newBlob: blob,
      base64Decode: (s: string) => Buffer.from(s, 'base64'),
      base64Encode: (b: any) => Buffer.from(b).toString('base64'),
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'school@example.test' }) },
    ScriptApp: { getOAuthToken: () => 'test-only-oauth-token' },
  });
  vm.runInContext(
    readFileSync(new URL('../google-drive/Code.gs', import.meta.url), 'utf8'),
    context,
  );
  const source = {
    kind: 'blob' as const,
    bytes: async () => bytes,
    read: async () => Readable.from([bytes]),
    remove: async () => {
      removed++;
    },
  };
  let bridge: DriveBridge;
  // Execute the actual deployed script for every mocked network request.
  const scriptTransport: typeof fetch = async (input, init) => {
    assert.equal(String(input), url);
    calls++;
    const body = String(init?.body);
    payload = await bridge.payload(JSON.parse(body).key);
    const result = context.doPost({ contentLength: body.length, postData: { contents: body } });
    return new Response(result.text, { headers: { 'Content-Type': 'application/json' } });
  };
  bridge = new DriveBridge(store, source, scriptTransport);
  const service = new Service(store, 'blob', 'test-only-setup');
  const connect = () =>
    bridge.configure(service, 'admin', 'ADMIN', { url, folderId, confirmed: true });
  return {
    store,
    bridge,
    service,
    file,
    files,
    folders,
    root,
    source,
    connect,
    context,
    setShared: (v: boolean) => {
      shared = v;
    },
    get removed() {
      return removed;
    },
    get calls() {
      return calls;
    },
    get permanentlyDeleted() {
      return permanentlyDeleted;
    },
  };
}
test('school script verifies create/read and trashes only its synthetic probe before enabling Drive', async () => {
  const f = fixture();
  await f.connect();
  const s = await f.store.read();
  assert.equal(s.driveConfig?.enabled, true);
  assert.equal(s.driveConfig?.folderId, folderId);
  assert.equal(f.files.size, 1);
  assert.ok([...f.files.values()][0].trashed);
  assert.deepEqual(s.driveJobs, {});
});
test('permanent Drive deletion requires a persisted purge, deletes only bound school files and retries safely', async () => {
  const f = fixture();
  await f.connect();
  await f.bridge.migrate(f.service, 'admin', 'ADMIN', f.file.id);
  const saved = (await f.store.read()).files[f.file.id];
  await fail(() => f.bridge.storage().remove!(saved), 403);
  await f.store.write((s) => {
    s.purges = {
      'course:course': {
        kind: 'course',
        targetId: 'course',
        fileIds: [saved.id],
        removed: [],
        startedAt: '',
        planHash: 'test',
      },
    };
  });
  const remote = f.files.get(saved.drive!.id)!;
  remote.outside = true;
  await fail(() => f.bridge.remove(saved), 409);
  assert.equal(f.permanentlyDeleted, 0);
  assert.equal(f.removed, 0);
  remote.outside = false;
  remote.folder = true;
  await fail(() => f.bridge.remove(saved), 409);
  remote.folder = false;
  await f.bridge.remove(saved);
  assert.equal(f.files.has(saved.drive!.id), false);
  assert.equal(f.permanentlyDeleted, 1);
  assert.equal(f.removed, 1);
  await f.bridge.remove(saved);
  assert.equal(f.permanentlyDeleted, 1);
});
test('purging an upload without a saved Drive pointer finds only its exact managed UUID filename', async () => {
  const f = fixture();
  await f.connect();
  await f.bridge.persist(f.file, bytes);
  await f.store.write((s) => {
    delete s.files[f.file.id].drive;
    s.files[f.file.id].sha256 = '';
    s.purges = {
      'course:course': {
        kind: 'course',
        targetId: 'course',
        fileIds: [f.file.id],
        removed: [],
        startedAt: '',
        planHash: 'test',
      },
    };
  });
  await f.bridge.remove((await f.store.read()).files[f.file.id]);
  assert.equal(f.permanentlyDeleted, 1);
});
test('only admin can connect a restricted folder and unsuccessful probes keep configuration unchanged', async () => {
  const f = fixture();
  await fail(
    () => f.bridge.configure(f.service, 'teacher', 'TEACHER', { url, folderId, confirmed: true }),
    403,
  );
  await fail(
    () => f.bridge.configure(f.service, '', 'ADMIN', { url, folderId, confirmed: true }),
    401,
  );
  await fail(() => f.bridge.configure(f.service, 'admin', 'ADMIN', { url, folderId }), 400);
  assert.equal(f.calls, 0);
  f.setShared(true);
  await fail(f.connect, 409);
  assert.equal((await f.store.read()).driveConfig, undefined);
  assert.equal(f.files.size, 0);
});
test('write, retry and read use identical bytes in the school root; migration retains original storage', async () => {
  const f = fixture();
  await f.connect();
  await f.bridge.migrate(f.service, 'admin', 'ADMIN', f.file.id);
  const saved = (await f.store.read()).files[f.file.id];
  assert.ok(saved.drive);
  assert.equal(saved.drive.folderId, folderId);
  assert.equal(digest(await f.bridge.bytes(saved)), f.file.sha256);
  assert.equal(f.removed, 0);
  await f.bridge.migrate(f.service, 'admin', 'ADMIN', f.file.id);
  assert.equal([...f.files.values()].filter((x) => !x.trashed).length, 1);
  const second = await f.bridge.persist(f.file, bytes);
  assert.equal(second?.id, saved.drive.id);
  assert.equal([...f.files.values()].filter((x) => !x.trashed).length, 1);
  await fail(() => f.bridge.migrate(f.service, 'teacher', 'TEACHER', f.file.id), 403);
});
test('school receiver separates term/class/subject, reuses folders and organizes legacy files without changing IDs or bytes', async () => {
  const f = fixture();
  await f.connect();
  await f.bridge.migrate(f.service, 'admin', 'ADMIN', f.file.id);
  const saved = (await f.store.read()).files[f.file.id];
  const remote = f.files.get(saved.drive!.id);
  assert.deepEqual(saved.drive!.layout, [
    'ปีการศึกษา 2569 ภาคเรียนที่ 1',
    'ชั้น ป.3-1',
    'ท13101 ภาษาไทย',
  ]);
  assert.equal(remote.parent.name, 'ท13101 ภาษาไทย');
  assert.equal(remote.parent.parent.name, 'ชั้น ป.3-1');
  assert.equal(remote.parent.parent.parent.parent.id, folderId);
  assert.equal(f.folders.size, 4);
  const second = { ...f.file, id: randomUUID(), name: 'version-2.pdf', drive: undefined };
  await f.store.write((s) => {
    s.files[second.id] = second;
  });
  const secondPointer = await f.bridge.persist(second, bytes);
  assert.equal(secondPointer!.parentId, saved.drive!.parentId);
  assert.equal(f.folders.size, 4);
  remote.moveTo(f.root);
  await f.store.write((s) => {
    delete s.files[f.file.id].drive!.layout;
    delete s.files[f.file.id].drive!.parentId;
  });
  assert.equal((await f.service.snapshot('admin', 'ADMIN')).drive!.unorganized!.length, 1);
  assert.equal((await f.service.snapshot('teacher', 'TEACHER')).drive!.unorganized, undefined);
  await fail(() => f.bridge.organize(f.service, 'teacher', 'TEACHER', f.file.id), 403);
  remote.data = Buffer.from('changed');
  await fail(() => f.bridge.organize(f.service, 'admin', 'ADMIN', f.file.id), 409);
  assert.equal(remote.parent, f.root);
  remote.data = bytes;
  await f.bridge.organize(f.service, 'admin', 'ADMIN', f.file.id);
  await f.bridge.organize(f.service, 'admin', 'ADMIN', f.file.id);
  assert.equal(remote.parent.id, saved.drive!.parentId);
  assert.equal((await f.store.read()).files[f.file.id].drive!.id, saved.drive!.id);
  assert.equal(
    digest(await f.bridge.bytes((await f.store.read()).files[f.file.id])),
    digest(bytes),
  );
  assert.equal(f.folders.size, 4);
  assert.equal(f.removed, 0);
  remote.parent.shared = true;
  await fail(() => f.bridge.bytes(saved), 409);
});
test('owner maintenance moves only unambiguous managed root filenames and preserves all bytes and IDs', () => {
  const f = fixture();
  const add = (tail: string) =>
    f.root.createFile({ name: `PP5_${randomUUID()}__${tail}`, getBytes: () => bytes });
  const original = add('ปพ5_2569_ภาคเรียนที่1_ป.3-1_ท13101_ภาษาไทย_ครู.pdf');
  const revision = add('ปพ5_2569_1_ป.3-1_ท13101_V002.xlsx');
  const unknown = add('ปพ5_2569_1_ป.4-1_ว12010_V002.pdf');
  const ambiguousA = add('ปพ5_2569_1_ป.2-1_ส101_สังคม_ครู.pdf');
  const ambiguousB = add('ปพ5_2569_1_ป.2-1_ส101_ประวัติศาสตร์_ครู.pdf');
  assert.equal(f.context.legacyOrganizationPlan_().rows.length, 2);
  f.context.organizeLegacyRootFiles();
  assert.equal(original.parent.name, 'ท13101 ภาษาไทย');
  assert.equal(original.parent, revision.parent);
  for (const file of [unknown, ambiguousA, ambiguousB]) assert.equal(file.parent, f.root);
  assert.equal(f.context.legacyOrganizationPlan_().rows.length, 0);
  assert.equal(digest(original.data), digest(bytes));
  assert.ok(f.files.has(original.id));
  assert.equal(f.permanentlyDeleted, 0);
});
test('pending upload source is released only after its verified Drive pointer is saved', async () => {
  const f = fixture();
  await f.connect();
  await f.store.write((s) => {
    s.files[f.file.id].used = false;
  });
  const pending = (await f.store.read()).files[f.file.id];
  const storage = f.bridge.storage();
  await storage.release!(pending);
  assert.equal(f.removed, 0);
  const drive = await f.bridge.persist(pending, bytes);
  await f.store.write((s) => {
    s.files[pending.id].drive = drive;
  });
  const saved = (await f.store.read()).files[pending.id];
  await storage.release!(saved);
  assert.equal(f.removed, 1);
  assert.equal((await f.store.read()).files[pending.id].sourceReleased, true);
  await storage.release!((await f.store.read()).files[pending.id]);
  assert.equal(f.removed, 1);
});
test('modified files and a public root fail reads and are never silently substituted', async () => {
  const f = fixture();
  await f.connect();
  await f.bridge.migrate(f.service, 'admin', 'ADMIN', f.file.id);
  const saved = (await f.store.read()).files[f.file.id];
  f.files.get(saved.drive!.id).data = Buffer.from('changed');
  await fail(() => f.bridge.bytes(saved), 409);
  f.setShared(true);
  await fail(() => f.bridge.bytes(saved), 409);
  assert.equal(f.removed, 0);
});
test('unconfigured installations keep existing Blob files and connection cannot change roots with stored files', async () => {
  const f = fixture();
  assert.equal(await f.bridge.persist(f.file, bytes), undefined);
  assert.equal(digest(await f.bridge.bytes(f.file)), f.file.sha256);
  assert.equal(f.calls, 0);
  await f.connect();
  await f.bridge.migrate(f.service, 'admin', 'ADMIN', f.file.id);
  await fail(
    () =>
      f.bridge.configure(f.service, 'admin', 'ADMIN', {
        url,
        folderId: 'another-root',
        confirmed: true,
      }),
    409,
  );
});
test('job capabilities are single use, expire and reject unknown keys', async () => {
  const f = fixture();
  const key = 'a'.repeat(64);
  await f.store.write((s) => {
    s.driveJobs = { [digest(key)]: { kind: 'probe', folderId, expiresAt: Date.now() + 1000 } };
  });
  assert.equal((await f.bridge.payload(key)).folderId, folderId);
  await fail(() => f.bridge.payload(key), 403);
  await fail(() => f.bridge.payload('wrong'), 403);
  await f.store.write((s) => {
    s.driveJobs = { [digest(key)]: { kind: 'probe', folderId, expiresAt: 0 } };
  });
  await fail(() => f.bridge.payload(key), 403);
});
test('bridge only permits fixed Google endpoints and verified probe proofs', async () => {
  for (const value of [
    'https://evil.example/exec',
    'https://script.google.com/macros/s/a/exec?key=a',
    'https://script.google.com/macros/s/a/exec#x',
    'https://user@script.google.com/macros/s/a/exec',
  ])
    assert.throws(() => bridgeUrl(value));
  const f = fixture();
  let bridge = new DriveBridge(
    f.store,
    f.source,
    async () => new Response(null, { status: 302, headers: { location: 'https://evil.example' } }),
  );
  await fail(
    () => bridge.configure(f.service, 'admin', 'ADMIN', { url, folderId, confirmed: true }),
    502,
  );
  bridge = new DriveBridge(f.store, f.source, async () =>
    json({ protocol: 'PP5-DRIVE-1', ok: true, private: true, folderId }),
  );
  await fail(
    () => bridge.configure(f.service, 'admin', 'ADMIN', { url, folderId, confirmed: true }),
    409,
  );
  assert.equal((await f.store.read()).driveConfig, undefined);
});
test('copy failures never mark a pending upload ready; success saves the verified pointer', async () => {
  const f = fixture();
  await f.connect();
  await f.store.write((s) => {
    s.files[f.file.id].used = false;
    s.files[f.file.id].ready = false;
    s.files[f.file.id].sha256 = '';
  });
  f.setShared(true);
  await fail(
    () => f.service.readyFile('teacher', f.file.id, bytes, (file, b) => f.bridge.persist(file, b)),
    409,
  );
  assert.equal((await f.store.read()).files[f.file.id].ready, false);
  assert.equal(f.removed, 0);
  f.setShared(false);
  await f.service.readyFile('teacher', f.file.id, bytes, (file, b) => f.bridge.persist(file, b));
  const saved = (await f.store.read()).files[f.file.id];
  assert.equal(saved.ready, true);
  assert.ok(saved.drive);
  assert.equal(digest(await f.bridge.bytes(saved)), digest(bytes));
});
test('snapshots hide bridge configuration and jobs from other roles', async () => {
  const f = fixture();
  await f.connect();
  await f.store.write((s) => {
    s.driveJobs = { secretJob: { kind: 'probe', folderId, expiresAt: Date.now() + 10000 } };
  });
  const teacher = await f.service.snapshot('teacher', 'TEACHER');
  const admin = await f.service.snapshot('admin', 'ADMIN');
  assert.equal(teacher.drive?.enabled, true);
  assert.equal(teacher.drive?.url, undefined);
  assert.equal(teacher.drive?.ownerEmail, undefined);
  assert.ok(admin.drive?.url);
  assert.ok(!JSON.stringify(admin).includes('secretJob'));
});
test('HTTP job endpoint permits only one-use capabilities, while settings retain cookie and origin authorization', async () => {
  const f = fixture();
  const server = createHttp(f.service, f.bridge.storage(), 'http://localhost', f.bridge).listen(
    0,
    '127.0.0.1',
  );
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address() as any;
  const endpoint = `http://127.0.0.1:${address.port}/api/pp5`;
  try {
    const key = 'b'.repeat(64);
    await f.store.write((s) => {
      s.driveJobs = { [digest(key)]: { kind: 'probe', folderId, expiresAt: Date.now() + 10000 } };
    });
    const post = (action: string, body: any, headers: any = {}) =>
      fetch(endpoint + '?action=' + action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
    assert.equal((await post('drive-job', { key })).status, 200);
    assert.equal((await post('drive-job', { key })).status, 403);
    assert.equal((await post('drive-config', { url, folderId, confirmed: true })).status, 403);
    assert.equal(
      (
        await post(
          'drive-config',
          { url, folderId, confirmed: true },
          { origin: 'http://localhost', 'x-pp5-role': 'ADMIN' },
        )
      ).status,
      401,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
