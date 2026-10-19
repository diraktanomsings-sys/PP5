import { useRef, useState } from 'react';
import { FileSpreadsheet, FileText, CheckCircle2, Upload } from 'lucide-react';

export function RevisionFilePicker({
  kind,
  file,
  onChange,
}: {
  kind: 'excel' | 'pdf';
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const excel = kind === 'excel',
    type = excel ? 'Excel' : 'PDF',
    extension = excel ? '.xlsx' : '.pdf';
  const Icon = excel ? FileSpreadsheet : FileText;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 min-w-0">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <Icon className={`w-5 h-5 ${excel ? 'text-emerald-700' : 'text-red-600'}`} />
        {excel ? '1.' : '2.'} {type} ฉบับแก้ไข <span className="text-red-600">*</span>
      </div>
      <p className="text-xs text-slate-500">ไฟล์ {extension} ขนาดไม่เกิน 25 MB</p>
      <input
        ref={input}
        type="file"
        className="hidden"
        aria-label={`${type} ฉบับแก้ไข`}
        accept={
          excel
            ? '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : '.pdf,application/pdf'
        }
        onChange={(e) => {
          const next = e.target.files?.[0];
          if (!next) return;
          if (
            !next.name.toLowerCase().endsWith(extension) ||
            next.size === 0 ||
            next.size > 25 * 1024 * 1024
          ) {
            setError(`กรุณาเลือก ${extension} ที่มีข้อมูลและขนาดไม่เกิน 25 MB`);
            onChange(null);
            e.target.value = '';
            return;
          }
          setError('');
          onChange(next);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={`เลือกไฟล์ ${type} ฉบับแก้ไข`}
        className="w-full rounded-lg border-2 border-dashed border-blue-300 bg-white px-3 py-4 font-bold text-blue-900 hover:bg-blue-50 hover:border-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 flex items-center justify-center gap-2 cursor-pointer"
      >
        <Upload className="w-4 h-4 shrink-0" />
        {file ? `เปลี่ยนไฟล์ ${type}` : `กดเลือกไฟล์ ${type}`}
      </button>
      {file ? (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900 space-y-1"
          role="status"
        >
          <p className="flex items-start gap-1.5 break-all">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {file.name}
          </p>
          <p>
            {(file.size / 1024).toLocaleString('th-TH', { maximumFractionDigits: 1 })} KB ·
            เลือกไฟล์แล้ว
          </p>
        </div>
      ) : (
        <p className="text-xs text-slate-500">ยังไม่ได้เลือกไฟล์ {type}</p>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
