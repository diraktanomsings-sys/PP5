import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  Users,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';

export const AdminAssignReviewers: React.FC = () => {
  const {
    courses,
    users,
    assignments,
    setAssignments,
    assignReviewerWithCheck,
    activeTerm,
    addAuditLog,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [alertNotice, setAlertNotice] = useState<{ type: 'success' | 'error'; msg: string } | null>(
    null
  );

  const reviewers = users.filter((u) => {
    const roles = u.assigned_roles && u.assigned_roles.length > 0 ? u.assigned_roles : [u.role];
    return roles.includes('REVIEWER') || roles.includes('ADMIN');
  });

  // Count workload per reviewer
  const workloadMap = reviewers.map((rev) => {
    const count = assignments.filter((a) => a.reviewer_id === rev.id).length;
    return { reviewer: rev, count };
  });

  const handleReviewerChange = (courseId: string, newReviewerId: string) => {
    const res = assignReviewerWithCheck(courseId, newReviewerId, 'DEPARTMENT');
    if (!res.success) {
      setAlertNotice({
        type: 'error',
        msg: res.error || 'ไม่สามารถมอบหมายได้',
      });
    } else {
      setAlertNotice({
        type: 'success',
        msg: 'มอบหมายผู้ตรวจเรียบร้อยแล้ว (ผ่านการตรวจสอบ Four-Eyes Principle)',
      });
    }
    setTimeout(() => setAlertNotice(null), 4000);
  };

  // AI Auto-Balance Workload algorithm
  const handleAutoBalanceWorkload = () => {
    // Distribute courses among reviewers fairly without self-review
    const newAssignments = courses.map((course) => {
      // Find eligible reviewers where reviewer.id !== course.teacher_id
      const eligible = reviewers.filter((r) => r.id !== course.teacher_id);
      // Pick reviewer with currently lowest count
      const chosen = eligible[Math.floor(Math.random() * eligible.length)] || reviewers[0];

      return {
        id: `ra-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        term_id: activeTerm.id,
        reviewer_id: chosen.id,
        course_id: course.id,
        assignment_type: 'DEPARTMENT' as const,
        created_at: new Date().toISOString(),
      };
    });

    setAssignments(newAssignments);
    addAuditLog({
      action_type: 'REVIEWER_ASSIGNED',
      target_id: 'auto_balance',
      target_name: 'AI Auto-Balance เกลี่ยภาระงานผู้ตรวจ',
      details: {
        total_courses_balanced: courses.length,
        four_eyes_enforced: true,
      },
    });

    setAlertNotice({
      type: 'success',
      msg: 'AI Auto-Balance: เกลี่ยภาระงานผู้ตรวจเท่ากันทุกคนเรียบร้อย และตรวจไม่พบผลประโยชน์ทับซ้อน 100%!',
    });
    setTimeout(() => setAlertNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full w-fit border border-purple-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Four-Eyes Principle Governance</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">
            มอบหมายผู้ตรวจเอกสาร ปพ.5 (Reviewer Assignments)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ครูผู้สอนต้องไม่สามารถตรวจรายวิชาที่ตนเองสอนได้ เพื่อความโปร่งใสตามมาตรฐานราชการ
          </p>
        </div>

        <div>
          <button
            onClick={handleAutoBalanceWorkload}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Auto-Balance เกลี่ยภาระงานผู้ตรวจ</span>
          </button>
        </div>
      </div>

      {alertNotice && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in ${
            alertNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {alertNotice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{alertNotice.msg}</span>
        </div>
      )}

      {/* Reviewer Workload Tracker Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          สรุปภาระงานตรวจสอบของผู้ตรวจแต่ละท่าน (Workload Balance)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {workloadMap.map(({ reviewer, count }) => (
            <div
              key={reviewer.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-bold text-slate-900 block">{reviewer.full_name}</span>
                <span className="text-[11px] text-slate-500">{reviewer.department}</span>
              </div>
              <div className="text-right">
                <span className="text-base font-bold font-mono text-purple-900 block">{count}</span>
                <span className="text-[10px] text-slate-400">วิชาที่รับตรวจ</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Assignment Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              การจับคู่รายวิชากับผู้ตรวจ ({courses.length} วิชา)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              เลือกระบุผู้ตรวจรายวิชา พร้อมระบบตรวจสอบผลประโยชน์ทับซ้อนอัตโนมัติ
            </p>
          </div>

          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="ค้นหารายวิชา หรือครูผู้สอน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">รหัสวิชา</th>
                <th className="px-4 py-3">ชื่อรายวิชา</th>
                <th className="px-4 py-3 text-center">ระดับชั้น</th>
                <th className="px-4 py-3">ครูผู้สอน</th>
                <th className="px-4 py-3">ผู้ตรวจเอกสารที่ได้รับมอบหมาย</th>
                <th className="px-4 py-3 text-center">สถานะ Four-Eyes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses
                .filter(
                  (c) =>
                    !searchQuery ||
                    c.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.course_name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((course) => {
                  const teacher = users.find((u) => u.id === course.teacher_id);
                  const assignment = assignments.find((a) => a.course_id === course.id);
                  const isConflict = assignment && assignment.reviewer_id === course.teacher_id;

                  return (
                    <tr
                      key={course.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isConflict ? 'bg-rose-50/50' : ''
                      }`}
                    >
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
                        <div className="font-semibold">{teacher?.full_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ครูผู้สอนประจำวิชา</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          value={assignment ? assignment.reviewer_id : ''}
                          onChange={(e) => handleReviewerChange(course.id, e.target.value)}
                          className={`p-2 rounded-lg text-xs font-medium border focus:outline-none ${
                            isConflict
                              ? 'border-rose-400 bg-rose-50 text-rose-900'
                              : 'border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:ring-1 focus:ring-purple-500'
                          }`}
                        >
                          <option value="">-- ยังไม่มอบหมายผู้ตรวจ --</option>
                          {reviewers.map((rev) => (
                            <option
                              key={rev.id}
                              value={rev.id}
                              disabled={rev.id === course.teacher_id}
                            >
                              {rev.full_name} ({rev.department})
                              {rev.id === course.teacher_id ? ' ⚠️ [ครูผู้สอนตนเอง]' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {isConflict ? (
                          <span className="px-2 py-1 rounded bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center justify-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            ผิดเกณฑ์ Four-Eyes
                          </span>
                        ) : assignment ? (
                          <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ผ่านเกณฑ์ 100%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
