import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { PurgePreview } from '../../production/types';

export function TeacherDeleteSubmission({
  id,
  label,
  status,
}: {
  id: string;
  label: string;
  status: string;
}) {
  const { previewPurge, permanentlyDelete, busy } = useApp();
  const [preview, setPreview] = useState<PurgePreview>();
  const [confirmation, setConfirmation] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!preview) return;
    const previous = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    return () => previous?.focus();
  }, [preview]);
  if (!['PENDING_REVIEW', 'REJECTED_REVISION'].includes(status)) return null;
  return (
    <>
      <button
        type="button"
        disabled={busy}
        title={`ลบ ปพ.5 ${label} และไฟล์ใน Drive`}
        aria-label={`ลบ ปพ.5 ${label}`}
        className="p-1.5 rounded-md text-red-600 hover:bg-red-50 hover:text-red-800 cursor-pointer"
        onClick={async () => {
          const p = await previewPurge('submission', id);
          if (p) {
            setConfirmation('');
            setPreview(p);
          }
        }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      {preview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs text-left">
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`withdraw-${id}`}
            className="max-w-md w-full rounded-2xl bg-white p-6 shadow-2xl space-y-4 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Escape' && !busy) setPreview(undefined);
              if (e.key !== 'Tab') return;
              const controls = Array.from(
                dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input') || [],
              );
              const first = controls[0],
                last = controls.at(-1);
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }}
          >
            <h3 id={`withdraw-${id}`} className="text-base font-bold text-red-800">
              ยืนยันลบ ปพ.5 ที่ส่งผิด
            </h3>
            <p className="font-semibold text-blue-950">{preview.label}</p>
            <p className="text-slate-600 leading-relaxed">
              ลบงานทั้งหมด {preview.versionCount} เวอร์ชัน รวม {preview.fileCount} ไฟล์ (Excel, PDF
              และไฟล์แนบผลตรวจ) ออกจากระบบและ Drive ถาวร กู้คืนไม่ได้
              รายวิชายังอยู่และสามารถเลือกส่งใหม่ได้ตามกำหนดส่ง
            </p>
            {preview.continuing && (
              <p className="text-amber-800">การลบครั้งก่อนยังไม่เสร็จ กดยืนยันเพื่อดำเนินการต่อ</p>
            )}
            <label className="block text-slate-700">
              พิมพ์ <strong>ลบถาวร</strong> เพื่อยืนยัน
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
                className="mt-2 w-full rounded-lg border border-slate-300 p-2"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                ref={cancel}
                type="button"
                disabled={busy}
                onClick={() => setPreview(undefined)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={busy || confirmation !== 'ลบถาวร'}
                className="rounded-lg bg-red-700 px-4 py-2 text-white font-bold disabled:opacity-40"
                onClick={async () => {
                  if (await permanentlyDelete(preview, confirmation)) setPreview(undefined);
                }}
              >
                ลบงานและไฟล์ถาวร
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
