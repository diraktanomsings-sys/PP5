import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { WorkflowStepper } from '../common/WorkflowStepper';
import { StatusBadge } from '../common/StatusBadge';
import { GradeSheetSimulator } from '../common/GradeSheetSimulator';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Upload,
  Check,
  Paperclip,
  Clock,
  Sparkles,
  FolderUp,
  ExternalLink,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';

export const ReviewerVerifyView: React.FC = () => {
  const {
    selectedSubmissionId,
    submissions,
    courses,
    users,
    currentUser,
    setActiveView,
    reviewSubmission,
    organizationDriveUrl,
    organizationDriveFolderId,
  } = useApp();

  const submission =
    submissions.find((s) => s.id === selectedSubmissionId) ||
    submissions.find((s) => s.status === 'PENDING_REVIEW') ||
    submissions[0];

  const course = courses.find((c) => c.id === submission?.course_id);
  const teacher = users.find((u) => u.id === course?.teacher_id);
  const currentVer = submission?.versions[0];

  // 4 Checklist state
  const [ratioOk, setRatioOk] = useState(false);
  const [attendanceOk, setAttendanceOk] = useState(false);
  const [traitsOk, setTraitsOk] = useState(false);
  const [readingOk, setReadingOk] = useState(false);

  // Reviewer Remarks when passing
  const [reviewerCommendation, setReviewerCommendation] = useState(
    'ตรวจสอบไฟล์ต้นฉบับตามเกณฑ์ทั้ง 4 ด้านแล้ว',
  );

  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [annotatedFile, setAnnotatedFile] = useState<File | null>(null);
  const [annotatedFileName, setAnnotatedFileName] = useState(
    course
      ? `คอมเมนต์ตรวจ_ปพ5_${course.course_code}_${currentVer?.version_number}_highlighted.pdf`
      : '',
  );

  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  if (!course || !submission) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        ไม่พบข้อมูลเอกสาร กรุณากลับหน้าคิวงาน
      </div>
    );
  }

  // Four-Eyes Principle: Instructor cannot review own course
  const isSelfReview = course.teacher_id === currentUser.id;
  const allPillarsChecked = ratioOk && attendanceOk && traitsOk && readingOk && !isSelfReview;

  const handleSetAllChecks = (status: boolean) => {
    setRatioOk(status);
    setAttendanceOk(status);
    setTraitsOk(status);
    setReadingOk(status);
  };

  const handlePassReview = async () => {
    if (
      !(await reviewSubmission(
        submission.id,
        true,
        [ratioOk, attendanceOk, traitsOk, readingOk],
        reviewerCommendation || 'ตรวจไฟล์ต้นฉบับครบทั้ง 4 ด้านแล้ว',
      ))
    )
      return;
    setReviewSuccessMsg('รับรองเอกสารและบันทึกผลตรวจเรียบร้อยแล้ว');
    setActiveView('reviewer/dashboard');
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !(await reviewSubmission(
        submission.id,
        false,
        [ratioOk, attendanceOk, traitsOk, readingOk],
        rejectReason,
        annotatedFile || undefined,
      ))
    )
      return;
    setShowRejectModal(false);
    setActiveView('reviewer/dashboard');
  };

  return (
    <div className="space-y-6">
      {/* Top back & actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setActiveView('reviewer/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าคิวงานผู้ตรวจ</span>
        </button>

        <div className="flex items-center gap-2">
          <StatusBadge status={submission.status} size="lg" />
        </div>
      </div>

      {reviewSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{reviewSuccessMsg}</span>
        </div>
      )}

      {/* 6-Step Workflow Stepper */}
      <WorkflowStepper status={submission.status} currentVersion={submission.current_version} />

      {/* Header Info Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {course.course_code} {course.course_name}
              </h2>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold font-mono text-xs">
                {course.grade_level}
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-mono text-xs font-bold">
                {currentVer?.version_number || 'V001'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ครูผู้สอน: <span className="font-semibold text-slate-800">{teacher?.full_name}</span>{' '}
              ({teacher?.department})
            </p>
          </div>

          <div className="text-right text-xs">
            <span className="text-slate-400 block text-[11px]">เวลาที่ส่งเอกสาร:</span>
            <span className="font-semibold text-slate-700 font-mono">
              {currentVer?.submitted_at
                ? new Date(currentVer.submitted_at).toLocaleString('th-TH')
                : '-'}
            </span>
          </div>
        </div>

        {/* Prior Version Defect Highlight if multiple versions */}
        {submission.versions.length > 1 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">
                เอกสารนี้ได้รับการแก้ไขมาจากรอบก่อนหน้า ({submission.versions[1].version_number}):
              </span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                ข้อบกพร่องเดิมที่ตรวจพบ: "{submission.versions[1].reviewer_notes}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Direct File Inspection Center */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-700" />
            <span>ศูนย์ตรวจทานไฟล์ ปพ.5 โดยตรง (Direct File & Document Inspection)</span>
          </span>
          <span className="text-xs text-slate-500 font-normal">
            *ผู้ตรวจสามารถเปิดตรวจจากไฟล์ .xlsx และ .pdf ที่ครูแนบมาได้โดยตรง
          </span>
        </h3>
        <GradeSheetSimulator submission={submission} course={course} />
      </div>

      {/* 4-Pillar Evaluation Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              แบบประเมินและรับรองเกณฑ์มาตรฐาน 4 ด้าน (Reviewer Assessment Checklist)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              ผู้ตรวจต้องยืนยันความถูกต้องทั้ง 4 ด้านตามเกณฑ์ระเบียบวัดผลก่อนกดรับรองเอกสาร
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetAllChecks(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
              title="ตั้งค่าทุกข้อเป็นผ่านเกณฑ์ทันทีหลังจากตรวจไฟล์ใน Drive แล้ว"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>ผ่านทุกข้อ</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetAllChecks(false)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded text-[11px] font-medium transition-colors cursor-pointer"
              title="รีเซ็ตผลการเลือก"
            >
              <RotateCcw className="w-3 h-3" />
              <span>รีเซ็ต</span>
            </button>
            <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200">
              Four-Eyes Principle
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
            <div>
              <div className="text-xs font-bold text-slate-900">
                1. ความครบถ้วนถูกต้องของการวัดและประเมินผลคะแนน
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                คะแนนรวม 100 คะแนน การตัดเกรด 0 - 4 ถูกต้องตามระเบียบวัดผลและสูตรคำนวณในชีต
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ratioOk}
                onChange={(e) => setRatioOk(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span
                className={`text-xs font-semibold ${ratioOk ? 'text-emerald-700' : 'text-slate-400'}`}
              >
                {ratioOk ? 'ผ่านเกณฑ์' : 'ไม่ผ่าน'}
              </span>
            </label>
          </div>

          <div className="flex items-start justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
            <div>
              <div className="text-xs font-bold text-slate-900">
                2. เกณฑ์เวลาเรียน (ไม่ต่ำกว่า 80%)
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                เวลาเรียนเฉลี่ยและรายบุคคลไม่ต่ำกว่า 80% ไม่มีนักเรียนติด มส. หรือดำเนินการแก้ไขแล้ว
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={attendanceOk}
                onChange={(e) => setAttendanceOk(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span
                className={`text-xs font-semibold ${attendanceOk ? 'text-emerald-700' : 'text-slate-400'}`}
              >
                {attendanceOk ? 'ผ่านเกณฑ์' : 'ไม่ผ่าน'}
              </span>
            </label>
          </div>

          <div className="flex items-start justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
            <div>
              <div className="text-xs font-bold text-slate-900">
                3. คุณลักษณะอันพึงประสงค์ 8 ประการ
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ประเมินครบทั้ง 8 ข้อ ทุกคนในชั้นเรียน ไม่เว้นช่องว่าง
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={traitsOk}
                onChange={(e) => setTraitsOk(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span
                className={`text-xs font-semibold ${traitsOk ? 'text-emerald-700' : 'text-slate-400'}`}
              >
                {traitsOk ? 'ผ่านเกณฑ์' : 'ไม่ผ่าน'}
              </span>
            </label>
          </div>

          <div className="flex items-start justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50/70">
            <div>
              <div className="text-xs font-bold text-slate-900">
                4. การประเมินการอ่าน คิดวิเคราะห์ และเขียน
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                สรุปผลการประเมินการอ่าน คิดวิเคราะห์ และเขียนครบถ้วนตามเกณฑ์มาตรฐาน
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={readingOk}
                onChange={(e) => setReadingOk(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span
                className={`text-xs font-semibold ${readingOk ? 'text-emerald-700' : 'text-slate-400'}`}
              >
                {readingOk ? 'ผ่านเกณฑ์' : 'ไม่ผ่าน'}
              </span>
            </label>
          </div>
        </div>

        {/* Four-Eyes Violation Notice if applicable */}
        {isSelfReview && (
          <div className="mt-6 p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-950">
                Four-Eyes Principle บังคับใช้: ไม่อนุญาตให้ผู้สอนตรวจเอกสารของตนเอง
              </p>
              <p className="text-[11px] text-rose-800 mt-1">
                ระบบตรวจพบว่าคุณ ({currentUser.full_name}) เป็นผู้สอนประจำวิชา {course.course_code}{' '}
                {course.course_name} นี้
                จึงไม่สามารถดำเนินการตรวจรับรองหรือส่งกลับแก้ไขได้ตามมาตรฐานธรรมาภิบาลข้อมูลของ สพป.
              </p>
            </div>
          </div>
        )}

        {/* Reviewer remarks / commendations */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            ข้อสังเกตหรือคำชี้แจงของผู้ตรวจทาน (บันทึกรับรองส่งเสนอ ผอ.)
          </label>
          <textarea
            value={reviewerCommendation}
            onChange={(e) => setReviewerCommendation(e.target.value)}
            rows={2}
            className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50/50"
            placeholder="ระบุความเห็น เช่น ตรวจสอบไฟล์ผลการเรียนเรียบร้อยแล้ว คะแนนครบถ้วนและเวลาเรียนถูกต้อง..."
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isSelfReview}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${
              isSelfReview
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 cursor-pointer'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>ส่งกลับแก้ไข (Reject {currentVer?.version_number || 'V001'})</span>
          </button>

          <button
            onClick={handlePassReview}
            disabled={!allPillarsChecked || isSelfReview}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
              allPillarsChecked && !isSelfReview
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>รับรองความถูกต้องครบ 100% (Pass Review)</span>
          </button>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>ส่งกลับแก้ไข ปพ.5 ({currentVer?.version_number || 'V001'})</span>
              </h4>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              ระบุข้อบกพร่องที่ตรวจพบอย่างละเอียด เพื่อให้ครูผู้สอนสามารถแก้ไขได้อย่างถูกต้อง
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                รายละเอียดจุดบกพร่องที่ต้องแก้ไข *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                แนบไฟล์ PDF ที่ไฮไลต์คอมเมนต์จุดผิด (Annotated File)
              </label>
              <div className="flex items-center gap-2 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <Paperclip className="w-4 h-4 text-slate-500" />
                <span className="font-mono text-slate-700 truncate">{annotatedFileName}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>ยืนยันการส่งกลับแก้ไข</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
