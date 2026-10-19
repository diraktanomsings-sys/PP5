import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentPreviewCache } from '../src/lib/document-preview-cache';
import { LoadingOverlay } from '../src/components/common/LoadingOverlay';

test('repeated and concurrent preview opens reuse one read but each PDF worker receives an independent buffer', async () => {
  const cache = new DocumentPreviewCache();
  let reads = 0;
  const load = async () => {
    reads++;
    return new Uint8Array([1, 2, 3]);
  };
  const [a, b] = await Promise.all([
    cache.read('teacher', 'file:hash', load),
    cache.read('teacher', 'file:hash', load),
  ]);
  assert.equal(reads, 1);
  assert.notEqual(a.buffer, b.buffer);
  structuredClone(a, { transfer: [a.buffer] });
  assert.equal(a.byteLength, 0);
  assert.deepEqual([...(await cache.read('teacher', 'file:hash', load))], [1, 2, 3]);
  assert.equal(reads, 1);
});

test('role/user changes, logout/refresh clearing, expiry and changed file hashes require a new read', async () => {
  let time = 0,
    reads = 0;
  const cache = new DocumentPreviewCache(100, 1000, () => time);
  const load = async () => new Uint8Array([++reads]);
  await cache.read('teacher:TEACHER', 'file:hash1', load);
  assert.equal((await cache.read('teacher:REVIEWER', 'file:hash1', load))[0], 2);
  assert.equal((await cache.read('other:TEACHER', 'file:hash1', load))[0], 3);
  cache.clear();
  assert.equal((await cache.read('other:TEACHER', 'file:hash1', load))[0], 4);
  time = 1001;
  assert.equal((await cache.read('other:TEACHER', 'file:hash1', load))[0], 5);
  assert.equal((await cache.read('other:TEACHER', 'file:hash2', load))[0], 6);
});

test('preview failures are retryable and clearing an in-flight read cannot repopulate the next user cache', async () => {
  const cache = new DocumentPreviewCache();
  await assert.rejects(
    cache.read('teacher', 'file', async () => {
      throw Error('offline');
    }),
    /offline/,
  );
  assert.deepEqual(
    [...(await cache.read('teacher', 'file', async () => new Uint8Array([2])))],
    [2],
  );
  let complete!: (bytes: Uint8Array) => void;
  const pending = cache.read(
    'teacher',
    'pending',
    async () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  await Promise.resolve();
  cache.clear();
  complete(new Uint8Array([3]));
  await assert.rejects(pending, /ยกเลิก/);
  assert.deepEqual(
    [...(await cache.read('other', 'pending', async () => new Uint8Array([4])))],
    [4],
  );
});

test('cache evicts least recently opened bytes at its memory limit and never retains oversized files', async () => {
  const cache = new DocumentPreviewCache(6);
  const reads: Record<string, number> = {};
  const read = (id: string, size = 3) =>
    cache.read('teacher', id, async () => {
      reads[id] = (reads[id] || 0) + 1;
      return new Uint8Array(size);
    });
  await read('a');
  await read('b');
  await read('a');
  await read('c');
  await read('a');
  assert.equal(reads.a, 1);
  await read('b');
  assert.equal(reads.b, 2);
  await read('large', 7);
  await read('large', 7);
  assert.equal(reads.large, 2);
});

test('rapid navigation limits pending file reads and aborted completions cannot replace a newer preview', async () => {
  const cache = new DocumentPreviewCache();
  const callbacks: Array<() => void> = [];
  const signals: AbortSignal[] = [];
  const load = (signal: AbortSignal) =>
    new Promise<Uint8Array>((resolve) => {
      signals.push(signal);
      callbacks.push(() => resolve(new Uint8Array([1])));
    });
  const a = cache.read('teacher', 'a', load);
  const b = cache.read('teacher', 'b', load);
  await Promise.resolve();
  const c = cache.read('teacher', 'c', load);
  await Promise.resolve();
  assert.equal(signals[0].aborted, true);
  assert.equal(signals[1].aborted, false);
  callbacks.forEach((f) => f());
  const result = await Promise.allSettled([a, b, c]);
  assert.equal(result[0].status, 'rejected');
  assert.equal(result[1].status, 'fulfilled');
  assert.equal(result[2].status, 'fulfilled');
});

test('document loading status stays in its panel while mutation loading retains the full-page overlay', () => {
  const panel = renderToStaticMarkup(
    React.createElement(LoadingOverlay, { inline: true, message: 'กำลังอ่านไฟล์ PDF…' }),
  );
  const global = renderToStaticMarkup(
    React.createElement(LoadingOverlay, { message: 'กำลังบันทึก…' }),
  );
  assert.match(panel, /role="status"/);
  assert.match(panel, /กำลังอ่านไฟล์ PDF/);
  assert.ok(!panel.includes('fixed inset-0'));
  assert.match(global, /fixed inset-0/);
});
