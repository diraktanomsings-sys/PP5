import { PGlite } from '@electric-sql/pglite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Database } from './store.js';
import type { ObjectStorage } from './storage.js';
export async function localDatabase(directory: string): Promise<Database> {
  await mkdir(path.dirname(path.resolve(directory)), { recursive: true });
  const pg = new PGlite(directory);
  return {
    query: (sql, params) => pg.query(sql, params),
    transaction: (fn) => pg.transaction((tx) => fn(tx)),
    close: () => pg.close(),
  };
}
export async function localStorage(directory: string): Promise<ObjectStorage> {
  await mkdir(directory, { recursive: true });
  const location = (id: string) => {
    if (!/^[\da-f-]{36}$/.test(id)) throw new Error('InvalidFileId');
    return path.join(directory, id);
  };
  return {
    kind: 'local',
    bytes: (file) => readFile(location(file.id)),
    read: async (file) => {
      const { createReadStream } = await import('node:fs');
      return createReadStream(location(file.id));
    },
    write: (file, bytes) => writeFile(location(file.id), bytes, { flag: 'wx', mode: 0o600 }),
  };
}
