import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { CertificateHashModal } from '../common/CertificateHashModal';
import { AdminDriveStorage } from './AdminDriveStorage';
import {
  Archive,
  Download,
  Lock,
  Unlock,
  ShieldAlert,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  KeyRound,
  AlertTriangle,
  FolderArchive,
  Search,
  FolderUp,
  ExternalLink,
  Copy,
  Edit3,
  Calendar,
  Check,
  Filter,
  Layers,
  Sparkles,
  ArrowDownToLine,
  History,
} from 'lucide-react';

export const AdminArchive: React.FC = () => {
  const {
    courses,
    download,
    downloadArchive,
    submissions,
    emergencyUnlock,
    activeTerm,
    academicTerms,
    currentRole,
    users,
    organizationDriveUrl,
    organizationDriveFolderId,
    updateOrganizationDriveUrl,
  } = useApp();

  // Filter States
  const [selectedTermId, setSelectedTermId] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications & Modals
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);
  const [isEditingDriveUrl, setIsEditingDriveUrl] = useState(false);
  const [tempDriveUrl, setTempDriveUrl] = useState(organizationDriveUrl);

  // Emergency Unlock state (Admin only)
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [selectedSubToUnlock, setSelectedSubToUnlock] = useState<string | null>(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Certificate Modal state
  const [viewCertSubId, setViewCertSubId] = useState<string | null>(null);

  const gradeLevels = ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3'];

  // Distinct available academic years
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(academicTerms.map((t) => t.year))).sort((a, b) => b - a);
    return years;
  }, [academicTerms]);

  const handleDownloadSingleFile = async (url: string, fileName: string) => {
    if (await download(url, fileName)) setDownloadSuccessMsg('ดาวน์โหลดไฟล์ต้นฉบับเรียบร้อยแล้ว');
  };

  const handleDownloadZip = async (scope: 'TERM' | 'YEAR' | 'GRADE' | 'ALL', label?: string) => {
    const filters: Record<string, string> = {};
    if (scope !== 'ALL') {
      if (selectedTermId !== 'ALL') filters.termId = selectedTermId;
      else if (selectedYear !== 'ALL') filters.year = selectedYear;
      if (selectedGrade !== 'ALL') filters.grade = selectedGrade;
    }
    if (scope === 'TERM' && selectedTermId !== 'ALL') filters.termId = selectedTermId;
    else if (scope === 'YEAR' && selectedYear !== 'ALL') filters.year = selectedYear;
    else if (scope === 'GRADE' && (label || selectedGrade) !== 'ALL')
      filters.grade = label || selectedGrade;
    if (await downloadArchive(filters))
      setDownloadSuccessMsg('ดาวน์โหลด ZIP จากไฟล์ต้นฉบับเรียบร้อยแล้ว');
  };

  const handleEmergencyUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubToUnlock) return;
    if (!(await emergencyUnlock(selectedSubToUnlock, unlockReason, twoFactorToken))) {
      setUnlockError('ปลดล็อกไม่สำเร็จ กรุณาตรวจรหัสผ่านและข้อความแจ้งข้อผิดพลาด');
      return;
    }
    setUnlockModalOpen(false);
    setSelectedSubToUnlock(null);
    setUnlockReason('');
    setTwoFactorToken('');
    setUnlockError(null);
    setDownloadSuccessMsg('ปลดล็อกเพื่อส่งเวอร์ชันใหม่แล้ว พร้อมเก็บหลักฐานอนุมัติเดิมในประวัติ');
  };

  // Filtered Submissions Logic
  const filteredSubmissions = useMemo(() => {
    return submissions
      .filter((s) => s.status === 'FINAL_LOCKED')
      .map((s) => {
        const course = courses.find((c) => c.id === s.course_id);
        const term = academicTerms.find((t) => t.id === course?.term_id);
        const teacher = users.find((u) => u.id === course?.teacher_id);
        const latestVer =
          s.versions && s.versions.length > 0 ? s.versions[s.versions.length - 1] : null;
        return {
          submission: s,
          course,
          term,
          teacher,
          latestVer,
        };
      })
      .filter(({ course, term, teacher }) => {
        if (!course) return false;

        // Filter by Term
        if (selectedTermId !== 'ALL' && course.term_id !== selectedTermId) {
          return false;
        }

        // Filter by Academic Year
        if (selectedYear !== 'ALL' && term && term.year.toString() !== selectedYear) {
          return false;
        }

        // Filter by Grade Level
        if (selectedGrade !== 'ALL' && !course.grade_level.startsWith(selectedGrade)) {
          return false;
        }

        // Filter by Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchCode = course.course_code.toLowerCase().includes(q);
          const matchName = course.course_name.toLowerCase().includes(q);
          const matchTeacher = teacher?.full_name?.toLowerCase().includes(q) || false;
          const matchGrade = course.grade_level.toLowerCase().includes(q);
          if (!matchCode && !matchName && !matchTeacher && !matchGrade) {
            return false;
          }
        }

        return true;
      });
  }, [
    submissions,
    courses,
    academicTerms,
    users,
    selectedTermId,
    selectedYear,
    selectedGrade,
    searchQuery,
  ]);

  // Stats calculation
  const totalLockedCourses = filteredSubmissions.length;
  const mean = (values: number[], digits: number) => {
    const known = values.filter(Number.isFinite);
    return known.length ? (known.reduce((a, b) => a + b, 0) / known.length).toFixed(digits) : '—';
  };
  const averageGpa = mean(
    filteredSubmissions.map((i) => i.submission.average_gpa),
    2,
  );
  const averageAttendance = mean(
    filteredSubmissions.map((i) => i.submission.average_attendance_percentage),
    1,
  );

  // Completion per grade (based on currently selected term/year)
  const gradeStats = gradeLevels.map((lvl) => {
    const gradeCourses = courses.filter((c) => {
      const term = academicTerms.find((t) => t.id === c.term_id);
      if (selectedTermId !== 'ALL' && c.term_id !== selectedTermId) return false;
      if (selectedYear !== 'ALL' && term && term.year.toString() !== selectedYear) return false;
      return c.grade_level.startsWith(lvl);
    });

    const lockedCount = gradeCourses.filter((c) => {
      const sub = submissions.find((s) => s.course_id === c.id);
      return sub && sub.status === 'FINAL_LOCKED';
    }).length;

    const total = gradeCourses.length;
    const percent = total > 0 ? (lockedCount / total) * 100 : 0;
    return { level: lvl, locked: lockedCount, total, percent };
  });

  const certSub = submissions.find((s) => s.id === viewCertSubId);
  const certCourse = courses.find((c) => c.id === certSub?.course_id);

  // Selected Term Object
  const currentSelectedTermObj = academicTerms.find((t) => t.id === selectedTermId);

  return (
    <div className="space-y-6">
      {/* 1. Header with Title & Quick Global Download */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-900 font-semibold mb-1">
            <Archive className="w-4 h-4 text-blue-700" />
            <span>คลังเอกสาร ปพ.5 ออนไลน์ โรงเรียนบ้านคูเมือง</span>
            <span>·</span>
            <span className="text-slate-500">สพป.สิงห์บุรี</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            คลัง ปพ.5 รายเทอม / รายปีการศึกษาย้อนหลัง
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            สืบค้นและดาวน์โหลดไฟล์ ปพ.5 (Excel & PDF) ย้อนหลังได้ทุกปีการศึกษาและทุกภาคเรียน
            แม้ว่าจะผ่านมาแล้ว
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedTermId !== 'ALL' && (
            <button
              onClick={() => handleDownloadZip('TERM')}
              className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="ดาวน์โหลด ZIP รวมทุกวิชาในเทอมที่เลือก"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>ดาวน์โหลด ZIP ประจำเทอมนี้</span>
            </button>
          )}

          {selectedYear !== 'ALL' && selectedTermId === 'ALL' && (
            <button
              onClick={() => handleDownloadZip('YEAR')}
              className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title={`ดาวน์โหลด ZIP รวมทุกวิชาตลอดปีการศึกษา ${selectedYear}`}
            >
              <FolderArchive className="w-4 h-4" />
              <span>ดาวน์โหลด ZIP รวมปี {selectedYear}</span>
            </button>
          )}

          <button
            onClick={() => handleDownloadZip('ALL')}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            title="ดาวน์โหลด ZIP รวมเอกสาร ปพ.5 ทุกระดับชั้นและทุกภาคเรียน"
          >
            <FolderArchive className="w-4 h-4" />
            <span>ดาวน์โหลด ZIP รวมทุกไฟล์</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {downloadSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{downloadSuccessMsg}</span>
        </div>
      )}

      {currentRole === 'ADMIN' && <AdminDriveStorage />}
      {/* 2. Google Drive Shared Folder Card (ADMIN ONLY - Requirement 5) */}
      {currentRole === 'ADMIN' && (
        <div className="bg-gradient-to-r from-[#071330] to-[#12285e] text-white rounded-2xl p-6 shadow-md border border-blue-500/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Google Drive รวมองค์กร (Admin Console Only)
                </span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200 font-mono text-xs">
                  ID: {organizationDriveFolderId}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                โฟลเดอร์ Google Drive จัดเก็บ ปพ.5 รวมโรงเรียนบ้านคูเมือง
              </h3>
              <p className="text-xs text-blue-200/80 leading-relaxed max-w-2xl font-mono text-[11px] truncate">
                URL: {organizationDriveUrl}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <a
                href={organizationDriveUrl || undefined}
                aria-disabled={!organizationDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <FolderUp className="w-4 h-4" />
                <span>เปิดใน Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
              </a>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(organizationDriveUrl);
                  setDownloadSuccessMsg('คัดลอกลิงก์โฟลเดอร์ Google Drive รวมองค์กรเรียบร้อยแล้ว');
                  setTimeout(() => setDownloadSuccessMsg(null), 3000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium border border-white/20 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกลิงก์</span>
              </button>

              <button
                onClick={() => {
                  setTempDriveUrl(organizationDriveUrl);
                  setIsEditingDriveUrl(!isEditingDriveUrl);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-medium border border-white/20 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingDriveUrl ? 'ยกเลิกแก้ไข' : 'เปลี่ยน URL Drive'}</span>
              </button>
            </div>
          </div>

          {/* Inline URL Editor */}
          {isEditingDriveUrl && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (tempDriveUrl.trim()) {
                  if (!(await updateOrganizationDriveUrl(tempDriveUrl.trim()))) return;
                  setIsEditingDriveUrl(false);
                  setDownloadSuccessMsg('ปรับปรุง URL โฟลเดอร์ Google Drive องค์กรสำเร็จ');
                  setTimeout(() => setDownloadSuccessMsg(null), 3000);
                }
              }}
              className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-2"
            >
              <input
                type="url"
                value={tempDriveUrl}
                onChange={(e) => setTempDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="flex-1 w-full p-2.5 bg-white text-slate-900 rounded-xl text-xs font-mono border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
              >
                บันทึก URL ใหม่
              </button>
            </form>
          )}
        </div>
      )}

      {/* 3. Comprehensive Term & Year Selector Panel (Requirement 4) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                เลือกปีการศึกษา และภาคเรียนที่ต้องการดาวน์โหลด (Term & Year Filter)
              </h3>
              <p className="text-[11px] text-slate-500">
                สามารถเลือกดูและดาวน์โหลดเอกสาร ปพ.5 ได้ทั้งภาคเรียนปัจจุบัน
                และภาคเรียนย้อนหลังที่ล็อกเล่มแล้ว
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono">
              พบ {totalLockedCourses} รายวิชาในคลัง
            </span>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Term Selector */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>ภาคเรียนที่ต้องการ</span>
            </label>
            <select
              value={selectedTermId}
              onChange={(e) => {
                setSelectedTermId(e.target.value);
                if (e.target.value !== 'ALL') {
                  const t = academicTerms.find((item) => item.id === e.target.value);
                  if (t) setSelectedYear(t.year.toString());
                }
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">ทุกภาคเรียน (รวมทั้งปัจจุบันและย้อนหลัง)</option>
              {academicTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  ปี {t.year} / ภาคเรียนที่ {t.semester}{' '}
                  {t.is_active ? '★ (เทอมปัจจุบัน)' : '(ย้อนหลัง)'}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year Selector */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>ปีการศึกษา</span>
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                if (e.target.value !== 'ALL' && selectedTermId !== 'ALL') {
                  const currTerm = academicTerms.find((t) => t.id === selectedTermId);
                  if (currTerm && currTerm.year.toString() !== e.target.value) {
                    setSelectedTermId('ALL');
                  }
                }
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">ทุกปีการศึกษา</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr.toString()}>
                  ปีการศึกษา {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Level Selector */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>ระดับชั้นเรียน</span>
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">ทุกระดับชั้น (ป.1 - ม.3)</option>
              {gradeLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  ระดับชั้น {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>ค้นหาชื่อวิชา / ครูผู้สอน</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="รหัสวิชา, ชื่อวิชา, ครู..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>
        </div>

        {/* Selected Context Banner */}
        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-blue-950 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>กำลังแสดงผล:</span>
            <span className="font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200 font-mono">
              {selectedTermId !== 'ALL'
                ? `ปี ${currentSelectedTermObj?.year} / เทอม ${currentSelectedTermObj?.semester}`
                : selectedYear !== 'ALL'
                  ? `ปีการศึกษา ${selectedYear} (ทั้งปี)`
                  : 'ทุกปีการศึกษา / ทุกภาคเรียน'}
            </span>
            {selectedGrade !== 'ALL' && (
              <span className="font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200 font-mono">
                ชั้น {selectedGrade}
              </span>
            )}
            <span className="text-slate-500 font-normal">
              ({totalLockedCourses} รายวิชาที่อนุมัติล็อกเล่มแล้ว)
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <span>
              เกรดเฉลี่ยรวม: <strong className="text-emerald-800 font-mono">{averageGpa}</strong>
            </span>
            <span>·</span>
            <span>
              การเข้าเรียนเฉลี่ย:{' '}
              <strong className="text-blue-800 font-mono">{averageAttendance}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Grade-Level Completion Overview Cards */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            ความพร้อมของเอกสารรายสายชั้น (
            {selectedTermId !== 'ALL'
              ? `ปี ${currentSelectedTermObj?.year}/${currentSelectedTermObj?.semester}`
              : selectedYear !== 'ALL'
                ? `ปี ${selectedYear}`
                : 'รวมทุกเทอม'}
            )
          </h3>
          <span className="text-[11px] text-slate-400">
            คลิกสายชั้นเพื่อกรองและดาวน์โหลดเฉพาะกลุ่มได้ทันที
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
          {gradeStats.map((st) => (
            <button
              key={st.level}
              onClick={() => setSelectedGrade(selectedGrade === st.level ? 'ALL' : st.level)}
              className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                selectedGrade === st.level
                  ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/30'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
              }`}
            >
              <div className="font-bold text-slate-800 font-mono text-xs">{st.level}</div>
              <div
                className={`text-sm font-bold font-mono mt-1 ${
                  st.percent === 100
                    ? 'text-emerald-700'
                    : st.percent > 0
                      ? 'text-blue-700'
                      : 'text-slate-400'
                }`}
              >
                {st.percent.toFixed(0)}%
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                {st.locked}/{st.total} วิชา
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Archived Courses Table with Direct Download Buttons */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>รายการ ปพ.5 พร้อมดาวน์โหลด ({filteredSubmissions.length} รายการ)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ทุกรายการผ่านการตรวจสอบ 4 ด้าน ลงนาม e-Signature และประทับตรารับรอง Digital Hash แล้ว
            </p>
          </div>

          {filteredSubmissions.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  handleDownloadZip('GRADE', selectedGrade !== 'ALL' ? selectedGrade : undefined)
                }
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="ดาวน์โหลดไฟล์ที่กำลังแสดงผลเป็น ZIP รวม"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด ZIP ทั้งหน้านี้</span>
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">ปี / เทอม</th>
                <th className="px-4 py-3">รหัสวิชา</th>
                <th className="px-4 py-3">ชื่อรายวิชา</th>
                <th className="px-4 py-3 text-center">ชั้น</th>
                <th className="px-4 py-3">ครูผู้สอน</th>
                <th className="px-4 py-3 text-center">GPA</th>
                <th className="px-4 py-3">Digital Hash (SHA-256)</th>
                <th className="px-4 py-3 text-center">สถานะ</th>
                <th className="px-4 py-3 text-right">ดาวน์โหลด ปพ.5</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <Archive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">
                      ไม่พบเอกสาร ปพ.5 ตามเงื่อนไขที่เลือก
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      ลองเปลี่ยนปีการศึกษา ภาคเรียน หรือล้างคำค้นหาเพื่อดูข้อมูลทั้งหมด
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map(({ submission, course, term, teacher, latestVer }) => {
                  if (!course) return null;
                  const excelName =
                    latestVer?.excel_file_name ||
                    `ปพ5_${term?.year || 2568}_${term?.semester || 1}_${course.course_code}.xlsx`;
                  const pdfName =
                    latestVer?.pdf_file_name ||
                    `ปพ5_${term?.year || 2568}_${term?.semester || 1}_${course.course_code}.pdf`;

                  return (
                    <tr key={submission.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Term / Year Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-mono font-bold text-[11px] border border-slate-200">
                          {term?.year || '2568'}/{term?.semester || '1'}
                        </span>
                        {term?.is_active && (
                          <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-semibold">
                            ปัจจุบัน
                          </span>
                        )}
                      </td>

                      {/* Course Code */}
                      <td className="px-4 py-3.5 font-bold font-mono text-slate-900 whitespace-nowrap">
                        {course.course_code}
                      </td>

                      {/* Course Name */}
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        <div>{course.course_name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {course.department}
                        </div>
                      </td>

                      {/* Grade Level */}
                      <td className="px-4 py-3.5 text-center font-mono font-medium text-slate-700 whitespace-nowrap">
                        {course.grade_level}
                      </td>

                      {/* Teacher Name */}
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                        {teacher?.full_name || 'ครูผู้สอน'}
                      </td>

                      {/* GPA */}
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-emerald-800 whitespace-nowrap">
                        {Number.isFinite(submission.average_gpa)
                          ? submission.average_gpa.toFixed(2)
                          : '—'}
                      </td>

                      {/* Hash */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">
                        <button
                          onClick={() => setViewCertSubId(submission.id)}
                          className="text-blue-700 hover:underline max-w-[160px] truncate block font-mono text-left cursor-pointer"
                          title="คลิกเพื่อดูใบรับรองดิจิทัลและพิมพ์"
                        >
                          {submission.digital_certificate_hash || 'SHA256:7e9b4d18...'}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Final Locked
                        </span>
                      </td>

                      {/* Action Buttons: Direct File Downloads */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. Download Excel */}
                          <button
                            onClick={() =>
                              handleDownloadSingleFile(latestVer!.excel_file_url, excelName)
                            }
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                            title={`ดาวน์โหลดไฟล์ Excel: ${excelName}`}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Excel</span>
                          </button>

                          {/* 2. Download PDF */}
                          <button
                            onClick={() =>
                              handleDownloadSingleFile(latestVer!.pdf_file_url, pdfName)
                            }
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                            title={`ดาวน์โหลดไฟล์ PDF: ${pdfName}`}
                          >
                            <FileText className="w-3.5 h-3.5 text-rose-700" />
                            <span>PDF</span>
                          </button>

                          {/* 3. Certificate Modal */}
                          <button
                            onClick={() => setViewCertSubId(submission.id)}
                            className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="ดูตราประทับและใบรับรองดิจิทัล"
                          >
                            ตราประทับ
                          </button>

                          {/* 4. Emergency Unlock (Admin Only) */}
                          {currentRole === 'ADMIN' && (
                            <button
                              onClick={() => {
                                setSelectedSubToUnlock(submission.id);
                                setUnlockModalOpen(true);
                              }}
                              className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                              title="ปลดล็อกฉุกเฉินด้วยรหัสผ่าน (Admin Only)"
                            >
                              <Unlock className="w-3 h-3" />
                              <span className="hidden sm:inline">ปลดล็อก</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Emergency Unlock Modal (Admin Only) */}
      {unlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-rose-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-rose-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>ปลดล็อกฉุกเฉิน (Emergency Special Revision Window)</span>
              </h4>
              <button
                onClick={() => setUnlockModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              <span className="font-bold">คำเตือนทางกฎระเบียบ:</span> เอกสารที่ Final Locked แล้ว
              ได้รับการลงนามและสร้าง Digital Hash แล้ว
              การปลดล็อกต้องมีเหตุผลจำเป็นอย่างยิ่งและต้องยืนยันด้วย รหัสผ่านบัญชีผู้ดูแล
              ซึ่งจะถูกบันทึกใน Audit Ledger อย่างถาวร
            </div>

            {unlockError && (
              <div className="p-2.5 bg-rose-100 text-rose-900 text-xs rounded-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>{unlockError}</span>
              </div>
            )}

            <form onSubmit={handleEmergencyUnlockSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  เหตุผลความจำเป็นในการปลดล็อกฉุกเฉิน *
                </label>
                <textarea
                  required
                  rows={3}
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder="เช่น ตรวจพบข้อผิดพลาดของชื่อนักเรียนที่ต้องส่ง สพป. เขต 4..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  รหัสผ่านบัญชีผู้ดูแลปัจจุบัน *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={twoFactorToken}
                    onChange={(e) => setTwoFactorToken(e.target.value)}
                    placeholder="กรอกรหัสผ่านบัญชีผู้ดูแล"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block font-mono">
                  ยืนยันด้วยรหัสผ่านของคุณเพื่อบันทึกการปลดล็อก
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUnlockModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-4 h-4" />
                  <span>ยืนยันการปลดล็อก (Emergency Unlock)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Certificate Modal */}
      {viewCertSubId && certSub && certCourse && (
        <CertificateHashModal
          submission={certSub}
          course={certCourse}
          onClose={() => setViewCertSubId(null)}
        />
      )}
    </div>
  );
};
