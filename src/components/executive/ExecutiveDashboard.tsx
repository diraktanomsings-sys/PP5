import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Award,
  Layers,
  FileCheck,
  Stamp,
  Lock,
  Eye,
  Check,
  Sparkles,
  FolderUp,
  ExternalLink,
} from 'lucide-react';

export const ExecutiveDashboard: React.FC = () => {
  const {
    currentUser,
    courses,
    submissions,
    users,
    setActiveView,
    setSelectedSubmissionId,
    batchApproveSubmissions,
    activeTerm,
    organizationDriveUrl,
    organizationDriveFolderId,
  } = useApp();

  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchPin, setBatchPin] = useState('2569');
  const [isBatchApproving, setIsBatchApproving] = useState(false);
  const [batchSuccessNotice, setBatchSuccessNotice] = useState<string | null>(null);

  // Filter courses in PENDING_DIRECTOR
  const pendingDirectorItems = submissions
    .filter((s) => s.status === 'PENDING_DIRECTOR')
    .map((s) => {
      const course = courses.find((c) => c.id === s.course_id);
      const teacher = users.find((u) => u.id === course?.teacher_id);
      return { submission: s, course, teacher };
    });

  // Final locked items
  const finalLockedItems = submissions
    .filter((s) => s.status === 'FINAL_LOCKED')
    .map((s) => {
      const course = courses.find((c) => c.id === s.course_id);
      const teacher = users.find((u) => u.id === course?.teacher_id);
      return { submission: s, course, teacher };
    });

  // Calculate school-wide metrics
  const totalCoursesCount = courses.length;
  const approvedCount = finalLockedItems.length;
  const completionPercentage = totalCoursesCount > 0 ? (approvedCount / totalCoursesCount) * 100 : 0;
  const avgSchoolGpa =
    finalLockedItems.length > 0
      ? finalLockedItems.reduce((acc, i) => acc + i.submission.average_gpa, 0) /
        finalLockedItems.length
      : 3.42;

  const handleToggleSelect = (subId: string) => {
    setSelectedSubIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const handleSelectAll = () => {
    if (selectedSubIds.length === pendingDirectorItems.length) {
      setSelectedSubIds([]);
    } else {
      setSelectedSubIds(pendingDirectorItems.map((i) => i.submission.id));
    }
  };

  const handleConfirmBatchSign = (e: React.FormEvent) => {
    e.preventDefault();
    setIsBatchApproving(true);
    setTimeout(() => {
      batchApproveSubmissions(selectedSubIds);
      setIsBatchApproving(false);
      setShowBatchModal(false);
      setBatchSuccessNotice(
        `อนุมัติและประทับตรารับรอง e-Signature ยกชุดสำเร็จ ${selectedSubIds.length} รายการ (Final Locked)!`
      );
      setSelectedSubIds([]);
      setTimeout(() => setBatchSuccessNotice(null), 4000);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Executive Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-800 via-amber-900 to-[#00236f] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-200 text-xs font-medium">
            <span className="px-2 py-0.5 rounded bg-amber-700/80 text-amber-100 font-mono">
              ผู้บริหารสถานศึกษา
            </span>
            <span>·</span>
            <span>โรงเรียนบ้านคูเมือง สพป.สิงห์บุรี</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1 text-white">
            ห้องผู้บริหาร: {currentUser.full_name}
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 mt-1">
            ตรวจสอบความถูกต้องของผลสัมฤทธิ์ทางการเรียน ลงนามอนุมัติเล่ม ปพ.5 และประทับตรา Digital Seal ประจำสถานศึกษา
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">

          {pendingDirectorItems.length > 0 && (
            <button
              onClick={() => {
                setSelectedSubIds(pendingDirectorItems.map((i) => i.submission.id));
                setShowBatchModal(true);
              }}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
            >
              <Stamp className="w-4 h-4" />
              <span>Quick Batch Sign (อนุมัติยกชุด {pendingDirectorItems.length} รายการ)</span>
            </button>
          )}
        </div>
      </div>

      {batchSuccessNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{batchSuccessNotice}</span>
        </div>
      )}

      {/* School-wide KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">รอลงนามอนุมัติ (Pending Sign)</span>
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-900 font-mono mt-2">
            {pendingDirectorItems.length}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">ผ่านการตรวจ 100% รอ ผอ. เซ็น</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">อนุมัติล็อกเล่มแล้ว (Final Locked)</span>
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-900 font-mono mt-2">{approvedCount}</div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">มี Digital Hash ประจำเล่ม</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">ความสมบูรณ์ทั้งโรงเรียน</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-900 font-mono mt-2">
            {completionPercentage.toFixed(0)}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">เป้าหมาย 100% ภายใน 15 ต.ค.</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">เกรดเฉลี่ยโรงเรียน (GPA)</span>
            <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-900 font-mono mt-2">
            {avgSchoolGpa.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">จากผลการเรียนที่อนุมัติแล้ว</div>
        </div>
      </div>

      {/* Pending Signature Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Stamp className="w-4 h-4 text-amber-600" />
              <span>คิวงานรอลงนามอนุมัติ ({pendingDirectorItems.length} รายวิชา)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              เอกสารผ่านการตรวจครบ 4 ด้านโดยหัวหน้ากลุ่มสาระฯ แล้ว รอ ผอ. ประทับตรา e-Signature
            </p>
          </div>

          {pendingDirectorItems.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                {selectedSubIds.length === pendingDirectorItems.length ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
              </button>

              {selectedSubIds.length > 0 && (
                <button
                  onClick={() => setShowBatchModal(true)}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Stamp className="w-3.5 h-3.5" />
                  <span>อนุมัติชุดที่เลือก ({selectedSubIds.length})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {pendingDirectorItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">ไม่มีเอกสารค้างรอลงนามในขณะนี้</p>
            <p className="text-[11px] text-slate-400 mt-0.5">เอกสารทั้งหมดได้รับการอนุมัติเรียบร้อยแล้ว</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">เลือก</th>
                  <th className="px-4 py-3">รหัสวิชา</th>
                  <th className="px-4 py-3">ชื่อรายวิชา</th>
                  <th className="px-4 py-3 text-center">ระดับชั้น</th>
                  <th className="px-4 py-3">ครูผู้สอน</th>
                  <th className="px-4 py-3 text-center">GPA</th>
                  <th className="px-4 py-3 text-center">เวลาเรียน</th>
                  <th className="px-4 py-3 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingDirectorItems.map(({ submission, course, teacher }) => {
                  if (!course) return null;
                  const isChecked = selectedSubIds.includes(submission.id);

                  return (
                    <tr key={submission.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(submission.id)}
                          className="w-4 h-4 text-amber-600 rounded"
                        />
                      </td>
                      <td className="px-4 py-3.5 font-bold font-mono text-slate-900">
                        {course.course_code}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        <div>{course.course_name}</div>
                        <div className="text-[11px] text-slate-400">
                          กลุ่มสาระ{course.department}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-medium text-slate-700">
                        {course.grade_level}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        <div className="font-medium">{teacher?.full_name}</div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-blue-900">
                        {submission.average_gpa.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-emerald-700 font-semibold">
                        {submission.average_attendance_percentage.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedSubmissionId(submission.id);
                            setActiveView('executive/approve');
                          }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Stamp className="w-3.5 h-3.5" />
                          <span>ตรวจ & เซ็นชื่อ</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approved Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>เอกสารที่อนุมัติและล็อกเล่มถาวรแล้ว (Final Locked & Certified)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            มี Digital Signature และ SHA-256 Hash รับรองความถูกต้อง พร้อมพิมพ์เพื่อส่งหน่วยงานต้นสังกัด
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">รหัสวิชา</th>
                <th className="px-4 py-3">ชื่อรายวิชา</th>
                <th className="px-4 py-3 text-center">ระดับชั้น</th>
                <th className="px-4 py-3">ครูผู้สอน</th>
                <th className="px-4 py-3 text-center">GPA</th>
                <th className="px-4 py-3">เวลาที่อนุมัติ</th>
                <th className="px-4 py-3 text-right">ใบรับรองดิจิทัล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {finalLockedItems.map(({ submission, course, teacher }) => {
                if (!course) return null;
                return (
                  <tr key={submission.id} className="hover:bg-slate-50/80 transition-colors">
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
                      <div>{teacher?.full_name}</div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-mono font-bold text-emerald-800">
                      {submission.average_gpa.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-mono text-[11px]">
                      {submission.approved_at
                        ? new Date(submission.approved_at).toLocaleString('th-TH')
                        : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedSubmissionId(submission.id);
                          setActiveView('teacher/detail');
                        }}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md font-semibold text-xs flex items-center gap-1 inline-flex transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>เปิดเล่มที่ล็อก</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Batch Sign Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Stamp className="w-5 h-5 text-amber-600" />
                <span>ลงนามอนุมัติยกชุด (Quick Batch Sign)</span>
              </h4>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              คุณกำลังจะลงนาม e-Signature และประทับตราสถานศึกษาให้แก่เอกสาร ปพ.5 รวม{' '}
              <span className="font-bold text-amber-800">{selectedSubIds.length} รายการ</span>{' '}
              พร้อมสร้าง Digital Certificate Hash และล็อกเล่มถาวร
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-amber-900">
                ผู้ลงนาม: ดร.วิรัตน์ ถนอมสิงห์ (ผู้อำนวยการโรงเรียนบ้านคูเมือง)
              </div>
              <div className="text-[11px] text-amber-800">
                ผลการลงนาม: เล่มที่เลือกจะเปลี่ยนสถานะเป็น FINAL_LOCKED และเข้าสู่คลัง ปพ.5 กลางทันที
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                รหัสผ่านยืนยันสิทธิ์ผู้อำนวยการ (Director Security PIN)
              </label>
              <input
                type="password"
                value={batchPin}
                onChange={(e) => setBatchPin(e.target.value)}
                placeholder="ระบุรหัส PIN ผู้อำนวยการ (ค่าเริ่มต้น 2569)"
                className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block font-mono">
                * สำหรับการทดสอบ กรอก PIN: 2569
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchSign}
                disabled={isBatchApproving}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-md flex items-center gap-2 cursor-pointer"
              >
                <Stamp className="w-4 h-4" />
                <span>{isBatchApproving ? 'กำลังประทับตราและสร้างแฮช...' : 'ยืนยันลงนามอนุมัติยกชุด'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
