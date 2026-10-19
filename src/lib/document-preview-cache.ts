type Entry = {
  controller: AbortController;
  promise: Promise<Uint8Array>;
  size: number;
  expiresAt: number;
};

// Private preview bytes stay only in this provider's memory, never persistent
// browser storage. Copy on return: PDF.js may transfer/detach its input buffer.
export class DocumentPreviewCache {
  private entries = new Map<string, Entry>();
  private scope = '';
  constructor(
    private maxBytes = 32 * 1024 * 1024,
    private ttl = 120_000,
    private now = Date.now,
  ) {}
  clear() {
    for (const entry of this.entries.values()) entry.controller.abort();
    this.entries.clear();
    this.scope = '';
  }
  async read(scope: string, key: string, load: (signal: AbortSignal) => Promise<Uint8Array>) {
    if (this.scope !== scope) {
      this.clear();
      this.scope = scope;
    }
    let entry = this.entries.get(key);
    if (entry && entry.expiresAt <= this.now()) {
      entry.controller.abort();
      this.entries.delete(key);
      entry = undefined;
    }
    if (entry) {
      this.entries.delete(key);
      this.entries.set(key, entry);
      return (await entry.promise).slice();
    }
    // Rapidly opening different files must not start an unbounded queue of
    // Drive requests. An unmounted older preview can be requested again later.
    const pending = [...this.entries].filter(([, e]) => e.expiresAt === Infinity);
    if (pending.length >= 2) {
      pending[0][1].controller.abort();
      this.entries.delete(pending[0][0]);
    }
    const controller = new AbortController();
    const created: Entry = { controller, size: 0, expiresAt: Infinity, promise: undefined! };
    created.promise = Promise.resolve()
      .then(() => load(controller.signal))
      .then((bytes) => {
        if (controller.signal.aborted) throw new Error('การเปิดเอกสารถูกยกเลิก');
        created.size = bytes.byteLength;
        created.expiresAt = this.now() + this.ttl;
        let size = [...this.entries.values()].reduce((total, e) => total + e.size, 0);
        for (const [id, e] of this.entries) {
          if (size <= this.maxBytes && this.entries.size <= 4) break;
          if (e.expiresAt === Infinity) continue;
          size -= e.size;
          this.entries.delete(id);
        }
        return bytes;
      })
      .catch((error) => {
        if (this.entries.get(key) === created) this.entries.delete(key);
        throw error;
      });
    this.entries.set(key, created);
    return (await created.promise).slice();
  }
}
