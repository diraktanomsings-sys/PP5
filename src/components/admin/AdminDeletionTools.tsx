import { useEffect, useRef, useState } from 'react';
import { Trash2, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { PurgePreview } from '../../production/types';

const labels = { user: 'บุคลากร', course: 'รายวิชา', term: 'ภาคเรียน' };
export function AdminDeletionTools({ kind }: { kind: keyof typeof labels }) {
  const {
    archiveUsers,
    archiveCourses,
    archiveAcademicTerms,
    currentUser,
    currentRole,
    mutate,
    previewPurge,
    permanentlyDelete,
  } = useApp();
  const [selected, setSelected] = useState('');
  const [confirmation, setConfirmation] = useState<{ id: string; name: string }>();
  const [notice, setNotice] = useState('');
  const [purge, setPurge] = useState<PurgePreview>();
  const [purgeText, setPurgeText] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!confirmation && !purge) return;
    const previous = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, [confirmation, purge]);
  const dialogKeys = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setConfirmation(undefined);
      setPurge(undefined);
      setPurgeText('');
    }
    if (e.key !== 'Tab') return;
    const controls = dialog.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled),input:not(:disabled)',
    );
    if (!controls?.length) return;
    if (e.shiftKey && document.activeElement === controls[0]) {
      e.preventDefault();
      controls[controls.length - 1].focus();
    } else if (!e.shiftKey && document.activeElement === controls[controls.length - 1]) {
      e.preventDefault();
      controls[0].focus();
    }
  };
  if (currentRole !== 'ADMIN') return null;
  const records =
    kind === 'user'
      ? archiveUsers
          .filter((u) => u.id !== currentUser.id)
          .map((u) => ({
            id: u.id,
            name: `${u.full_name} (${u.teacher_id})`,
            deleted: u.deleted_at,
          }))
      : kind === 'course'
        ? archiveCourses.map((c) => {
            const t = archiveAcademicTerms.find((t) => t.id === c.term_id);
            return {
              id: c.id,
              name: `${c.course_code} ${c.course_name} ${c.grade_level} · ${t?.year || '—'}/${t?.semester || '—'}`,
              deleted: c.deleted_at,
            };
          })
        : archiveAcademicTerms.map((t) => ({
            id: t.id,
            name: `${t.year}/${t.semester}`,
            deleted: t.deleted_at,
          }));
  const active = records.filter((r) => !r.deleted);
  const deleted = records.filter((r) => r.deleted);
  const selectedRecord = active.find((r) => r.id === selected);
  const remove = async () => {
    if (
      !confirmation ||
      !(await mutate(`${kind}-delete`, { id: confirmation.id, confirmed: true }))
    )
      return;
    setNotice(`ลบ${labels[kind]}แล้ว สามารถกู้คืนได้จากถังขยะด้านล่าง`);
    setSelected('');
    setConfirmation(undefined);
  };
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-xs space-y-3">
      <h3 className="font-bold text-slate-800 flex items-center gap-2">
        <Trash2 className="h-4 w-4 text-rose-700" />
        ลบ{labels[kind]} / กู้คืนรายการ
      </h3>
      <p className="text-slate-500">
        รายการที่ลบจะออกจากหน้าทำงาน เอกสารและประวัติเดิมยังอยู่ในคลัง
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label={`เลือก${labels[kind]}ที่จะลบ`}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2"
        >
          <option value="">เลือก{labels[kind]}ที่จะลบ</option>
          {active.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!selectedRecord}
          onClick={() => {
            setNotice('');
            setConfirmation(selectedRecord);
          }}
          className="rounded-lg bg-rose-700 px-4 py-2 font-bold text-white disabled:opacity-40"
        >
          ลบ{labels[kind]}
        </button>
      </div>
      {notice && (
        <p role="status" className="text-emerald-800">
          {notice}
        </p>
      )}
      <details className="border-t border-slate-100 pt-3">
        <summary className="font-semibold text-blue-900">
          ถังขยะ{labels[kind]} ({deleted.length})
        </summary>
        {deleted.length === 0 ? (
          <p className="pt-3 text-slate-500">ไม่มีรายการที่ลบ</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {deleted.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span>{r.name}</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-900"
                    aria-label={`กู้คืน ${r.name}`}
                    onClick={async () => {
                      if (await mutate(`${kind}-restore`, { id: r.id, confirmed: true }))
                        setNotice(
                          kind === 'user'
                            ? 'กู้คืนบัญชีแล้ว เปิดใช้งานบัญชีจากแก้ไขข้อมูลก่อนเข้าสู่ระบบ'
                            : kind === 'course'
                              ? 'กู้คืนรายวิชาแล้ว เปิดรับส่งอีกครั้งเมื่อต้องการ'
                              : 'กู้คืนภาคเรียนแล้ว',
                        );
                    }}
                  >
                    <RotateCcw className="h-3 w-3" />
                    กู้คืน
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-800"
                    aria-label={`ลบถาวร ${r.name}`}
                    onClick={async () => {
                      const p = await previewPurge(kind, r.id);
                      if (p) {
                        setPurgeText('');
                        setPurge(p);
                      }
                    }}
                  >
                    ลบถาวร
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </details>
      {confirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-${kind}-title`}
            className="max-w-md w-full rounded-2xl bg-white p-6 shadow-2xl space-y-4"
            onKeyDown={dialogKeys}
          >
            <h4 id={`delete-${kind}-title`} className="text-base font-bold text-slate-900">
              ยืนยันลบ{labels[kind]}
            </h4>
            <p className="font-semibold text-blue-950 break-words">{confirmation.name}</p>
            <p className="text-slate-600 leading-relaxed">
              {kind === 'user'
                ? 'บัญชีจะเข้าสู่ระบบไม่ได้ หากยังมีรายวิชาหรืองานตรวจต้องจัดการผู้รับผิดชอบก่อนลบ'
                : kind === 'term'
                  ? 'ต้องตั้งภาคเรียนอื่นเป็นภาคเรียนปัจจุบัน และลบรายวิชาในภาคเรียนนี้ก่อน'
                  : 'รายวิชาจะหยุดรับส่งและออกจากคิวตรวจ/ลงนาม เอกสารเดิมยังดาวน์โหลดได้จากคลัง'}{' '}
              สามารถกู้คืนภายหลังได้
            </p>
            <div className="flex justify-end gap-2">
              <button
                ref={cancel}
                type="button"
                onClick={() => setConfirmation(undefined)}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-600"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                className="rounded-lg bg-rose-700 px-4 py-2 font-bold text-white"
              >
                ยืนยันลบ{labels[kind]}
              </button>
            </div>
          </div>
        </div>
      )}
      {purge && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="permanent-delete-title"
            onKeyDown={dialogKeys}
            className="w-full max-w-md rounded-2xl bg-white p-6 text-xs shadow-2xl space-y-4"
          >
            <h4 id="permanent-delete-title" className="text-base font-bold text-rose-900">
              ยืนยันลบ{labels[kind]}แบบถาวร
            </h4>
            <p className="font-semibold text-slate-900 break-words">{purge.label}</p>
            <dl className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-slate-700">
              <dt>รายการเอกสาร</dt>
              <dd>
                {purge.submissionCount} รายการ · {purge.versionCount} เวอร์ชัน
              </dd>
              <dt>ไฟล์ต้นฉบับและผลตรวจ</dt>
              <dd>
                {purge.fileCount} ไฟล์ · {(purge.bytes / 1024 / 1024).toFixed(2)} MB
              </dd>
            </dl>
            <p className="text-rose-800 leading-relaxed">
              ข้อมูลและไฟล์ในรายการนี้จะถูกลบถาวร กู้คืนไม่ได้ รวมเอกสารทุกเวอร์ชันและไฟล์ PDF
              ผลตรวจที่เกี่ยวข้อง
            </p>
            {purge.continuing && (
              <p role="status" className="text-amber-800">
                งานลบค้าง: ลบไฟล์แล้ว {purge.removed}/{purge.fileCount} ไฟล์ จะดำเนินการต่อจากเดิม
              </p>
            )}
            <label className="block font-semibold text-slate-700">
              พิมพ์ ลบถาวร เพื่อยืนยัน
              <input
                aria-label="พิมพ์ ลบถาวร เพื่อยืนยัน"
                value={purgeText}
                onChange={(e) => setPurgeText(e.target.value)}
                autoComplete="off"
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                ref={cancel}
                type="button"
                onClick={() => {
                  setPurge(undefined);
                  setPurgeText('');
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-600"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={purgeText !== 'ลบถาวร'}
                className="rounded-lg bg-rose-800 px-4 py-2 font-bold text-white disabled:opacity-40"
                onClick={async () => {
                  if (await permanentlyDelete(purge, purgeText)) {
                    setPurge(undefined);
                    setPurgeText('');
                    setNotice('ลบข้อมูลและไฟล์ในรายการถาวรเรียบร้อยแล้ว');
                  }
                }}
              >
                ยืนยันลบถาวร
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
