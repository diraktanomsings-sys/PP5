import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminSchoolLogoModal } from './AdminSchoolLogoModal';
import {
  Users,
  BookOpen,
  Calendar,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  Layers,
  Archive,
  FolderUp,
  ExternalLink,
  KeyRound,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    courses,
    submissions,
    users,
    assignments,
    activeTerm,
    setActiveView,
    setSelectedSubmissionId,
    organizationDriveUrl,
    organizationDriveFolderId,
    schoolLogoUrl,
    hasCustomLogo,
    removeSchoolLogo,
  } = useApp();

  const [showLogoModal, setShowLogoModal] = useState(false);

  // Workflow Bottleneck Analysis
  // 1. Stuck at Teacher (DRAFT or REJECTED_REVISION)
  const teacherBottlenecks = courses
    .map((c) => {
      const sub = submissions.find((s) => s.course_id === c.id);
      const teacher = users.find((u) => u.id === c.teacher_id);
      return { course: c, sub, teacher };
    })
    .filter(
      (item) => !item.sub || item.sub.status === 'DRAFT' || item.sub.status === 'REJECTED_REVISION'
    );

  // 2. Stuck at Reviewer (PENDING_REVIEW)
  const reviewerBottlenecks = submissions
    .filter((s) => s.status === 'PENDING_REVIEW')
    .map((s) => {
      const course = courses.find((c) => c.id === s.course_id);
      const assignment = assignments.find((a) => a.course_id === s.course_id);
      const reviewer = users.find((u) => u.id === assignment?.reviewer_id);
      const teacher = users.find((u) => u.id === course?.teacher_id);
      return { submission: s, course, reviewer, teacher };
    });

  // 3. Stuck at Executive (PENDING_DIRECTOR)
  const directorBottlenecks = submissions
    .filter((s) => s.status === 'PENDING_DIRECTOR')
    .map((s) => {
      const course = courses.find((c) => c.id === s.course_id);
      const teacher = users.find((u) => u.id === course?.teacher_id);
      return { submission: s, course, teacher };
    });

  const finalLockedCount = submissions.filter((s) => s.status === 'FINAL_LOCKED').length;

  return (
    <div className="space-y-6">
      {/* Admin Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-300 text-xs font-medium">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
              ผู้ดูแลระบบส่วนกลาง (Central Admin Console)
            </span>
            <span>·</span>
            <span>ปีการศึกษา {activeTerm.year} / {activeTerm.semester}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1 text-white">
            ศูนย์ควบคุมระบบ ปพ.5 ออนไลน์ โรงเรียนบ้านคูเมือง
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            วิเคราะห์คอขวดของกระบวนการส่งงาน (Workflow Bottleneck Tracker) และกำกับดูแลธรรมาภิบาลข้อมูล
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowLogoModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ring-1 ring-amber-300/50"
            title="เพิ่ม หรือ ลบภาพตราสัญลักษณ์โรงเรียนด้วยตนเอง"
          >
            <ImageIcon className="w-3.5 h-3.5 text-white" />
            <span>จัดการตราโรงเรียน (เพิ่ม/ลบ)</span>
          </button>
          <a
            href={organizationDriveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            title="เปิดโฟลเดอร์ Google Drive รวมองค์กร"
          >
            <FolderUp className="w-3.5 h-3.5 text-emerald-200" />
            <span>Google Drive องค์กร</span>
            <ExternalLink className="w-3 h-3 text-emerald-200" />
          </a>
          <button
            onClick={() => setActiveView('admin/users')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            title="จัดการข้อมูลบุคลากร สิทธิ์ และรหัสผ่าน"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-300" />
            <span>จัดการบุคลากร & รหัสผ่าน</span>
          </button>
          <button
            onClick={() => setActiveView('admin/calendar')}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>ขยายเวลา Deadline</span>
          </button>
          <button
            onClick={() => setActiveView('admin/assign-reviewers')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Four-Eyes ตรวจสอบผู้ตรวจ</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">รายวิชาเปิดสอนทั้งหมด</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-2">{courses.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">วิชาในภาคเรียน {activeTerm.semester}/{activeTerm.year}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">บุคลากรครูและผู้ตรวจ</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-900 font-mono mt-2">{users.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">ผู้ใช้งานในระบบทั้งหมด</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">ผ่านการอนุมัติ (Final Locked)</span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-800 font-mono mt-2">{finalLockedCount}</div>
          <div className="text-[11px] text-emerald-600 mt-1">
            ความคืบหน้า {courses.length > 0 ? ((finalLockedCount / courses.length) * 100).toFixed(0) : 0}%
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">งานติดคอขวด (Bottlenecks)</span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700 font-mono mt-2">
            {teacherBottlenecks.length + reviewerBottlenecks.length + directorBottlenecks.length}
          </div>
          <div className="text-[11px] text-rose-600 mt-1">กำลังดำเนินการในแต่ละสเต็ป</div>
        </div>
      </div>

      {/* School Emblem Management Banner Card (Item 1) */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-2xl p-5 text-white border border-blue-400/30 shadow-md flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            <img
              src={schoolLogoUrl}
              alt="ตราโรงเรียนบ้านคูเมือง"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                ตราประจำโรงเรียนบ้านคูเมือง (School Crest & Emblem)
              </span>
              {hasCustomLogo ? (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-bold border border-blue-400/40">
                  ● ตราที่แอดมินอัปโหลดเอง
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-600">
                  ● ตราสัญลักษณ์มาตรฐาน
                </span>
              )}
            </div>
            <p className="text-xs text-blue-200/80 leading-relaxed">
              ภาพตราสัญลักษณ์นี้จะถูกนำไปใช้ในทุกหน้าของระบบ ทั้งหน้าเข้าสู่ระบบ, เมนูด้านข้าง, สมุด ปพ.5 ดิจิทัล และใบล็อกเล่มทางการ
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
          {hasCustomLogo && (
            <button
              onClick={() => removeSchoolLogo()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="ลบตราที่กำหนดเองและคืนค่าตรามาตรฐาน"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>ลบ/คืนค่าเริ่มต้น</span>
            </button>
          )}
          <button
            onClick={() => setShowLogoModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-amber-300" />
            <span>{hasCustomLogo ? 'เปลี่ยนภาพตราใหม่' : 'เพิ่มภาพตราโรงเรียน'}</span>
          </button>
        </div>
      </div>

      {/* Workflow Bottleneck Tracker */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-600" />
              <span>Workflow Bottleneck Tracker (วิเคราะห์งานติดค้างอยู่ที่ใคร)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ติดตามตรวจสอบสถานะรายวิชาแบบเรียลไทม์เพื่อเร่งรัดการจัดทำเอกสารตามกำหนดเวลา
            </p>
          </div>
          <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded">
            Live Queue Monitor
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Stuck at Teacher */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>1. รอครูส่ง / กำลังแก้ไข ({teacherBottlenecks.length})</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                TEACHER
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {teacherBottlenecks.map(({ course, sub, teacher }) => (
                <div key={course.id} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 font-mono">{course.course_code}</span>
                    <span className="text-[11px] font-mono text-slate-500">{course.grade_level}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 truncate mt-0.5">{course.course_name}</div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                    <span>ครู: {teacher?.full_name}</span>
                    {sub?.status === 'REJECTED_REVISION' ? (
                      <span className="text-rose-600 font-bold">รอแก้ V002</span>
                    ) : (
                      <span className="text-slate-400">ยังไม่เริ่มส่ง</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Stuck at Reviewer */}
          <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/30">
            <div className="flex items-center justify-between pb-2 border-b border-purple-200">
              <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>2. ติดอยู่ที่ผู้ตรวจ ({reviewerBottlenecks.length})</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                REVIEWER
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {reviewerBottlenecks.map(({ submission, course, reviewer, teacher }) => {
                if (!course) return null;
                return (
                  <div key={submission.id} className="p-2.5 bg-white rounded-lg border border-purple-200 text-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 font-mono">{course.course_code}</span>
                      <span className="text-[11px] font-mono text-purple-700 font-bold">
                        {submission.versions[0]?.version_number || 'V001'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 truncate mt-0.5">{course.course_name}</div>
                    <div className="text-[10px] text-purple-900 mt-1 flex items-center justify-between font-medium">
                      <span>ผู้ตรวจ: {reviewer ? reviewer.full_name : 'ยังไม่มอบหมาย'}</span>
                      <button
                        onClick={() => {
                          setSelectedSubmissionId(submission.id);
                          setActiveView('reviewer/verify');
                        }}
                        className="underline text-purple-700 hover:text-purple-900 cursor-pointer"
                      >
                        เร่งรัด
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 3: Stuck at Director */}
          <div className="border border-amber-200 rounded-xl p-4 bg-amber-50/30">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>3. รอ ผอ. ลงนาม ({directorBottlenecks.length})</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                EXECUTIVE
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {directorBottlenecks.map(({ submission, course, teacher }) => {
                if (!course) return null;
                return (
                  <div key={submission.id} className="p-2.5 bg-white rounded-lg border border-amber-200 text-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 font-mono">{course.course_code}</span>
                      <span className="text-[11px] font-mono text-amber-800 font-bold">ผ่านตรวจแล้ว</span>
                    </div>
                    <div className="text-[11px] text-slate-600 truncate mt-0.5">{course.course_name}</div>
                    <div className="text-[10px] text-amber-900 mt-1 flex items-center justify-between">
                      <span>ครู: {teacher?.full_name}</span>
                      <button
                        onClick={() => {
                          setSelectedSubmissionId(submission.id);
                          setActiveView('executive/approve');
                        }}
                        className="underline text-amber-800 font-semibold hover:text-amber-950 cursor-pointer"
                      >
                        ไปหน้าลงนาม
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Admin School Logo Manager Modal */}
      <AdminSchoolLogoModal
        isOpen={showLogoModal}
        onClose={() => setShowLogoModal(false)}
      />
    </div>
  );
};
