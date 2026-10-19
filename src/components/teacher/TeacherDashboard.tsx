import React from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  BookOpen,
  Clock,
  AlertCircle,
  CheckCircle2,
  Upload,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Sparkles,
  FolderUp,
  ExternalLink,
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const {
    currentUser,
    courses,
    submissions,
    assignments,
    users,
    setActiveView,
    setSelectedSubmissionId,
    activeTerm,
    organizationDriveUrl,
    organizationDriveFolderId,
  } = useApp();

  // Filter courses taught by this teacher
  const myCourses = courses.filter(
    (c) => c.teacher_id === currentUser.id && c.term_id === activeTerm.id,
  );

  // Match each course with its submission
  const courseItems = myCourses.map((c) => {
    const sub = submissions.find((s) => s.course_id === c.id);
    const assignment = assignments.find((a) => a.course_id === c.id);
    const reviewer = assignment ? users.find((u) => u.id === assignment.reviewer_id) : null;
    return {
      course: c,
      submission: sub,
      reviewer,
    };
  });

  // Calculate stats
  const totalCourses = myCourses.length;
  const pendingReview = courseItems.filter(
    (item) => item.submission && item.submission.status === 'PENDING_REVIEW',
  ).length;
  const needsRevision = courseItems.filter(
    (item) => item.submission && item.submission.status === 'REJECTED_REVISION',
  ).length;
  const finalLocked = courseItems.filter(
    (item) => item.submission && item.submission.status === 'FINAL_LOCKED',
  ).length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#00236f] to-blue-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-200 text-xs font-medium">
            <span className="px-2 py-0.5 rounded bg-blue-800/80 text-blue-100 font-mono">
              รหัสครู: {currentUser.teacher_id}
            </span>
            <span>·</span>
            <span>{currentUser.department}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1 text-white">
            สวัสดี, {currentUser.full_name}
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-1">
            ยินดีต้อนรับสู่ระบบส่งและตรวจสอบ ปพ.5 ออนไลน์ ประจำปีการศึกษา {activeTerm.year}{' '}
            ภาคเรียนที่ {activeTerm.semester}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveView('teacher/submit')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-[1.02]"
          >
            <Upload className="w-4 h-4" />
            <span>+ ส่งไฟล์ ปพ.5 ใหม่</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">วิชาที่รับผิดชอบทั้งหมด</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-2">{totalCourses}</div>
          <div className="text-[11px] text-slate-400 mt-1">รายวิชาในภาคเรียนปัจจุบัน</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">รอการตรวจสอบ</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-700 font-mono mt-2">{pendingReview}</div>
          <div className="text-[11px] text-blue-600 mt-1">อยู่ในคิวของผู้ตรวจตามเกณฑ์</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">ต้องแก้ไข (Needs Revision)</span>
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-700 font-mono mt-2">{needsRevision}</div>
          <div className="text-[11px] text-rose-600 mt-1 font-medium">
            ตรวจพบจุดบกพร่องที่ต้องแก้
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              อนุมัติสำเร็จ (Final Locked)
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-2">{finalLocked}</div>
          <div className="text-[11px] text-emerald-600 mt-1">ลงนาม e-Signature และล็อกเล่มแล้ว</div>
        </div>
      </div>

      {/* Action Guidance: สิ่งที่ครูต้องทำ */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>คำแนะนำ: สิ่งที่ครูต้องทำในรอบการประเมินนี้</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            กำหนดส่งเอกสาร: {new Date(activeTerm.submission_deadline).toLocaleDateString('th-TH')}
          </span>
        </div>

        <div className="space-y-2.5">
          {needsRevision > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-rose-900">
                    ด่วน: วิชา ท13101 ภาษาไทย 3 (ป.3/1) ถูกส่งกลับแก้ไข
                  </p>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    ผู้ตรวจ (ครูกิตติศักดิ์) แจ้งว่า:
                    ความครบถ้วนของคะแนนและแบบประเมินคุณลักษณะอันพึงประสงค์ยังไม่ครบ
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const rejectedSub = courseItems.find(
                    (i) => i.submission?.status === 'REJECTED_REVISION',
                  )?.submission;
                  if (rejectedSub) {
                    setSelectedSubmissionId(rejectedSub.id);
                    setActiveView('teacher/detail');
                  }
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                ดูข้อบกพร่อง & อัปโหลด V002
              </button>
            </div>
          )}

          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                ยังเหลือรายวิชาที่ยังไม่ได้ส่งแบบสมบูรณ์: ตรวจสอบความถูกต้องของคะแนนเก็บและคุณลักษณะ
                8 ประการก่อนส่ง
              </span>
            </div>
            <button
              onClick={() => setActiveView('teacher/submit')}
              className="text-blue-700 hover:text-blue-900 font-semibold underline text-xs"
            >
              ส่งเล่มที่ค้าง
            </button>
          </div>
        </div>
      </div>

      {/* Courses List Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              รายการรายวิชาที่รับผิดชอบ ({courseItems.length} รายวิชา)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ติดตามสถานะการส่งเอกสาร ปพ.5 และผลการตรวจรับรอง
            </p>
          </div>
          <button
            onClick={() => setActiveView('teacher/submit')}
            className="px-3 py-1.5 bg-[#00236f] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>ส่ง ปพ.5 เพิ่มเติม</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">รหัสวิชา</th>
                <th className="px-4 py-3">ชื่อรายวิชา</th>
                <th className="px-4 py-3 text-center">ระดับชั้น</th>
                <th className="px-4 py-3 text-center">เวอร์ชัน</th>
                <th className="px-4 py-3">สถานะเอกสาร</th>
                <th className="px-4 py-3">ผู้ตรวจ (Four-Eyes)</th>
                <th className="px-4 py-3 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courseItems.map(({ course, submission, reviewer }) => (
                <tr key={course.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-bold font-mono text-slate-900">
                    {course.course_code}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-800">
                    <div>{course.course_name}</div>
                    <div className="text-[11px] text-slate-400">{course.department}</div>
                  </td>
                  <td className="px-4 py-3.5 text-center font-mono font-medium text-slate-700">
                    {course.grade_level}
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
                  <td className="px-4 py-3.5 text-slate-700">
                    {reviewer ? (
                      <div>
                        <div className="font-medium">{reviewer.full_name}</div>
                        <div className="text-[10px] text-slate-400">{reviewer.department}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400">ยังไม่ระบุ</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {submission ? (
                        <button
                          onClick={() => {
                            setSelectedSubmissionId(submission.id);
                            setActiveView('teacher/detail');
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>ดูรายละเอียด</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveView('teacher/submit')}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>ส่งไฟล์คู่</span>
                        </button>
                      )}
                    </div>
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
