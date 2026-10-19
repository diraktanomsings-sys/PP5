import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { WorkflowStepper } from '../common/WorkflowStepper';
import { StatusBadge } from '../common/StatusBadge';
import { GradeSheetSimulator } from '../common/GradeSheetSimulator';
import { CertificateHashModal } from '../common/CertificateHashModal';
import {
  ArrowLeft,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Download,
  Calendar,
  User,
  History,
  FolderUp,
  ExternalLink,
  Link,
} from 'lucide-react';

export const TeacherDetailView: React.FC = () => {
  const {
    selectedSubmissionId,
    setSelectedSubmissionId,
    submissions,
    courses,
    assignments,
    users,
    currentUser,
    currentRole,
    setActiveView,
    submitRevision,
    activeTerm,
    academicTerms,
    organizationDriveUrl,
    organizationDriveFolderId,
  } = useApp();

  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionExcel, setRevisionExcel] = useState<File | null>(null);
  const [revisionPdf, setRevisionPdf] = useState<File | null>(null);
  const [revDriveFileLink, setRevDriveFileLink] = useState('');
  const [isSubmittingRev, setIsSubmittingRev] = useState(false);

  // Find submissions belonging to this teacher
  const mySubmissions = submissions.filter((s) => {
    const c = courses.find((course) => course.id === s.course_id);
    return c?.teacher_id === currentUser.id;
  });

  // Prioritize selected submission, or rejected revision needing attention, or first course
  const submission =
    submissions.find((s) => s.id === selectedSubmissionId) ||
    mySubmissions.find((s) => s.status === 'REJECTED_REVISION') ||
    mySubmissions[0] ||
    submissions[0];

  const course = courses.find((c) => c.id === submission?.course_id);
  const assignment = assignments.find((a) => a.course_id === course?.id);
  const reviewer = assignment ? users.find((u) => u.id === assignment.reviewer_id) : null;

  if (!course || !submission) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        ไม่พบข้อมูลเอกสาร กรุณากลับหน้าภาพรวม
      </div>
    );
  }

  const currentVer = submission.versions[0];
  const nextVerNumber = `V${String(submission.current_version + 1).padStart(3, '0')}`;
  const cleanGrade = course.grade_level.replace('/', '-');
  const courseTerm = academicTerms.find((t) => t.id === course.term_id) || activeTerm;
  const autoRevExcelName = `ปพ5_${courseTerm.year}_${courseTerm.semester}_${cleanGrade}_${course.course_code}_${nextVerNumber}.xlsx`;
  const autoRevPdfName = `ปพ5_${courseTerm.year}_${courseTerm.semester}_${cleanGrade}_${course.course_code}_${nextVerNumber}.pdf`;

  const handleConfirmRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionExcel || !revisionPdf) return;
    setIsSubmittingRev(true);
    const ex = new File([revisionExcel], autoRevExcelName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const pd = new File([revisionPdf], autoRevPdfName, { type: 'application/pdf' });
    const ok = await submitRevision(submission.id, ex, pd, revisionNotes, revDriveFileLink);
    setIsSubmittingRev(false);
    if (ok) {
      setShowRevisionModal(false);
      setRevisionExcel(null);
      setRevisionPdf(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top back & actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setActiveView(`${currentRole.toLowerCase()}/dashboard`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าภาพรวม</span>
        </button>

        <div className="flex items-center gap-2">
          {submission.status === 'REJECTED_REVISION' && course.teacher_id === currentUser.id && (
            <button
              onClick={() => setShowRevisionModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-2 animate-pulse cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>ส่งไฟล์แก้ไข ({nextVerNumber})</span>
            </button>
          )}

          {submission.status === 'FINAL_LOCKED' && (
            <button
              onClick={() => setShowCertificateModal(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>ดูใบรับรองดิจิทัล (Digital Certificate)</span>
            </button>
          )}
        </div>
      </div>

      {/* 6-Step Workflow Stepper */}
      <WorkflowStepper status={submission.status} currentVersion={submission.current_version} />

      {/* Course Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-blue-900 text-base">
                {course.course_code} {course.course_name}
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold font-mono text-xs">
                {course.grade_level}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs">
                {course.department}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              โครงสร้างหลักสูตร: กลุ่มสาระ{course.department}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={submission.status} size="lg" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">เวอร์ชันปัจจุบัน:</span>
            <span className="font-bold text-slate-800 font-mono">
              {currentVer?.version_number || 'V001'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">
              ผู้ตรวจที่รับผิดชอบ (Four-Eyes):
            </span>
            <span className="font-bold text-slate-800">
              {reviewer ? reviewer.full_name : 'ไม่ระบุ'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">ส่งล่าสุดเมื่อ:</span>
            <span className="font-bold text-slate-800 font-mono">
              {currentVer?.submitted_at
                ? new Date(currentVer.submitted_at).toLocaleDateString('th-TH')
                : '-'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">สถานะล็อกถาวร:</span>
            <span
              className={`font-bold ${submission.status === 'FINAL_LOCKED' ? 'text-emerald-700' : 'text-slate-600'}`}
            >
              {submission.status === 'FINAL_LOCKED'
                ? 'ล็อกถาวร (Locked)'
                : 'ยังไม่ล็อก (Editable Window)'}
            </span>
          </div>
        </div>
      </div>

      {/* Reviewer Feedback / Defect Alert if REJECTED */}
      {submission.status === 'REJECTED_REVISION' &&
        course.teacher_id === currentUser.id &&
        currentVer?.reviewer_notes && (
          <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-rose-900">
                    ข้อเสนอแนะและจุดบกพร่องที่ต้องแก้ไขจากผู้ตรวจ ({currentVer.version_number})
                  </h4>
                  <span className="text-xs text-rose-600 font-mono">
                    โดย: {reviewer?.full_name || 'ผู้ตรวจเอกสาร'}
                  </span>
                </div>

                <div className="mt-2 p-3 bg-white rounded-lg border border-rose-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                  {currentVer.reviewer_notes}
                </div>

                {currentVer.annotated_file_name && (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="text-rose-800 font-semibold">ไฟล์แนบข้อบกพร่องที่ไฮไลต์:</span>
                    <a
                      href={currentVer.annotated_file_url}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-rose-100/50 text-rose-700 rounded border border-rose-300 font-mono text-[11px] font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{currentVer.annotated_file_name}</span>
                    </a>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setShowRevisionModal(true)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>แก้ไขข้อมูลและอัปโหลด {nextVerNumber} ทันที</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Direct File Inspection Center */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-700" />
            <span>ตรวจสอบไฟล์ ปพ.5 ที่ส่งเข้าระบบ (Direct File Inspection)</span>
          </span>
          <span className="text-xs text-slate-500 font-normal">
            *ไฟล์ .xlsx และ .pdf สำหรับการตรวจทานของคณะกรรมการ
          </span>
        </h3>
        <GradeSheetSimulator submission={submission} course={course} />
      </div>

      {/* Version History Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600" />
          <span>ประวัติไฟล์เวอร์ชันเอกสาร (Submission Versions & Audit Trail)</span>
        </h4>

        <div className="space-y-4">
          {submission.versions.map((ver, idx) => (
            <div
              key={ver.id}
              className={`p-4 rounded-xl border text-xs transition-colors ${
                idx === 0 ? 'bg-blue-50/40 border-blue-200' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                    {ver.version_number}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    ส่งเมื่อ: {new Date(ver.submitted_at).toLocaleString('th-TH')}
                  </span>
                  {idx === 0 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                      เวอร์ชันล่าสุด
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-slate-600">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{ver.excel_file_name}</span>
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <FileText className="w-3.5 h-3.5 text-red-600" />
                    <span>{ver.pdf_file_name}</span>
                  </span>
                </div>
              </div>

              {ver.reviewer_notes && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-slate-700 bg-white/60 p-2.5 rounded">
                  <span className="font-semibold text-slate-900 block mb-0.5">
                    บันทึกจากผู้ตรวจ:
                  </span>
                  <p className="whitespace-pre-line text-[11px]">{ver.reviewer_notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Revision Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-rose-600" />
                <span>ส่งไฟล์แก้ไข ปพ.5 ({nextVerNumber})</span>
              </h4>
              <button
                onClick={() => setShowRevisionModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              อัปโหลดไฟล์คู่ชุดใหม่ที่ได้แก้ไขจุดบกพร่องตามที่ผู้ตรวจระบุเรียบร้อยแล้ว
            </p>

            <label className="block text-xs font-bold">
              เลือก Excel ฉบับแก้ไข
              <input
                aria-label="Excel ฉบับแก้ไข"
                type="file"
                accept=".xlsx"
                onChange={(e) => setRevisionExcel(e.target.files?.[0] || null)}
                className="block mt-2"
              />
            </label>
            <label className="block text-xs font-bold">
              เลือก PDF ฉบับแก้ไข
              <input
                aria-label="PDF ฉบับแก้ไข"
                type="file"
                accept=".pdf"
                onChange={(e) => setRevisionPdf(e.target.files?.[0] || null)}
                className="block mt-2"
              />
            </label>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1 font-mono">
              <div className="font-semibold text-blue-900 font-sans">ชื่อไฟล์ที่ตั้งอัตโนมัติ:</div>
              <div className="text-emerald-800">· {autoRevExcelName}</div>
              <div className="text-red-800">· {autoRevPdfName}</div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                บันทึกคำชี้แจงการแก้ไข (แจ้งผู้ตรวจ)
              </label>
              <textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                rows={3}
                placeholder="เช่น แก้ไขสูตรคะแนนเก็บในชีตที่ 2 และประเมินคุณลักษณะข้อ 4 เรียบร้อยแล้วครับ..."
                className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmRevision}
                disabled={isSubmittingRev || !revisionExcel || !revisionPdf}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{isSubmittingRev ? 'กำลังบันทึก...' : `ยืนยันการส่ง ${nextVerNumber}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificateModal && (
        <CertificateHashModal
          submission={submission}
          course={course}
          onClose={() => setShowCertificateModal(false)}
        />
      )}
    </div>
  );
};
