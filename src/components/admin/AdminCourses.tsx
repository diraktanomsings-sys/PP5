import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Course } from '../../types/schema';
import {
  BookOpen,
  Plus,
  UploadCloud,
  Copy,
  ToggleLeft,
  ToggleRight,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const AdminCourses: React.FC = () => {
  const {
    courses,
    academicTerms,
    mutate,
    setCourses,
    users,
    activeTerm,
    toggleCourseOpenSubmission,
    addAuditLog,
  } = useApp();

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [cloneTerm, setCloneTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add course form state
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('ป.3/1');
  const [department, setDepartment] = useState('ภาษาไทย');
  const [creditHours, setCreditHours] = useState(3.0);
  const [teacherId, setTeacherId] = useState(users[0]?.id || '');
  const [scoreRatio, setScoreRatio] = useState('70:30');

  const teachers = users.filter((u) => {
    const roles = u.assigned_roles && u.assigned_roles.length > 0 ? u.assigned_roles : [u.role];
    return u.is_active && roles.includes('TEACHER');
  });

  const filteredCourses = courses.filter((c) => {
    if (c.term_id !== activeTerm.id) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.course_code.toLowerCase().includes(q) ||
      c.course_name.toLowerCase().includes(q) ||
      c.grade_level.toLowerCase().includes(q)
    );
  });

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode || !courseName) return;

    const newCourse: Course = {
      id: `c-${Date.now()}`,
      term_id: activeTerm.id,
      course_code: courseCode,
      course_name: courseName,
      grade_level: gradeLevel,
      department: department,
      credit_hours: creditHours,
      teacher_id: teacherId,
      score_ratio: scoreRatio,
      is_open_submission: true,
      created_at: new Date().toISOString(),
    };

    if (!(await setCourses([newCourse, ...courses]))) return;
    addAuditLog({
      action_type: 'COURSE_MODIFIED',
      target_id: newCourse.id,
      target_name: `เพิ่มวิชา ${newCourse.course_code} ${newCourse.course_name}`,
      details: {
        action: 'ADD_COURSE',
        course_code: courseCode,
        grade_level: gradeLevel,
      },
    });

    setShowAddModal(false);
    setSuccessMsg(`เพิ่มรายวิชา ${courseCode} ${courseName} สำเร็จ!`);
    setTimeout(() => setSuccessMsg(null), 3000);
    // Reset form
    setCourseCode('');
    setCourseName('');
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;
    try {
      const { parseCourseCsv } = await import('../../lib/csv');
      const rows = parseCourseCsv(await csvFile.text(), activeTerm.id, users);
      if (await mutate('courses-import', { courses: rows, termId: activeTerm.id })) {
        setSuccessMsg('นำเข้ารายวิชาจาก CSV เรียบร้อยแล้ว');
        setShowCsvModal(false);
        setCsvFile(null);
      }
    } catch (e) {
      setSuccessMsg(e instanceof Error ? e.message : 'อ่าน CSV ไม่สำเร็จ');
    }
  };

  const handleBulkClone = async () => {
    if (await mutate('courses-clone', { fromTermId: cloneTerm, termId: activeTerm.id })) {
      setShowCloneModal(false);
      setSuccessMsg('คัดลอกโครงสร้างรายวิชาเรียบร้อยแล้ว');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            จัดการโครงสร้างรายวิชา (Courses Management)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            กำหนดหลักสูตร, กลุ่มสาระการเรียนรู้, ครูผู้สอน และการเปิด-ปิดรับส่งไฟล์ ปพ.5
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCloneModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Bulk Clone ข้ามเทอม</span>
          </button>
          <button
            onClick={() => setShowCsvModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>นำเข้า CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-[#00236f] hover:bg-blue-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ เพิ่มรายวิชาใหม่</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหารหัสวิชา หรือชื่อวิชา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-slate-500">แสดงทั้งหมด {filteredCourses.length} รายวิชา</div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">รหัสวิชา</th>
                <th className="px-4 py-3">ชื่อรายวิชา</th>
                <th className="px-4 py-3 text-center">ชั้น</th>
                <th className="px-4 py-3">กลุ่มสาระ</th>
                <th className="px-4 py-3">ครูผู้สอน</th>
                <th className="px-4 py-3 text-center">เปิดรับส่ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.map((c) => {
                const teacher = users.find((u) => u.id === c.teacher_id);
                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {c.course_code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.course_name}</td>
                    <td className="px-4 py-3 text-center font-mono font-medium text-slate-700">
                      {c.grade_level}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.department}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {teacher ? teacher.full_name : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleCourseOpenSubmission(c.id)}
                        className="inline-flex items-center gap-1 cursor-pointer focus:outline-none"
                        title={c.is_open_submission ? 'คลิกเพื่อปิดรับส่ง' : 'คลิกเพื่อเปิดรับส่ง'}
                      >
                        {c.is_open_submission ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <ToggleRight className="w-4 h-4 text-emerald-600" />
                            เปิดรับส่ง
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center gap-1">
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                            ปิดรับส่ง
                          </span>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-slate-900">เพิ่มรายวิชาใหม่ในหลักสูตร</h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCourse} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    รหัสวิชา (เช่น ท13101) *
                  </label>
                  <input
                    type="text"
                    required
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="ท13101"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ระดับชั้นเรียน *</label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="ป.1/1">ป.1/1</option>
                    <option value="ป.2/1">ป.2/1</option>
                    <option value="ป.3/1">ป.3/1</option>
                    <option value="ป.4/1">ป.4/1</option>
                    <option value="ป.5/1">ป.5/1</option>
                    <option value="ป.6/1">ป.6/1</option>
                    <option value="ม.1/1">ม.1/1</option>
                    <option value="ม.2/1">ม.2/1</option>
                    <option value="ม.3/1">ม.3/1</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อรายวิชา *</label>
                <input
                  type="text"
                  required
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="ภาษาไทย 3"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">กลุ่มสาระการเรียนรู้</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none"
                >
                  <option value="ภาษาไทย">ภาษาไทย</option>
                  <option value="คณิตศาสตร์">คณิตศาสตร์</option>
                  <option value="วิทยาศาสตร์และเทคโนโลยี">วิทยาศาสตร์และเทคโนโลยี</option>
                  <option value="สังคมศึกษาฯ">สังคมศึกษาฯ</option>
                  <option value="ภาษาต่างประเทศ">ภาษาต่างประเทศ</option>
                  <option value="ศิลปะ">ศิลปะ</option>
                  <option value="สุขศึกษาและพลศึกษา">สุขศึกษาและพลศึกษา</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ครูผู้สอนประจำรายวิชา *
                </label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-800 hover:bg-blue-900 rounded-lg shadow-xs"
                >
                  บันทึกรายวิชา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-700" />
              <span>นำเข้ารายวิชาจากไฟล์ CSV</span>
            </h4>
            <p className="text-xs text-slate-600">
              อัปโหลดไฟล์ CSV ที่มีคอลัมน์: course_code, course_name, grade_level, department,
              teacher_id, score_ratio
            </p>
            <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50 text-xs text-slate-600">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <input
                aria-label="เลือกไฟล์รายวิชา CSV"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCsvModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCsvImport}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-800 hover:bg-blue-900 rounded-lg"
              >
                เริ่มนำเข้าข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Modal */}
      {showCloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Copy className="w-5 h-5 text-blue-700" />
              <span>Bulk Clone รายวิชาข้ามภาคเรียน</span>
            </h4>
            <p className="text-xs text-slate-600">
              คัดลอกโครงสร้างรายวิชาและครูผู้สอนทั้งหมดจากภาคเรียนก่อนหน้า (เช่น 2568/1)
              มายังปีการศึกษา {activeTerm.year}/{activeTerm.semester}
            </p>
            <label className="text-xs block">
              ภาคเรียนต้นทาง
              <select
                aria-label="ภาคเรียนต้นทาง"
                value={cloneTerm}
                onChange={(e) => setCloneTerm(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
              >
                <option value="">เลือกภาคเรียน</option>
                {academicTerms
                  .filter((t) => t.id !== activeTerm.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.year}/{t.semester}
                    </option>
                  ))}
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCloneModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleBulkClone}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-800 hover:bg-blue-900 rounded-lg"
              >
                ยืนยันการ Clone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
