import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PP5Submission, Course } from '../../types/schema';
import { ShieldCheck, Copy, Check, Printer, X, Stamp, Lock } from 'lucide-react';

interface CertificateHashModalProps {
  submission: PP5Submission;
  course: Course;
  onClose: () => void;
}

export const CertificateHashModal: React.FC<CertificateHashModalProps> = ({
  submission,
  course,
  onClose,
}) => {
  const { schoolLogoUrl, downloadSigned, archiveUsers: users } = useApp();
  const [copied, setCopied] = useState(false);

  const hash = submission.digital_certificate_hash || '';

  const handleCopy = () => {
    navigator.clipboard?.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Certificate Header */}
        <div className="bg-[#00236f] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800/80 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold">หลักฐานการอนุมัติเอกสาร ปพ.5</h3>
              <p className="text-xs text-blue-200">หลักฐานการอนุมัติและ SHA-256 ของรายการ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <button
            disabled={!submission.digital_certificate_hash}
            onClick={() => void downloadSigned(submission.id)}
            className="bg-blue-900 text-white rounded-lg px-4 py-2 text-xs"
          >
            ดาวน์โหลด PDF พร้อมหน้าแนบท้ายลายมือชื่อและตราโรงเรียน
          </button>
        </div>
        {/* Certificate Body */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center gap-6 py-2 border-b border-slate-100">
            <div className="w-16 h-16 p-1 flex items-center justify-center">
              <img src={schoolLogoUrl} alt="ตราโรงเรียน" className="w-full h-full object-contain" />
            </div>
            <div className="text-center">
              <h4 className="text-sm font-bold text-slate-900">โรงเรียนบ้านคูเมือง</h4>
              <p className="text-xs text-slate-500">
                สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสิงห์บุรี (สพป.สิงห์บุรี)
              </p>
              <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <Lock className="w-3 h-3" />
                <span>สถานะ: ล็อกเล่มถาวร (FINAL_LOCKED)</span>
              </div>
            </div>
            <div className="w-16 h-16 rounded-full border border-rose-200 p-1 bg-white shadow-xs">
              <img
                src={schoolLogoUrl}
                alt="ตราประทับรับรอง"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">รหัสวิชา / รายวิชา:</span>
              <span className="font-bold text-slate-900">
                {course.course_code} {course.course_name}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">ระดับชั้นเรียน:</span>
              <span className="font-bold text-slate-900">{course.grade_level}</span>
            </div>
            <div>
              <span className="text-slate-500 block">เวอร์ชันที่อนุมัติ:</span>
              <span className="font-bold text-blue-800 font-mono">
                {submission.versions[0]?.version_number || 'V001'} (Final Certified)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">เกรดเฉลี่ยรวม (GPA):</span>
              <span className="font-bold text-slate-900 font-mono">
                {Number.isFinite(submission.average_gpa) ? submission.average_gpa.toFixed(2) : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">ผู้อนุมัติ (ผู้บริหาร):</span>
              <span className="font-bold text-slate-900">
                {users.find((u) => u.id === submission.approved_by)?.full_name ||
                  submission.approved_by ||
                  '—'}
              </span>
              <span className="text-[11px] text-slate-500 block">
                ผู้อนุมัติตามบัญชีที่บันทึกในระบบ
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">เวลาที่อนุมัติ:</span>
              <span className="font-bold text-slate-900 font-mono">
                {submission.approved_at
                  ? new Date(submission.approved_at).toLocaleString('th-TH')
                  : '—'}
              </span>
            </div>
          </div>

          {/* SHA-256 Hash Box */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              รหัสแฮชดิจิทัลประจำเล่ม (Digital Certificate Hash - SHA-256)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-900 text-emerald-400 font-mono text-[11px] p-3 rounded-lg overflow-x-auto break-all border border-slate-800 selection:bg-emerald-900">
                {hash}
              </div>
              <button
                onClick={handleCopy}
                className="px-3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors border border-slate-300 shrink-0"
                title="คัดลอกรหัสแฮช"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              รหัสแฮชอ้างอิงไฟล์ต้นฉบับและหลักฐานการอนุมัติที่บันทึกในระบบ
              ไม่ใช่ใบรับรองดิจิทัลจากหน่วยงานภายนอก
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
          >
            <Printer className="w-4 h-4" />
            พิมพ์หนังสือรับรอง
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#00236f] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
