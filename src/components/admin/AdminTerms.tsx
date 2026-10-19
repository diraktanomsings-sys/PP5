import React, { useState } from 'react';
import { AdminDeletionTools } from './AdminDeletionTools';
import { useApp } from '../../context/AppContext';
import { AcademicTerm } from '../../types/schema';
import { Calendar, Plus, CheckCircle2, Archive, Clock, Check, AlertCircle } from 'lucide-react';

export const AdminTerms: React.FC = () => {
  const { academicTerms, activeTerm, setActiveTermId, addAuditLog, addTerm, mutate } = useApp();

  const [showAddTermModal, setShowAddTermModal] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear() + 543);
  const [semester, setSemester] = useState(1);
  const [submissionDeadline, setSubmissionDeadline] = useState('');
  const [reviewDeadline, setReviewDeadline] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const handleActivateTerm = async (id: string) => {
    if (!(await setActiveTermId(id))) return;
    const target = academicTerms.find((t) => t.id === id);
    if (target) {
      addAuditLog({
        action_type: 'COURSE_MODIFIED',
        target_id: id,
        target_name: `เปลี่ยนปีการศึกษาเปิดใช้งานเป็น ${target.year} ภาคเรียนที่ ${target.semester}`,
        details: { active_term_id: id },
      });
      setNotice(
        `เปิดใช้งานปีการศึกษา ${target.year} ภาคเรียนที่ ${target.semester} เป็นภาคเรียนปัจจุบันเรียบร้อยแล้ว`,
      );
      setTimeout(() => setNotice(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            ปีการศึกษาและภาคเรียน (Academic Terms Management)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            เปิดรอบการจัดทำ ปพ.5 ใหม่, กำหนดเส้นตายส่งเกรด และการจัดเก็บรอบเข้า Archive
          </p>
        </div>

        <button
          onClick={() => setShowAddTermModal(true)}
          className="px-3.5 py-2 bg-[#00236f] hover:bg-blue-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ เปิดรอบปีการศึกษาใหม่</span>
        </button>
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <AdminDeletionTools kind="term" />
      {/* Terms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {academicTerms.map((term) => {
          const isActive = term.id === activeTerm.id;

          return (
            <div
              key={term.id}
              className={`p-5 rounded-2xl border transition-all ${
                isActive
                  ? 'bg-blue-50/50 border-blue-400 ring-2 ring-blue-100 shadow-md'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                  ID: {term.id}
                </span>
                {isActive ? (
                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                    กำลังเปิดใช้งาน
                  </span>
                ) : term.is_archived ? (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center gap-1">
                    <Archive className="w-3 h-3" />
                    จัดเก็บแล้ว
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">ปิดใช้งาน</span>
                )}
              </div>

              <div className="mt-4">
                <h3 className="text-lg font-bold text-slate-900">ปีการศึกษา {term.year}</h3>
                <p className="text-xs text-blue-900 font-semibold mt-0.5">
                  ภาคเรียนที่ {term.semester}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    กำหนดส่ง ปพ.5:
                  </span>
                  <span className="font-mono font-medium text-slate-800 text-[11px]">
                    {new Date(term.submission_deadline).toLocaleDateString('th-TH')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    กำหนดตรวจเสร็จ:
                  </span>
                  <span className="font-mono font-medium text-slate-800 text-[11px]">
                    {new Date(term.review_deadline).toLocaleDateString('th-TH')}
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-2">
                {!isActive && (
                  <button
                    onClick={() =>
                      void mutate('term-edit', { id: term.id, archived: !term.is_archived })
                    }
                    className="w-full mb-2 py-2 border rounded-lg text-xs text-slate-600"
                  >
                    {term.is_archived ? 'นำภาคเรียนออกจากการจัดเก็บ' : 'จัดเก็บภาคเรียนเข้าคลัง'}
                  </button>
                )}
                {!isActive ? (
                  <button
                    onClick={() => handleActivateTerm(term.id)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    ตั้งเป็นภาคเรียนปัจจุบัน
                  </button>
                ) : (
                  <div className="text-center text-xs text-blue-700 font-bold py-2 bg-blue-100/60 rounded-lg">
                    ✓ ภาคเรียนปัจจุบัน
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Term Modal */}
      {showAddTermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-slate-900">เปิดรอบปีการศึกษาใหม่</h4>
              <button
                onClick={() => setShowAddTermModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ปีการศึกษา (พ.ศ.) *</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ภาคเรียน *</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                  >
                    <option value={1}>ภาคเรียนที่ 1</option>
                    <option value={2}>ภาคเรียนที่ 2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">กำหนดส่ง ปพ.5 ครู *</label>
                <input
                  type="datetime-local"
                  value={submissionDeadline}
                  onChange={(e) => setSubmissionDeadline(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">กำหนดผู้ตรวจรับรอง *</label>
                <input
                  type="datetime-local"
                  value={reviewDeadline}
                  onChange={(e) => setReviewDeadline(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTermModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={async () => {
                    if (!submissionDeadline || !reviewDeadline) {
                      setNotice('กรุณาระบุกำหนดส่งและกำหนดตรวจให้ครบ');
                      return;
                    }
                    if (
                      !(await addTerm({
                        year: Number(year),
                        semester: Number(semester),
                        deadline: new Date(submissionDeadline + ':00+07:00').toISOString(),
                        reviewDeadline: new Date(reviewDeadline + ':00+07:00').toISOString(),
                      }))
                    )
                      return;
                    setShowAddTermModal(false);
                    setNotice(`สร้างรอบปีการศึกษา ${year}/${semester} สำเร็จ!`);
                    setTimeout(() => setNotice(null), 3000);
                  }}
                  className="px-4 py-1.5 bg-blue-800 text-white rounded-lg font-bold shadow-xs"
                >
                  บันทึกรอบใหม่
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
