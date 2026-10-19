import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Lock,
  User,
  Trash2,
  RefreshCw,
  Send,
  HelpCircle,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  Headphones,
  Upload,
  FolderUp,
  ExternalLink,
  Link,
} from 'lucide-react';

export const TeacherSubmitForm: React.FC = () => {
  const {
    currentUser,
    courses,
    submissions,
    activeTerm,
    submitPP5,
    setActiveView,
    organizationDriveUrl,
    organizationDriveFolderId,
  } = useApp();

  const myCourses = courses.filter(
    (c) => c.teacher_id === currentUser.id && c.term_id === activeTerm.id,
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string>(myCourses[0]?.id || '');
  const selectedCourse = myCourses.find((c) => c.id === selectedCourseId) || myCourses[0];

  const cleanGrade = selectedCourse?.grade_level.replace('/', '-') || 'ป.3-1';
  const cleanTeacher = currentUser?.full_name.replace(/\s+/g, '_') || 'ครูผู้สอน';
  const cleanSubject = selectedCourse?.course_name.replace(/\s+/g, '') || 'วิชา';

  // Official Standardized Naming Convention
  const autoExcelName = `ปพ5_${activeTerm.year}_ภาคเรียนที่${activeTerm.semester}_${cleanGrade}_${selectedCourse?.course_code}_${cleanSubject}_${cleanTeacher}.xlsx`;
  const autoPdfName = `ปพ5_${activeTerm.year}_ภาคเรียนที่${activeTerm.semester}_${cleanGrade}_${selectedCourse?.course_code}_${cleanSubject}_${cleanTeacher}.pdf`;

  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [hasExcel, setHasExcel] = useState(false);
  const [hasPdf, setHasPdf] = useState(false);
  const [customExcelName, setCustomExcelName] = useState<string>(autoExcelName);
  const [customPdfName, setCustomPdfName] = useState<string>(autoPdfName);
  const [originalExcelUploadName, setOriginalExcelUploadName] = useState<string | null>(null);
  const [originalPdfUploadName, setOriginalPdfUploadName] = useState<string | null>(null);
  const [excelFileSize, setExcelFileSize] = useState<string>('');
  const [pdfFileSize, setPdfFileSize] = useState<string>('');

  useEffect(() => {
    setCustomExcelName(autoExcelName);
    setCustomPdfName(autoPdfName);
    setExcelFile(null);
    setPdfFile(null);
    setHasExcel(false);
    setHasPdf(false);
    setIsConfirmed(false);
  }, [selectedCourseId, activeTerm.year, activeTerm.semester]);

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Auto-Renaming Service: Whatever filename the user chose, rename to standard automatically!
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExcelFile(file);
      setOriginalExcelUploadName(file.name);
      // Immediately and automatically apply system standardized name
      setCustomExcelName(autoExcelName);
      setExcelFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      setHasExcel(true);
    }
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setOriginalPdfUploadName(file.name);
      // Immediately and automatically apply system standardized name
      setCustomPdfName(autoPdfName);
      setPdfFileSize(`${(file.size / (1024 * 1024)).toFixed(2)} MB`);
      setHasPdf(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !excelFile || !pdfFile || !hasExcel || !hasPdf || !isConfirmed) {
      setErrorMsg('กรุณาเลือกไฟล์ .xlsx และ .pdf จริง พร้อมยืนยันความถูกต้อง');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    const ex = new File(
      [excelFile],
      (customExcelName || autoExcelName).slice(0, 170).replace(/\.xlsx$/i, '') + '.xlsx',
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
    );
    const pd = new File(
      [pdfFile],
      (customPdfName || autoPdfName).slice(0, 170).replace(/\.pdf$/i, '') + '.pdf',
      { type: 'application/pdf' },
    );
    const ok = await submitPP5(selectedCourse.id, ex, pd);
    setIsSubmitting(false);
    if (ok) setActiveView('teacher/dashboard');
  };

  if (!selectedCourse)
    return (
      <div className="p-8 bg-white rounded-2xl border text-slate-600">
        ยังไม่มีรายวิชาที่มอบหมายให้คุณในภาคเรียนนี้ กรุณาติดต่อผู้ดูแลระบบ
      </div>
    );
  return (
    <div className="space-y-6">
      {/* 1. Top Breadcrumb & Title Row matching the screenshot */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>ระบบงานวิชาการ</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span>เอกสารผลการเรียน ปพ.5</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-blue-900">ยื่นส่งเอกสารประเมิน</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00236f] text-white flex items-center justify-center shrink-0 shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                ส่งเอกสาร ปพ.5 ประจำภาคเรียนที่ {activeTerm.semester} ปีการศึกษา {activeTerm.year}
              </h2>
            </div>
          </div>

          {/* 3-Step Stepper Pill on Top Right */}
          <div className="flex items-center gap-2 text-xs bg-white p-1.5 rounded-full border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#00236f] text-white font-semibold rounded-full shadow-2xs">
              <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[10px] flex items-center justify-center font-bold">
                1
              </span>
              <span>อัปโหลดไฟล์</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 text-slate-400 font-medium">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[10px] flex items-center justify-center font-bold">
                2
              </span>
              <span>ผู้ตรวจประเมิน</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 text-slate-400 font-medium">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 text-[10px] flex items-center justify-center font-bold">
                3
              </span>
              <span>ผอ. อนุมัติ</span>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Main 2-Column Grid (Left: 2/3, Right: 1/3) */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 of 12) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: ข้อมูลพื้นฐานรายวิชา (Course Baseline) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="text-blue-900 font-bold text-sm">
                  ข้อมูลพื้นฐานรายวิชา (Course Baseline)
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 font-semibold text-xs border border-blue-200/80">
                สถานะ: ฉบับร่าง (Draft)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1.5">
                  ปีการศึกษา / ภาคเรียน
                </label>
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>
                    {activeTerm.year} / ภาคเรียนที่ {activeTerm.semester}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  ระดับชั้นเรียน <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCourse.grade_level}
                  onChange={(e) => {
                    const match = myCourses.find((c) => c.grade_level === e.target.value);
                    if (match) setSelectedCourseId(match.id);
                  }}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {[...new Set(myCourses.map((c) => c.grade_level))].map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  กลุ่มสาระ / รายวิชา <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {myCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_name} ({c.course_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1.5">
                  รหัสวิชา (อัตโนมัติ)
                </label>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono font-bold">
                  <span>{selectedCourse?.course_code}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1.5">
                  ครูประจำวิชา / ผู้บันทึก
                </label>
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{currentUser.full_name}</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1.5">
                  รอบการส่ง / เวอร์ชั่น
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium">
                  <span>
                    ฉบับที่{' '}
                    {(submissions.find((s) => s.course_id === selectedCourse.id)?.current_version ||
                      0) + 1}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: ไฟล์เอกสารผลการเรียน (Dual Upload Zone) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-700" />
                  <span>ไฟล์เอกสารผลการเรียน (Dual Upload Zone)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  จำเป็นต้องอัปโหลดทั้งสองไฟล์เพื่อความครบถ้วนตามเกณฑ์ตรวจสอบงานทะเบียน
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                ช่องบังคับ *
              </span>
            </div>

            {/* 2 Upload Dropboxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Excel */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    1. ไฟล์ต้นฉบับ Excel <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-slate-400">.xlsx (สูงสุด 25MB)</span>
                </div>

                <input
                  type="file"
                  ref={excelInputRef}
                  onChange={handleExcelFileChange}
                  accept=".xlsx"
                  className="hidden"
                />

                <div
                  onClick={() => excelInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-white hover:border-emerald-500 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-2">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    คลิกเพื่อเลือกไฟล์ Excel จากเครื่อง
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    ไฟล์บันทึกคะแนนตัวชี้วัดฉบับเต็ม (.xlsx)
                  </div>
                </div>

                {/* Attached File Preview Card */}
                {hasExcel && (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs text-xs animate-in fade-in">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div
                          className="font-mono font-bold text-slate-800 text-[11px] truncate"
                          title={customExcelName}
                        >
                          {customExcelName}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span>{excelFileSize}</span>
                          <span>·</span>
                          <span className="text-emerald-700 font-semibold">✓ พร้อมส่ง</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => excelInputRef.current?.click()}
                        className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        เปลี่ยนไฟล์
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasExcel(false)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        title="ลบไฟล์"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Box 2: PDF */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    2. ไฟล์รายงานพิมพ์ PDF <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-slate-400">.pdf (สูงสุด 25MB)</span>
                </div>

                <input
                  type="file"
                  ref={pdfInputRef}
                  onChange={handlePdfFileChange}
                  accept=".pdf"
                  className="hidden"
                />

                <div
                  onClick={() => pdfInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center bg-white hover:border-rose-500 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 mx-auto flex items-center justify-center mb-2">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-800">
                    คลิกเพื่อเลือกไฟล์ PDF จากเครื่อง
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    ไฟล์ Export สำหรับลงนามอิเล็กทรอนิกส์ (.pdf)
                  </div>
                </div>

                {/* Attached File Preview Card */}
                {hasPdf && (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs text-xs animate-in fade-in">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div
                          className="font-mono font-bold text-slate-800 text-[11px] truncate"
                          title={customPdfName}
                        >
                          {customPdfName}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span>{pdfFileSize}</span>
                          <span>·</span>
                          <span className="text-emerald-700 font-semibold">✓ พร้อมส่ง</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => pdfInputRef.current?.click()}
                        className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        เปลี่ยนไฟล์
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasPdf(false)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        title="ลบไฟล์"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Automatic Renaming Service Box (Requirement 6) */}
            <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border border-blue-200/90 rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-700 text-white rounded-xl shrink-0 mt-0.5 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-blue-950">
                      บริการตั้งชื่อไฟล์มาตรฐานโรงเรียนบ้านคูเมืองให้อัตโนมัติ 100%
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-semibold">
                      Active
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    ไม่ว่าครูจะเลือกไฟล์ชื่อใดมาอัปโหลด
                    ระบบจะทำการแปลงชื่อไฟล์ให้เป็นรหัสมาตรฐานทางราชการทันทีโดยไม่ต้องเปลี่ยนชื่อไฟล์เอง
                  </p>
                </div>
              </div>

              {(originalExcelUploadName || originalPdfUploadName) && (
                <div className="p-3 bg-white/90 border border-blue-200/70 rounded-xl space-y-2 text-xs">
                  {originalExcelUploadName && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                      <span className="text-slate-500">
                        ไฟล์ Excel เดิม:{' '}
                        <span className="line-through text-slate-400">
                          {originalExcelUploadName}
                        </span>
                      </span>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded truncate max-w-md">
                        ✓ ตั้งชื่อใหม่: {customExcelName}
                      </span>
                    </div>
                  )}
                  {originalPdfUploadName && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                      <span className="text-slate-500">
                        ไฟล์ PDF เดิม:{' '}
                        <span className="line-through text-slate-400">{originalPdfUploadName}</span>
                      </span>
                      <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded truncate max-w-md">
                        ✓ ตั้งชื่อใหม่: {customPdfName}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Checkbox confirmation */}
            <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-700 rounded focus:ring-blue-500"
              />
              <span className="text-slate-700 font-medium leading-relaxed">
                ข้าพเจ้ายืนยันว่าไฟล์ PDF สร้างจาก Excel ฉบับเดียวกันและข้อมูลผลการเรียน นักเรียน
                เวลาเรียน ตรงกันทุกประการ พร้อมรับการตรวจสอบจากคณะกรรมการวิชาการ
              </span>
            </label>

            {/* Actions Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveView('teacher/dashboard')}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>ยกเลิก / กลับหน้าภาพรวม</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[#00236f] hover:bg-blue-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <span>{isSubmitting ? 'กำลังส่งข้อมูล...' : 'ตรวจสอบและส่งให้ผู้ตรวจ'}</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Note Notice matching screenshot */}
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs">
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-amber-950">ขั้นตอนต่อไปหลังจากการส่ง:</span>
              <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                ผู้ตรวจที่ได้รับมอบหมายจะเห็นเอกสารในคิวเมื่อเปิดหน้าหรือรีเฟรชข้อมูล
                หากมีข้อแก้ไขระบบจะแจ้งเตือนพร้อมข้อเสนอแนะ
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (4 of 12) - Sidebar Widgets */}
        <div className="lg:col-span-4 space-y-6">
          {/* Widget 1: เกณฑ์การตรวจรับรอง ปพ.5 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <span className="text-blue-700">⁑</span>
              <span>เกณฑ์การตรวจรับรอง ปพ.5</span>
            </h4>

            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-slate-700 leading-snug">
                  บันทึกคะแนนเก็บครบทุกหน่วยการเรียนรู้ และคะแนนสอบปลายภาค
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-slate-700 leading-snug">
                  บันทึกการประเมินคุณลักษณะอันพึงประสงค์ (8 ประการ)
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-slate-700 leading-snug">
                  บันทึกการอ่าน คิดวิเคราะห์ และเขียน ครบทุกคน
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-slate-700 leading-snug">
                  เวลาเรียนไม่น้อยกว่าร้อยละ 80 ของเวลาเรียนทั้งหมด
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <span>เอกสารต้องผ่านการตรวจสอบเบื้องต้นจากครูผู้สอนก่อนส่ง</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-xs space-y-3">
            <h4 className="font-bold text-slate-900">สรุปไฟล์ที่เลือก</h4>
            <p>Excel: {excelFile?.name || 'ยังไม่ได้เลือก'}</p>
            <p>PDF: {pdfFile?.name || 'ยังไม่ได้เลือก'}</p>
            <p className="text-slate-500">
              ตรวจคะแนน เวลาเรียน และข้อมูลนักเรียนในไฟล์ก่อนยืนยันส่ง
              สถิติจะแสดงหลังส่งเมื่อพบคอลัมน์ผลการเรียนที่ระบบอ่านได้
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-xs space-y-3">
            <h4 className="font-bold text-slate-900">ประวัติการส่งวิชานี้</h4>
            {submissions
              .find((s) => s.course_id === selectedCourse.id)
              ?.versions.map((v) => (
                <p key={v.id}>
                  {v.version_number} · {new Date(v.submitted_at).toLocaleString('th-TH')}
                </p>
              )) || <p className="text-slate-500">ยังไม่มีประวัติการส่ง</p>}
          </div>

          {/* Widget 4: พบปัญหาการอัปโหลดไฟล์? (Dark blue card) */}
          <div className="bg-[#0b1736] text-white rounded-2xl p-5 shadow-md space-y-2 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-800/80 flex items-center justify-center text-blue-200">
                <Headphones className="w-4 h-4" />
              </div>
              <h5 className="font-bold text-white text-xs">พบปัญหาการอัปโหลดไฟล์?</h5>
            </div>
            <p className="text-[11px] text-blue-200/80 leading-relaxed pt-1">
              ติดต่อผู้ดูแล PP5 หรืองานทะเบียนและวัดผลของโรงเรียน
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
