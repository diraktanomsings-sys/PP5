import { get, del } from '@vercel/blob';
import { Readable } from 'node:stream';
import type { Readable as NodeStream } from 'node:stream';
import type { StoredFile } from './store.js';
import { requireThat } from './security.js';
export interface ObjectStorage {
  kind: 'local' | 'blob';
  read: (file: StoredFile) => Promise<NodeStream>;
  bytes: (file: StoredFile) => Promise<Uint8Array>;
  write?: (file: StoredFile, bytes: Uint8Array) => Promise<void>;
  remove?: (file: StoredFile) => Promise<void>;
  persist?: (file: StoredFile, bytes: Uint8Array) => Promise<StoredFile['drive']>;
  release?: (file: StoredFile) => Promise<void>;
}
export function blobStorage(): ObjectStorage {
  const read = async (file: StoredFile) => {
    const result = await get(file.pathname, { access: 'private', useCache: false });
    requireThat(
      result?.stream && result.statusCode === 200 && result.blob.size === file.size,
      409,
      'ไฟล์ยังอัปโหลดไม่สมบูรณ์ กรุณาลองใหม่',
    );
    return Readable.fromWeb(result.stream as any);
  };
  return {
    kind: 'blob',
    remove: async (file) => {
      await del(file.pathname);
    },
    read,
    bytes: async (file) => {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of await read(file)) {
        size += chunk.length;
        requireThat(size <= file.size, 400, 'ไฟล์มีขนาดเกินที่ระบุ');
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    },
  };
}
