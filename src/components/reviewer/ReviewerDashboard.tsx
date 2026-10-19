import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Search,
  User,
  FolderUp,
  ExternalLink,
} from 'lucide-react';

export const ReviewerDashboard: React.FC = () => {
  const {
    currentUser,
    assignments,
    courses,
    submissions,
    users,
    setActiveView,
    setSelectedSubmissionId,
    activeTerm,
    organizationDriveUrl,
    organizationDriveFolderId,
  } = useApp();

  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Find assignments for this reviewer
  const myAssignedCourseIds = assignments
    .filter((a) => a.reviewer_id === currentUser.id)
    .map((a) => a.course_id);

  // Map courses with their submission and teacher info
  const assignedItems = courses
    .filter((c) => myAssignedCourseIds.includes(c.id))
    .map((c) => {
      const sub = submissions.find((s) => s.course_id === c.id);
      const teacher = users.find((u) => u.id === c.teacher_id);
      return { course: c, submission: sub, teacher };
    });

  // Filter items
  const filteredItems = assignedItems.filter(({ course, teacher }) => {
    if (selectedDept !== 'ALL' && course.department !== selectedDept) return false;
    if (selectedGrade !== 'ALL' && !course.grade_level.startsWith(selectedGrade)) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchCode = course.course_code.toLowerCase().includes(query);
      const matchName = course.course_name.toLowerCase().includes(query);
      const matchTeacher = teacher?.full_name.toLowerCase().includes(query);
      if (!matchCode && !matchName && !matchTeacher) return false;
    }
    return true;
  });

  // Queues
  const pendingQueue = filteredItems.filter(
    (i) => i.submission && i.submission.status === 'PENDING_REVIEW'
  );
  const rejectedQueue = filteredItems.filter(
    (i) => i.submission && i.submission.status === 'REJECTED_REVISION'
  );
  const completedQueue = filteredItems.filter(
    (i) =>
      i.submission &&
      (i.submission.status === 'PASSED_REVIEW' ||
        i.submission.status === 'PENDING_DIRECTOR' ||
        i.submission.status === 'FINAL_LOCKED')
  );

  return (
    <div className="space-y-6">
      {/* Reviewer Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-[#00236f] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-200 text-xs font-medium">
            <span className="px-2 py-0.5 rounded bg-purple-800/80 text-purple-100 font-mono">
              บทบาท: ผู้ตรวจเอกสาร (Four-Eyes Principle)
            </span>
            <span>·</span>
            <span>{currentUser.department}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1 text-white">
            คิวงานตรวจสอบ ปพ.5 — {currentUser.full_name}
          </h2>
          <p className="text-xs sm:text-sm text-purple-100 mt-1">
            ตรวจสอบความถูกต้องตามเกณฑ์หลักสูตร 4 ด้าน (คะแนนเก็บและปลายภาค, เวลาเรียน 80%, คุณลักษณะ 8 ข้อ, การอ่าน คิดวิเคราะห์)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">

          <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/20 text-xs text-white">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span className="font-semibold">Four-Eyes Principle</span>
            </div>
            <p className="text-[10px] text-purple-200 mt-0.5">
              ระบบป้องกันไม่ให้ผู้สอนตรวจเอกสารของตนเอง
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700">คิวงานรอตรวจ (In Queue)</span>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-700 font-mono mt-2">{pendingQueue.length}</div>
          <div className="text-[11px] text-blue-600 mt-1 font-medium">เล่มที่ส่งมาใหม่ รอรับการตรวจสอบ</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">ส่งกลับแก้ไขแล้ว (In Revision)</span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700 font-mono mt-2">{rejectedQueue.length}</div>
          <div className="text-[11px] text-rose-600 mt-1 font-medium">รอครูผู้สอนส่งเวอร์ชันใหม่</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">ตรวจผ่านรับรองแล้ว (Passed)</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-2">{completedQueue.length}</div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">ส่งต่อผู้บริหาร / อนุมัติสำเร็จ</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 flex items-center gap-1 font-medium">
            <Filter className="w-3.5 h-3.5" />
            กรองตาม:
          </span>

          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">ทุกระดับชั้น</option>
            <option value="ป.">ระดับประถมศึกษา (ป.1 - ป.6)</option>
            <option value="ม.">ระดับมัธยมศึกษา (ม.1 - ม.3)</option>
          </select>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
          >
            <option value="ALL">ทุกกลุ่มสาระการเรียนรู้</option>
            <option value="ภาษาไทย">ภาษาไทย</option>
            <option value="คณิตศาสตร์">คณิตศาสตร์</option>
            <option value="วิทยาศาสตร์และเทคโนโลยี">วิทยาศาสตร์และเทคโนโลยี</option>
            <option value="สังคมศึกษาฯ">สังคมศึกษาฯ</option>
            <option value="ภาษาต่างประเทศ">ภาษาต่างประเทศ</option>
            <option value="ศิลปะ">ศิลปะ</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหารหัสวิชา, ชื่อวิชา, ครูผู้สอน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 w-64"
          />
        </div>
      </div>

      {/* Review Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800">
            รายการเอกสารที่ได้รับมอบหมายให้ตรวจสอบ ({filteredItems.length} รายการ)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            คลิก "ตรวจเอกสาร" เพื่อเปิด Quick Viewer และประเมินเกณฑ์ 4 ด้าน
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">รหัสวิชา</th>
                <th className="px-4 py-3">ชื่อรายวิชา</th>
                <th className="px-4 py-3 text-center">ชั้น</th>
                <th className="px-4 py-3">ครูผู้สอน</th>
                <th className="px-4 py-3 text-center">เวอร์ชัน</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(({ course, submission, teacher }) => (
                <tr key={course.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-bold font-mono text-slate-900">
                    {course.course_code}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-800">
                    <div>{course.course_name}</div>
                    <div className="text-[11px] text-slate-400">กลุ่มสาระ{course.department}</div>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono font-medium text-slate-700">
                    {course.grade_level}
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">
                    <div className="font-medium">{teacher ? teacher.full_name : 'ไม่ระบุ'}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{teacher?.teacher_id}</div>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono">
                    {submission ? (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold">
                        {submission.versions[0]?.version_number || 'V001'}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {submission ? (
                      <StatusBadge status={submission.status} />
                    ) : (
                      <StatusBadge status="DRAFT" />
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {submission ? (
                      <button
                        onClick={() => {
                          setSelectedSubmissionId(submission.id);
                          setActiveView('reviewer/verify');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                          submission.status === 'PENDING_REVIEW'
                            ? 'bg-purple-700 hover:bg-purple-800 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>{submission.status === 'PENDING_REVIEW' ? 'ตรวจเอกสาร' : 'ดูผลการตรวจ'}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">ยังไม่ส่ง</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
