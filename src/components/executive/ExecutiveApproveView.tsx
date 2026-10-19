import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { WorkflowStepper } from '../common/WorkflowStepper';
import { StatusBadge } from '../common/StatusBadge';
import { GradeSheetSimulator } from '../common/GradeSheetSimulator';
import { SignatureCanvas } from '../common/SignatureCanvas';
import { CertificateHashModal } from '../common/CertificateHashModal';
import {
  ArrowLeft,
  Stamp,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Award,
  FileCheck,
  Calendar,
  FolderUp,
  ExternalLink,
} from 'lucide-react';

export const ExecutiveApproveView: React.FC = () => {
  const {
    selectedSubmissionId,
    submissions,
    courses,
    users,
    currentUser,
    setActiveView,
    approveSubmission,
    organizationDriveUrl,
    organizationDriveFolderId,
  } = useApp();

  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const submission =
    submissions.find((s) => s.id === selectedSubmissionId) ||
    submissions.find((s) => s.status === 'PENDING_DIRECTOR') ||
    submissions[0];

  const course = courses.find((c) => c.id === submission?.course_id);
  const teacher = users.find((u) => u.id === course?.teacher_id);
  const currentVer = submission?.versions[0];

  if (!course || !submission) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        ไม่พบข้อมูลเอกสาร กรุณากลับหน้าคิวงาน
      </div>
    );
  }

  const handleConfirmSignature = (signatureData: string) => {
    approveSubmission(submission.id, signatureData);
    setSuccessNotice(
      'ลงนาม e-Signature และประทับตราสถานศึกษาสำเร็จ! เอกสารถูกล็อกเล่มถาวร (FINAL_LOCKED) พร้อมสร้าง Digital Certificate Hash'
    );
  };

  return (
    <div className="space-y-6">
      {/* Top back & actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setActiveView('executive/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าคิวงานรอลงนาม</span>
        </button>

        <div className="flex items-center gap-2">
          <StatusBadge status={submission.status} size="lg" />
          {submission.status === 'FINAL_LOCKED' && (
            <button
              onClick={() => setShowCertificateModal(true)}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>เปิดใบรับรองดิจิทัล</span>
            </button>
          )}
        </div>
      </div>

      {successNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <span>{successNotice}</span>
            <div className="mt-2">
              <button
                onClick={() => setShowCertificateModal(true)}
                className="underline font-bold text-emerald-900"
              >
                คลิกที่นี่เพื่อดู Digital Hash และตราประทับรับรอง
              </button>
            </div>
          </div>
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
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono text-xs font-bold">
                {currentVer?.version_number || 'V001'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ครูผู้สอน: <span className="font-semibold text-slate-800">{teacher?.full_name}</span> ({teacher?.department})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full border border-rose-300 p-1 bg-white shadow-xs">
              <img
                src="/src/assets/images/official_digital_seal_1791394831777.jpg"
                alt="ตราประทับรับรองสถานศึกษา"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">เกรดเฉลี่ย (GPA):</span>
            <span className="font-bold text-slate-800 font-mono text-sm">
              {submission.average_gpa.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">อัตราผ่านเกณฑ์:</span>
            <span className="font-bold text-emerald-700 font-mono text-sm">
              {submission.pass_percentage.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">เวลาเรียนเฉลี่ย:</span>
            <span className="font-bold text-purple-700 font-mono text-sm">
              {submission.average_attendance_percentage.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">ผลการตรวจ 4 ด้าน:</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>ผ่าน 100% รับรองแล้ว</span>
            </span>
          </div>
        </div>
      </div>

      {/* Direct File Inspection Center */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-700" />
            <span>ศูนย์ตรวจสอบไฟล์ ปพ.5 ก่อนอนุมัติ (Pre-Approval File Inspection)</span>
          </span>
          <span className="text-xs text-slate-500 font-normal">
            *ตรวจสอบไฟล์จริง .xlsx / .pdf และผลการรับรองของผู้ตรวจทาน
          </span>
        </h3>
        <GradeSheetSimulator submission={submission} course={course} />
      </div>

      {/* Signature & Seal Area */}
      {submission.status !== 'FINAL_LOCKED' ? (
        <SignatureCanvas
          signerName={currentUser.full_name}
          signerPosition="ผู้อำนวยการโรงเรียนบ้านคูเมือง"
          onConfirm={handleConfirmSignature}
        />
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-emerald-950">
            เอกสารได้รับการอนุมัติและประทับตรา e-Signature เรียบร้อยแล้ว (FINAL_LOCKED)
          </h4>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">
            เอกสารถูกล็อกเล่มถาวร ป้องกันการแก้ไขย้อนหลังโดยเด็ดขาดตามมาตรฐาน Four-Eyes Principle และเก็บรักษาในคลัง ปพ.5 กลางของโรงเรียน
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowCertificateModal(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>ดูใบรับรอง & รหัสแฮชดิจิทัล (SHA-256)</span>
            </button>
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
