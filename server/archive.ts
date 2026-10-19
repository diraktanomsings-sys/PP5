import type { Snapshot } from '../src/production/types.js';
import { requireThat } from './security.js';
import { sameGradeLevel } from '../src/lib/archive.js';

export function selectArchive(state: Snapshot, query: Record<string, unknown>) {
  const status = String(query.status || 'FINAL_LOCKED');
  requireThat(
    ['ALL', 'PENDING_REVIEW', 'REJECTED_REVISION', 'PENDING_DIRECTOR', 'FINAL_LOCKED'].includes(
      status,
    ),
    400,
    'สถานะเอกสารไม่ถูกต้อง',
  );
  let ids: string[] | undefined;
  if (query.ids !== undefined) {
    requireThat(typeof query.ids === 'string', 400, 'รายการเอกสารไม่ถูกต้อง');
    ids = query.ids.split(',');
    requireThat(
      ids.length > 0 &&
        ids.length <= 100 &&
        new Set(ids).size === ids.length &&
        ids.every((v) => /^[a-f0-9-]{36}$/.test(v)),
      400,
      'เลือกเอกสาร 1–100 รายการต่อ ZIP',
    );
    const visible = new Set(state.submissions.map((s) => s.id));
    requireThat(
      ids.every((id) => visible.has(id)),
      403,
      'มีเอกสารที่คุณไม่มีสิทธิ์ดาวน์โหลด',
    );
  }
  return state.submissions.filter(
    (s) =>
      s.versions.length > 0 &&
      (status === 'ALL' || s.status === status) &&
      (!ids || ids.includes(s.id)) &&
      (!query.termId || state.courses.find((c) => c.id === s.courseId)?.termId === query.termId) &&
      (!query.year ||
        String(
          state.terms.find((t) => t.id === state.courses.find((c) => c.id === s.courseId)?.termId)
            ?.year,
        ) === query.year) &&
      (!query.grade ||
        sameGradeLevel(
          state.courses.find((c) => c.id === s.courseId)?.grade || '',
          String(query.grade),
        )),
  );
}
export function zipSegment(value: string) {
  return value.replace(/[\\/\x00-\x1f:]/g, '_').replace(/^\.+/, '_') || 'document';
}
