import React, { useState } from 'react';
import { PP5Submission, Course } from '../../types/schema';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  BarChart3,
  Award,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileCheck,
  Printer,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  ShieldCheck,
  Table,
  HelpCircle,
  FileCode,
  Check,
  FolderUp,
  Copy,
} from 'lucide-react';

interface GradeSheetSimulatorProps {
  submission: PP5Submission;
  course: Course;
}

interface FileFinding {
  id: string;
  location: string;
  issueType: 'COMPLETENESS' | 'ATTENDANCE' | 'TRAITS' | 'TYPO' | 'FORMULA';
  comment: string;
  createdAt: string;
}

export const GradeSheetSimulator: React.FC<GradeSheetSimulatorProps> = ({ submission, course }) => {
  const { users, organizationDriveUrl, organizationDriveFolderId, currentRole, schoolLogoUrl } = useApp();
  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'doc-viewer' | 'spreadsheet-audit' | 'findings' | 'criteria' | 'google-drive'>('doc-viewer');
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);
  const [copiedDriveLink, setCopiedDriveLink] = useState(false);
  const [docPage, setDocPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreenModalOpen, setIsFullscreenModalOpen] = useState<boolean>(false);

  const handleCopyDriveLink = () => {
    navigator.clipboard.writeText(organizationDriveUrl);
    setCopiedDriveLink(true);
    setDownloadSuccessMessage('คัดลอกลิงก์โฟลเดอร์ Google Drive รวมองค์กรเรียบร้อยแล้ว!');
    setTimeout(() => {
      setCopiedDriveLink(false);
      setDownloadSuccessMessage(null);
    }, 3500);
  };

  // File audit findings recorded by reviewer directly on the file
  const [findings, setFindings] = useState<FileFinding[]>([
    {
      id: 'f-1',
      location: 'ไฟล์ Excel แผ่นชีต "คะแนนเก็บ" คอลัมน์ F แถว 14-20',
      issueType: 'COMPLETENESS',
      comment: 'สูตรคำนวณคะแนนรวมย่อยในชีตคะแนนเก็บไม่ครบถ้วน ขอให้ตรวจสอบสูตร SUM',
      createdAt: 'วันนี้ 10:15 น.',
    },
    {
      id: 'f-2',
      location: 'ไฟล์ PDF หน้าที่ 4 ตารางคุณลักษณะอันพึงประสงค์',
      issueType: 'TRAITS',
      comment: 'พบช่องคะแนนข้อที่ 4 (ใฝ่เรียนรู้) ว่างอยู่ 2 รายการ กรุณากรอกให้ครบ',
      createdAt: 'วันนี้ 10:18 น.',
    },
  ]);

  const [newLocation, setNewLocation] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newIssueType, setNewIssueType] = useState<FileFinding['issueType']>('FORMULA');
  const [showAddFindingForm, setShowAddFindingForm] = useState(false);

  const currentVer = submission.versions[selectedVersionIdx] || submission.versions[0];
  const teacher = users.find((u) => u.id === course.teacher_id);

  const handleDownloadFile = (type: 'EXCEL' | 'PDF') => {
    const fileName = type === 'EXCEL' ? currentVer?.excel_file_name : currentVer?.pdf_file_name;
    setDownloadSuccessMessage(`จำลองการดาวน์โหลดไฟล์สำหรับเปิดตรวจ: "${fileName}" สำเร็จ (สามารถเปิดใน Excel / PDF Reader ได้ทันที)`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  const handleAddFinding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.trim() || !newComment.trim()) return;
    const newFinding: FileFinding = {
      id: `f-${Date.now()}`,
      location: newLocation.trim(),
      issueType: newIssueType,
      comment: newComment.trim(),
      createdAt: 'เมื่อสักครู่',
    };
    setFindings([newFinding, ...findings]);
    setNewLocation('');
    setNewComment('');
    setShowAddFindingForm(false);
  };

  const handleDeleteFinding = (id: string) => {
    setFindings(findings.filter((f) => f.id !== id));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* File Direct Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-200 border border-blue-400/30 text-[11px] font-semibold">
                ระบบตรวจทานไฟล์ ปพ.5 โดยตรง
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-200 border border-purple-400/30 text-[11px] font-mono font-bold">
                เวอร์ชัน {currentVer?.version_number || 'V001'}
              </span>
              {submission.versions.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-blue-200 bg-white/10 px-2 py-0.5 rounded">
                  <span>สลับเวอร์ชัน:</span>
                  <select
                    value={selectedVersionIdx}
                    onChange={(e) => setSelectedVersionIdx(Number(e.target.value))}
                    className="bg-slate-800 text-white rounded px-1.5 py-0.5 text-xs border border-white/20 focus:outline-none"
                  >
                    {submission.versions.map((ver, idx) => (
                      <option key={ver.id} value={idx}>
                        {ver.version_number} ({new Date(ver.submitted_at).toLocaleDateString('th-TH')})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{course.course_code} {course.course_name}</span>
              <span className="text-sm font-normal text-slate-300">({course.grade_level})</span>
            </h3>

            <p className="text-xs text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>ครูผู้สอน: <strong className="text-white">{teacher?.full_name || 'ครูผู้สอน'}</strong> ({teacher?.department})</span>
              <span>ส่งเมื่อ: <strong className="text-white font-mono">{currentVer?.submitted_at ? new Date(currentVer.submitted_at).toLocaleString('th-TH') : '-'}</strong></span>
            </p>
          </div>

          {/* Quick File Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {currentRole === 'ADMIN' && (
              <a
                href={organizationDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
                title="เปิดโฟลเดอร์ Google Drive รวมองค์กรโรงเรียน (เฉพาะผู้ดูแลระบบ)"
              >
                <FolderUp className="w-4 h-4 text-blue-200" />
                <span>เปิดตรวจใน Google Drive องค์กร</span>
                <ExternalLink className="w-3.5 h-3.5 text-blue-200 ml-0.5" />
              </a>
            )}

            <button
              onClick={() => handleDownloadFile('EXCEL')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
              title="ดาวน์โหลดไฟล์ Excel ต้นฉบับเพื่อเปิดตรวจในโปรแกรม Microsoft Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>เปิดตรวจใน Excel (.XLSX)</span>
              <Download className="w-3.5 h-3.5 text-emerald-200 ml-0.5" />
            </button>

            <button
              onClick={() => handleDownloadFile('PDF')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
              title="ดาวน์โหลดไฟล์ PDF เพื่อเปิดตรวจในโปรแกรม PDF Reader หรือสั่งพิมพ์"
            >
              <FileText className="w-4 h-4 text-rose-200" />
              <span>ดาวน์โหลดเล่ม (.PDF)</span>
              <Download className="w-3.5 h-3.5 text-rose-200 ml-0.5" />
            </button>

            <button
              onClick={() => setIsFullscreenModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors border border-white/20 cursor-pointer"
              title="เปิดพรีวิวเล่มเอกสารเต็มหน้าจอ"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ดูเต็มจอ</span>
            </button>
          </div>
        </div>

        {/* Attached Files & Drive Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
          {/* Card 1: Excel */}
          <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-lg p-3 flex items-center justify-between border border-white/10">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-md shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="truncate text-xs">
                <span className="font-semibold block truncate text-white">{currentVer?.excel_file_name || 'ปพ5.xlsx'}</span>
                <span className="text-[11px] text-slate-300">ไฟล์สเปรดชีตสูตรคำนวณ · 284 KB</span>
              </div>
            </div>
            <button
              onClick={() => handleDownloadFile('EXCEL')}
              className="text-emerald-300 hover:text-white text-xs underline shrink-0 ml-2 cursor-pointer"
            >
              ดาวน์โหลด
            </button>
          </div>

          {/* Card 2: PDF */}
          <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-lg p-3 flex items-center justify-between border border-white/10">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-2 bg-rose-500/20 text-rose-300 rounded-md shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="truncate text-xs">
                <span className="font-semibold block truncate text-white">{currentVer?.pdf_file_name || 'ปพ5.pdf'}</span>
                <span className="text-[11px] text-slate-300">เล่ม ปพ.5 ฉบับสมบูรณ์ · 1.4 MB · 5 หน้า</span>
              </div>
            </div>
            <button
              onClick={() => handleDownloadFile('PDF')}
              className="text-rose-300 hover:text-white text-xs underline shrink-0 ml-2 cursor-pointer"
            >
              ดาวน์โหลด
            </button>
          </div>

          {/* Card 3: Google Drive Organization Central Folder */}
          <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 hover:from-blue-900/60 hover:to-indigo-900/60 transition-colors rounded-lg p-3 flex items-center justify-between border border-blue-400/30">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-2 bg-blue-500/30 text-blue-200 rounded-md shrink-0">
                <FolderUp className="w-4 h-4" />
              </div>
              <div className="truncate text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold block truncate text-white">Google Drive องค์กร</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                    โฟลเดอร์กลาง
                  </span>
                </div>
                <span className="text-[11px] text-blue-200/80 truncate block font-mono">
                  ID: {organizationDriveFolderId.slice(0, 12)}...
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button
                onClick={handleCopyDriveLink}
                className="text-blue-300 hover:text-white text-xs underline cursor-pointer"
                title="คัดลอกลิงก์โฟลเดอร์ Google Drive"
              >
                {copiedDriveLink ? 'คัดลอกแล้ว' : 'คัดลอก'}
              </button>
              <a
                href={organizationDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded text-xs font-semibold shadow-2xs transition-colors"
                title="เปิดโฟลเดอร์ Google Drive รวม"
              >
                <span>เปิดโฟลเดอร์</span>
                <ExternalLink className="w-3 h-3 text-white" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Bar */}
      {downloadSuccessMessage && (
        <div className="bg-emerald-50 text-emerald-800 border-b border-emerald-200 px-6 py-2.5 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{downloadSuccessMessage}</span>
        </div>
      )}

      {/* Auditor Notice Banner */}
      <div className="bg-amber-50/80 border-b border-amber-200/70 px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>คำแนะนำสำหรับผู้ตรวจทาน:</strong> ระบบนี้ออกแบบมาให้ตรวจทานจากไฟล์จริงโดยตรง คุณสามารถเปิดดูเล่มเอกสารผ่าน Document Viewer ด้านล่าง หรือดาวน์โหลดไฟล์ Excel (.xlsx) / PDF เพื่อเปิดตรวจในเครื่องของคุณได้อย่างอิสระ
          </span>
        </div>
        <span className="shrink-0 text-[11px] font-mono text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded font-bold">
          Direct File Inspection
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 bg-slate-50/50 px-4 sm:px-6">
        <div className="flex space-x-2 sm:space-x-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('doc-viewer')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'doc-viewer'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>ตรวจเล่มเอกสาร ปพ.5 (Document Viewer)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">5 หน้า</span>
          </button>

          <button
            onClick={() => setActiveTab('spreadsheet-audit')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'spreadsheet-audit'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>ตรวจโครงสร้างไฟล์สเปรดชีต Excel</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">5 ชีต</span>
          </button>

          <button
            onClick={() => setActiveTab('findings')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'findings'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>จุดที่ตรวจพบในไฟล์ & บันทึกข้อเสนอแนะ</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
              {findings.length} ข้อ
            </span>
          </button>

          <button
            onClick={() => setActiveTab('criteria')}
            className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'criteria'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>สรุปเกณฑ์มาตรฐาน 4 ด้านในไฟล์</span>
          </button>

          {currentRole === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('google-drive')}
              className={`py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'google-drive'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FolderUp className="w-4 h-4 text-emerald-600" />
              <span>ตรวจไฟล์ใน Google Drive องค์กร</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                Admin Only
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-4 sm:p-6 bg-slate-50/30 min-h-[460px]">
        {/* TAB 1: Document Viewer */}
        {activeTab === 'doc-viewer' && (
          <div className="space-y-4">
            {/* Viewer Controls Toolbar */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">หน้าที่:</span>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <button
                    onClick={() => setDocPage(Math.max(1, docPage - 1))}
                    disabled={docPage === 1}
                    className="p-1.5 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="หน้าก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                  </button>
                  <span className="px-3 text-xs font-semibold text-slate-800 font-mono">
                    {docPage} / 5
                  </span>
                  <button
                    onClick={() => setDocPage(Math.min(5, docPage + 1))}
                    disabled={docPage === 5}
                    className="p-1.5 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="หน้าถัดไป"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-1 ml-2">
                  {[
                    { p: 1, label: '1. ปกหน้า' },
                    { p: 2, label: '2. เวลาเรียน' },
                    { p: 3, label: '3. สรุปคะแนน/เกรด' },
                    { p: 4, label: '4. คุณลักษณะฯ' },
                    { p: 5, label: '5. ช่องลงนาม' },
                  ].map((item) => (
                    <button
                      key={item.p}
                      onClick={() => setDocPage(item.p)}
                      className={`px-2 py-1 rounded text-[11px] transition-colors ${
                        docPage === item.p
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 text-xs">
                  <button
                    onClick={() => setZoomLevel(Math.max(75, zoomLevel - 15))}
                    className="p-1.5 hover:bg-slate-200 text-slate-700 transition-colors"
                    title="ย่อขนาด"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-mono text-[11px] text-slate-600 font-semibold">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel(Math.min(150, zoomLevel + 15))}
                    className="p-1.5 hover:bg-slate-200 text-slate-700 transition-colors"
                    title="ขยายขนาด"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => handleDownloadFile('PDF')}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors"
                  title="ดาวน์โหลดไฟล์ PDF"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsFullscreenModalOpen(true)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>เต็มจอ</span>
                </button>
              </div>
            </div>

            {/* Document Surface Paper (Official Document Render) */}
            <div className="flex justify-center bg-slate-200/70 p-4 sm:p-8 rounded-2xl overflow-x-auto border border-slate-300">
              <div
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className="bg-white shadow-xl border border-slate-300 rounded-sm w-full max-w-[800px] min-h-[880px] p-8 sm:p-12 text-slate-900 transition-all font-sans relative"
              >
                {/* Official Stamp / Watermark Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                      <img
                        src={schoolLogoUrl}
                        alt="ตราประจำโรงเรียนบ้านคูเมือง"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
                        โรงเรียนบ้านคูเมือง (Ban Khumuang School)
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสิงห์บุรี (สพป.สิงห์บุรี)
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono text-slate-500">
                    <span className="font-bold text-slate-800 block text-xs">แบบ ปพ.5</span>
                    <span>เวอร์ชัน {currentVer?.version_number}</span>
                  </div>
                </div>

                {/* PAGE 1: Cover & Course Information */}
                {docPage === 1 && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="text-center py-6 space-y-2 border-b border-slate-200">
                      <div className="inline-block p-3 rounded-full bg-amber-50 border border-amber-200 text-amber-900 mb-2 font-bold text-xs">
                        แบบรายงานผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)
                      </div>
                      <h2 className="text-xl font-extrabold text-slate-900">
                        สมุดบันทึกผลการพัฒนาคุณภาพผู้เรียน
                      </h2>
                      <p className="text-sm text-slate-700">
                        ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช 2551 (ฉบับปรับปรุง 2560)
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3 text-xs">
                      <h5 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
                        ข้อมูลการจัดการเรียนรู้รายวิชา
                      </h5>
                      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
                        <div>
                          <span className="text-slate-500 block">รหัสวิชา - ชื่อวิชา:</span>
                          <span className="font-bold text-slate-900 text-sm">{course.course_code} {course.course_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">ระดับชั้น / ห้อง:</span>
                          <span className="font-bold text-slate-900 text-sm">{course.grade_level}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">กลุ่มสาระการเรียนรู้:</span>
                          <span className="font-semibold text-slate-800">{course.department}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">ครูผู้สอน:</span>
                          <span className="font-bold text-slate-900">{teacher?.full_name || 'ครูผู้สอน'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 text-xs space-y-2">
                      <div className="font-bold text-blue-950 flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-blue-700" />
                        <span>ไฟล์ต้นฉบับที่แนบมาในการตรวจทานรอบนี้:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 font-mono">
                        <li>{currentVer?.excel_file_name} (ไฟล์ตารางคำนวณสูตร)</li>
                        <li>{currentVer?.pdf_file_name} (ไฟล์เอกสารพร้อมลายเซ็น)</li>
                      </ul>
                      <p className="text-[11px] text-blue-800 pt-1">
                        ผู้ตรวจทานสามารถกดเปลี่ยนหน้าด้านบน หรือเปิดไฟล์ต้นฉบับในคอมพิวเตอร์เพื่อตรวจความถูกต้องของสูตร
                      </p>
                    </div>

                    <div className="pt-8 text-center text-xs text-slate-400">
                      - หน้าที่ 1 จาก 5 -
                    </div>
                  </div>
                )}

                {/* PAGE 2: Attendance & Time Criteria (80%) */}
                {docPage === 2 && (
                  <div className="space-y-5 animate-in fade-in">
                    <div className="border-b border-slate-200 pb-3">
                      <h3 className="text-base font-bold text-slate-900">
                        หน้าที่ 2: บันทึกเวลาเรียนและการประเมินเกณฑ์เวลาเรียน (ไม่ต่ำกว่า 80%)
                      </h3>
                      <p className="text-xs text-slate-500">
                        เกณฑ์ระเบียบการวัดและประเมินผลสถานศึกษา: นักเรียนต้องมีเวลาเรียนไม่น้อยกว่าร้อยละ 80 ของเวลาเรียนทั้งหมด
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <span className="text-[11px] text-slate-500 block">เวลาเรียนเฉลี่ยในห้อง</span>
                        <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
                          {submission.average_attendance_percentage}%
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <span className="text-[11px] text-slate-500 block">นักเรียนติด มส.</span>
                        <span className="text-xl font-bold font-mono text-slate-800 mt-1 block">0 คน</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <span className="text-[11px] text-slate-500 block">สถานะเกณฑ์เวลาเรียน</span>
                        <span className="text-xs font-bold text-emerald-700 mt-2 block bg-emerald-100 rounded py-0.5">
                          ✓ ผ่านเกณฑ์ทุกคน
                        </span>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/70 text-xs space-y-2">
                      <h5 className="font-bold text-slate-900">แนวปฏิบัติการตรวจสอบเวลาเรียนในไฟล์จริง:</h5>
                      <p className="text-slate-600 leading-relaxed">
                        1. ตรวจสอบการนับชั่วโมงเรียนทั้งหมดในภาคเรียน ให้ตรงกับโครงสร้างหลักสูตรกลุ่มสาระ{course.department}<br />
                        2. ตรวจสอบการลงบันทึก ขาด ลา มาสาย และการคำนวณร้อยละในชีต "เวลาเรียน"<br />
                        3. กรณีมีนักเรียนที่มีเวลาเรียนต่ำกว่า 80% ให้ตรวจสอบเอกสารขออนุญาตสอบหรือการสอนชดเชย
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>ผลการตรวจทานเบื้องต้น: เอกสารมีตารางเวลาเรียนครบถ้วน ไม่พบนักเรียนติด มส.</span>
                    </div>

                    <div className="pt-16 text-center text-xs text-slate-400">
                      - หน้าที่ 2 จาก 5 -
                    </div>
                  </div>
                )}

                {/* PAGE 3: Score Summary & Grade Statistics */}
                {docPage === 3 && (
                  <div className="space-y-5 animate-in fade-in">
                    <div className="border-b border-slate-200 pb-3">
                      <h3 className="text-base font-bold text-slate-900">
                        หน้าที่ 3: สรุปผลสัมฤทธิ์ทางการเรียนและการกระจายตัวของระดับผลการเรียน
                      </h3>
                      <p className="text-xs text-slate-500">
                        คะแนนรวม 100 คะแนน · ตัดเกรด 8 ระดับ (0 - 4.0) ตามระเบียบการวัดและประเมินผล
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <span className="text-[11px] text-blue-700 block">เกรดเฉลี่ย (GPA)</span>
                        <span className="text-2xl font-bold font-mono text-blue-950 mt-1 block">
                          {submission.average_gpa.toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <span className="text-[11px] text-emerald-700 block">อัตราผ่านเกณฑ์</span>
                        <span className="text-2xl font-bold font-mono text-emerald-950 mt-1 block">
                          {submission.pass_percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <span className="text-[11px] text-purple-700 block">การประเมินผล</span>
                        <span className="text-sm font-bold font-mono text-purple-950 mt-2.5 block">
                          ครบถ้วน 100%
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <span className="text-[11px] text-slate-700 block">จำนวนนักเรียน</span>
                        <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">10 คน</span>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4">
                      <h5 className="text-xs font-bold text-slate-900 mb-3">สรุปสถิติระดับผลการเรียน (Grade Distribution) ในเล่ม ปพ.5:</h5>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center text-xs">
                        <div className="p-2 bg-emerald-50 rounded border border-emerald-200 font-mono">
                          <span className="font-bold text-emerald-900 block">เกรด 4.0</span>
                          <span className="text-slate-600 text-[11px]">4 คน (40%)</span>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded border border-emerald-200 font-mono">
                          <span className="font-bold text-emerald-900 block">เกรด 3.5</span>
                          <span className="text-slate-600 text-[11px]">2 คน (20%)</span>
                        </div>
                        <div className="p-2 bg-blue-50 rounded border border-blue-200 font-mono">
                          <span className="font-bold text-blue-900 block">เกรด 3.0</span>
                          <span className="text-slate-600 text-[11px]">2 คน (20%)</span>
                        </div>
                        <div className="p-2 bg-blue-50 rounded border border-blue-200 font-mono">
                          <span className="font-bold text-blue-900 block">เกรด 2.5</span>
                          <span className="text-slate-600 text-[11px]">2 คน (20%)</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded border border-slate-200 font-mono text-slate-400">
                          <span className="font-bold block">เกรด 2.0</span>
                          <span className="text-[11px]">0 คน</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded border border-slate-200 font-mono text-slate-400">
                          <span className="font-bold block">เกรด 1.5</span>
                          <span className="text-[11px]">0 คน</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded border border-slate-200 font-mono text-slate-400">
                          <span className="font-bold block">เกรด 1.0</span>
                          <span className="text-[11px]">0 คน</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded border border-slate-200 font-mono text-slate-400">
                          <span className="font-bold block">เกรด 0</span>
                          <span className="text-[11px]">0 คน</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-12 text-center text-xs text-slate-400">
                      - หน้าที่ 3 จาก 5 -
                    </div>
                  </div>
                )}

                {/* PAGE 4: Desirable Characteristics & Reading Analysis */}
                {docPage === 4 && (
                  <div className="space-y-5 animate-in fade-in">
                    <div className="border-b border-slate-200 pb-3">
                      <h3 className="text-base font-bold text-slate-900">
                        หน้าที่ 4: สรุปผลการประเมินคุณลักษณะอันพึงประสงค์ และการอ่าน คิดวิเคราะห์ เขียน
                      </h3>
                      <p className="text-xs text-slate-500">
                        ตามเกณฑ์หลักสูตรแกนกลางฯ 8 คุณลักษณะ และ 5 ตัวชี้วัดการอ่านคิดวิเคราะห์
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                        <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-blue-600" />
                          <span>คุณลักษณะอันพึงประสงค์ 8 ประการ</span>
                        </h5>
                        <ul className="text-slate-600 space-y-1 list-decimal list-inside pl-1 text-[11px]">
                          <li>รักชาติ ศาสน์ กษัตริย์</li>
                          <li>ซื่อสัตย์สุจริต</li>
                          <li>มีวินัย</li>
                          <li>ใฝ่เรียนรู้</li>
                          <li>อยู่อย่างพอเพียง</li>
                          <li>มุ่งมั่นในการทำงาน</li>
                          <li>รักความเป็นไทย</li>
                          <li>มีจิตสาธารณะ</li>
                        </ul>
                        <div className="mt-2 pt-2 border-t border-slate-200 text-slate-700">
                          สรุปผล: <strong>ดีเยี่ยม 7 คน (70%), ดี 3 คน (30%)</strong>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                        <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span>การอ่าน คิดวิเคราะห์ และเขียน</span>
                        </h5>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          การประเมินทักษะการอ่านจับใจความ การคิดวิเคราะห์สังเคราะห์ และการสื่อสารผ่านการเขียนในรายวิชา {course.course_name}
                        </p>
                        <div className="mt-3 pt-3 border-t border-slate-200 text-slate-700 space-y-1">
                          <div>ระดับดีเยี่ยม: <strong>6 คน</strong></div>
                          <div>ระดับดี: <strong>3 คน</strong></div>
                          <div>ระดับผ่าน: <strong>1 คน</strong></div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-16 text-center text-xs text-slate-400">
                      - หน้าที่ 4 จาก 5 -
                    </div>
                  </div>
                )}

                {/* PAGE 5: Review Signatures & Formal Stamping Area */}
                {docPage === 5 && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="border-b border-slate-200 pb-3">
                      <h3 className="text-base font-bold text-slate-900">
                        หน้าที่ 5: ส่วนลงนามและบันทึกการตรวจทาน (Verification & Approval Signatures)
                      </h3>
                      <p className="text-xs text-slate-500">
                        การลงนามรับรองตามลำดับขั้น: ครูผู้สอน → ผู้ตรวจทาน/หัวหน้ากลุ่มสาระ → นายทะเบียนวัดผล → ผู้อำนวยการโรงเรียน
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-xs">
                      {/* Sign 1: Teacher */}
                      <div className="border border-slate-300 rounded-xl p-4 text-center space-y-2 bg-slate-50/40">
                        <span className="text-[11px] text-slate-500 block">ลงชื่อครูผู้สอน</span>
                        <div className="py-4 border-b border-dashed border-slate-400 font-serif italic text-blue-900 text-sm">
                          {teacher?.full_name || 'ครูผู้สอน'}
                        </div>
                        <span className="font-semibold text-slate-800 block">({teacher?.full_name || 'ครูผู้สอน'})</span>
                        <span className="text-[11px] text-slate-500 block">ตำแหน่ง ครู {teacher?.department}</span>
                      </div>

                      {/* Sign 2: Reviewer */}
                      <div className="border border-purple-200 rounded-xl p-4 text-center space-y-2 bg-purple-50/30">
                        <span className="text-[11px] text-purple-700 font-semibold block">ผู้ตรวจทาน (Four-Eyes Principle)</span>
                        <div className="py-4 border-b border-dashed border-purple-400 font-serif italic text-purple-900 text-sm">
                          {submission.status === 'PASSED_REVIEW' || submission.status === 'FINAL_LOCKED'
                            ? '✓ ตรวจทานรับรองแล้ว'
                            : '(รอผลการตรวจทาน)'}
                        </div>
                        <span className="font-semibold text-slate-800 block">
                          หัวหน้ากลุ่มสาระ / ครูผู้ตรวจทานที่ได้รับมอบหมาย
                        </span>
                        <span className="text-[11px] text-slate-500 block">ระเบียบวัดผล สพฐ.</span>
                      </div>

                      {/* Sign 3: Registrar */}
                      <div className="border border-slate-300 rounded-xl p-4 text-center space-y-2 bg-slate-50/40">
                        <span className="text-[11px] text-slate-500 block">หัวหน้างานวัดและประเมินผลการศึกษา</span>
                        <div className="py-4 border-b border-dashed border-slate-400 font-serif italic text-slate-600 text-sm">
                          ครูกิตติศักดิ์ เจริญสุข
                        </div>
                        <span className="font-semibold text-slate-800 block">(นายกิตติศักดิ์ เจริญสุข)</span>
                        <span className="text-[11px] text-slate-500 block">หัวหน้างานวัดผล</span>
                      </div>

                      {/* Sign 4: Director */}
                      <div className="border border-blue-200 rounded-xl p-4 text-center space-y-2 bg-blue-50/30">
                        <span className="text-[11px] text-blue-800 font-semibold block">ผู้อนุมัติ (ผู้อำนวยการโรงเรียน)</span>
                        <div className="py-4 border-b border-dashed border-blue-400 font-serif italic text-blue-900 text-sm">
                          {submission.status === 'FINAL_LOCKED' ? (
                            <span className="text-emerald-700 font-bold">✓ ลงนาม e-Signature & ล็อกเล่มแล้ว</span>
                          ) : (
                            '(รอการลงนามอนุมัติ)'
                          )}
                        </div>
                        <span className="font-semibold text-slate-800 block">(ดร.วิรัตน์ ถนอมสิงห์)</span>
                        <span className="text-[11px] text-slate-500 block">ผู้อำนวยการโรงเรียนบ้านคูเมือง</span>
                      </div>
                    </div>

                    <div className="pt-10 text-center text-xs text-slate-400">
                      - หน้าที่ 5 จาก 5 -
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Spreadsheet Structure Audit (Excel Inspection) */}
        {activeTab === 'spreadsheet-audit' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>การตรวจโครงสร้างชีตในไฟล์: {currentVer?.excel_file_name}</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ผู้ตรวจทานสามารถตรวจสอบความถูกต้องของสูตรคำนวณและโครงสร้างสเปรดชีตได้ตรงนี้
                  </p>
                </div>

                <button
                  onClick={() => handleDownloadFile('EXCEL')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>โหลดไปเปิดใน Excel</span>
                </button>
              </div>

              {/* Sheet breakdown list */}
              <div className="space-y-3">
                {[
                  {
                    sheetName: 'Cover & Info',
                    title: 'ชีต 1: ข้อมูลสถานศึกษาและวิชา',
                    status: 'OK',
                    details: `รหัสวิชา ${course.course_code}, ชื่อวิชา ${course.course_name}, ครูผู้สอน ${teacher?.full_name}`,
                  },
                  {
                    sheetName: 'Formative_Scores',
                    title: 'ชีต 2: คะแนนเก็บระหว่างภาค',
                    status: currentVer?.validation_ratio_correct ? 'OK' : 'WARNING',
                    details: 'คะแนนเก็บตามตัวชี้วัด K, P, A ตรวจสอบสูตร SUM ในแถวข้อมูลครบถ้วน',
                  },
                  {
                    sheetName: 'Summative_Exam',
                    title: 'ชีต 3: สอบปลายภาค และตัดเกรด',
                    status: 'OK',
                    details: 'คะแนนสอบปลายภาคและตัดเกรดอัตโนมัติด้วยสูตร 8 ระดับ',
                  },
                  {
                    sheetName: 'Attendance',
                    title: 'ชีต 4: สรุปเวลาเรียน (เกณฑ์ 80%)',
                    status: currentVer?.validation_attendance_correct ? 'OK' : 'WARNING',
                    details: 'นับวันเวลาเรียนครบตามโครงสร้างหลักสูตร คำนวณร้อยละรายบุคคล ไม่พบนักเรียน มส.',
                  },
                  {
                    sheetName: 'Traits_Reading',
                    title: 'ชีต 5: คุณลักษณะอันพึงประสงค์ และอ่านคิดวิเคราะห์',
                    status: currentVer?.validation_traits_correct ? 'OK' : 'WARNING',
                    details: 'ประเมิน 8 คุณลักษณะและ 5 ตัวชี้วัดการอ่านคิดวิเคราะห์ครบทุกคน',
                  },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-blue-200 transition-all flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 font-mono font-bold text-xs mt-0.5">
                        .XLS
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{s.title}</span>
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-200/70 px-1.5 py-0.2 rounded">
                            {s.sheetName}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1">{s.details}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${
                        s.status === 'OK'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {s.status === 'OK' ? '✓ ชีตสมบูรณ์' : '⚠ ควรตรวจทาน'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Formula & Calculation Assurance Card */}
              <div className="mt-5 p-4 rounded-xl border border-blue-200 bg-blue-50/50 text-xs">
                <h5 className="font-bold text-blue-950 flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>การตรวจสอบสูตรอัตโนมัติในสเปรดชีต (Integrity Check):</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-700 pt-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>ไม่พบข้อผิดพลาดสูตร (#REF!, #VALUE!)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>คะแนนรวมทุกแถวไม่เกิน 100</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>เกรด 0-4 ถูกต้องตามช่วงคะแนน</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Findings & Audit Notes */}
        {activeTab === 'findings' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-amber-600" />
                    <span>จุดที่ตรวจพบในไฟล์ & บันทึกข้อเสนอแนะ (File Audit Findings)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ผู้ตรวจทานสามารถระบุตำแหน่งเซลล์ในไฟล์ Excel หรือหน้าที่ตรวจพบในไฟล์ PDF เพื่อแจ้งครูผู้สอนให้แก้ไขได้ตรงจุด
                  </p>
                </div>

                <button
                  onClick={() => setShowAddFindingForm(!showAddFindingForm)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>บันทึกจุดที่ตรวจพบใหม่</span>
                </button>
              </div>

              {/* Add New Finding Form */}
              {showAddFindingForm && (
                <form
                  onSubmit={handleAddFinding}
                  className="mb-5 p-4 rounded-xl border border-blue-200 bg-blue-50/40 text-xs space-y-3"
                >
                  <h5 className="font-bold text-blue-950">ระบุรายละเอียดจุดที่ตรวจพบในไฟล์:</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        ตำแหน่งในไฟล์ (เช่น ไฟล์ Excel ชีตคะแนนเก็บ แถว 15, หรือ PDF หน้า 3):
                      </label>
                      <input
                        type="text"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="เช่น ไฟล์ Excel ชีต 'คะแนนเก็บ' เซลล์ F14"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-medium mb-1">หมวดหมู่ข้อบกพร่อง:</label>
                      <select
                        value={newIssueType}
                        onChange={(e) => setNewIssueType(e.target.value as FileFinding['issueType'])}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="COMPLETENESS">ความครบถ้วนของการวัดผลคะแนน</option>
                        <option value="ATTENDANCE">เกณฑ์เวลาเรียน (ไม่ต่ำกว่า 80%)</option>
                        <option value="TRAITS">คุณลักษณะอันพึงประสงค์ 8 ประการ</option>
                        <option value="FORMULA">สูตรคำนวณสเปรดชีตผิดพลาด</option>
                        <option value="TYPO">คำผิด / ข้อมูลทั่วไป</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1">ข้อเสนอแนะให้ครูผู้สอนแก้ไขในไฟล์:</label>
                    <textarea
                      rows={2}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="ระบุสิ่งที่ต้องการให้ครูผู้สอนแก้ไขในไฟล์ต้นฉบับ..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddFindingForm(false)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                    >
                      บันทึกรายการ
                    </button>
                  </div>
                </form>
              )}

              {/* Findings List */}
              <div className="space-y-3">
                {findings.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                    <p className="font-semibold text-slate-600">ยังไม่พบข้อบกพร่องในไฟล์ที่ตรวจ</p>
                    <p className="text-[11px] mt-0.5">เอกสารมีความถูกต้องตามเกณฑ์และสูตรคำนวณสมบูรณ์</p>
                  </div>
                ) : (
                  findings.map((finding) => (
                    <div
                      key={finding.id}
                      className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-950">{finding.location}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                            {finding.issueType === 'COMPLETENESS'
                              ? 'ความครบถ้วนของคะแนน'
                              : finding.issueType === 'ATTENDANCE'
                              ? 'เวลาเรียน'
                              : finding.issueType === 'TRAITS'
                              ? 'คุณลักษณะฯ'
                              : finding.issueType === 'FORMULA'
                              ? 'สูตรคำนวณ'
                              : 'ข้อมูลทั่วไป'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">{finding.createdAt}</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed font-sans">{finding.comment}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteFinding(finding.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors shrink-0"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 4-Pillar Criteria Check in File */}
        {activeTab === 'criteria' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    currentVer?.validation_ratio_correct
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {currentVer?.validation_ratio_correct ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-800">
                    1. ความครบถ้วนของการวัดผลประเมินผลคะแนน
                  </h5>
                  <p className="text-xs text-slate-600 mt-1">
                    คะแนนเก็บระหว่างภาคและคะแนนสอบปลายภาค รวม 100 คะแนนครบถ้วนตามเกณฑ์สถานศึกษา
                  </p>
                  <p className="text-xs font-mono mt-2 font-semibold text-slate-700">
                    สถานะการตรวจในไฟล์: {currentVer?.validation_ratio_correct ? '✓ ถูกต้อง 100%' : '⚠ ไม่ผ่านเกณฑ์ (ตรวจสอบสูตรใน Excel)'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    currentVer?.validation_attendance_correct
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {currentVer?.validation_attendance_correct ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-800">2. เกณฑ์เวลาเรียน (ไม่ต่ำกว่า 80%)</h5>
                  <p className="text-xs text-slate-600 mt-1">
                    นักเรียนทุกคนในห้องเรียนมีเวลาเรียนเฉลี่ย 93.8% ไม่มีนักเรียนที่เวลาเรียนต่ำกว่า 80% (ไม่มี มส.)
                  </p>
                  <p className="text-xs font-mono mt-2 font-semibold text-slate-700">
                    สถานะการตรวจในไฟล์: ✓ ถูกต้องตามระเบียบวัดผล
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    currentVer?.validation_traits_correct
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {currentVer?.validation_traits_correct ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-800">3. คุณลักษณะอันพึงประสงค์ 8 ประการ</h5>
                  <p className="text-xs text-slate-600 mt-1">
                    ประเมินครบทั้ง 8 ข้อ (รักชาติ ศาสน์ กษัตริย์, ซื่อสัตย์, มีวินัย, ใฝ่เรียนรู้, อยู่อย่างพอเพียง, มุ่งมั่น, รักความเป็นไทย, มีจิตสาธารณะ)
                  </p>
                  <p className="text-xs font-mono mt-2 font-semibold text-slate-700">
                    สถานะการตรวจในไฟล์: {currentVer?.validation_traits_correct ? '✓ ผ่านการประเมินครบทุกคน' : '⚠ พบข้อบกพร่องในไฟล์'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    currentVer?.validation_reading_analysis
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {currentVer?.validation_reading_analysis ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h5 className="text-sm font-bold text-slate-800">4. การอ่าน คิดวิเคราะห์ และเขียน</h5>
                  <p className="text-xs text-slate-600 mt-1">
                    ผลการประเมินความสามารถในการอ่านและการสื่อสารเขียน ระดับ ดีเยี่ยม - ผ่าน ครบถ้วน
                  </p>
                  <p className="text-xs font-mono mt-2 font-semibold text-slate-700">
                    สถานะการตรวจในไฟล์: ✓ ครบถ้วนตามเกณฑ์
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Organization Google Drive Inspection Center (Admin Only) */}
        {activeTab === 'google-drive' && currentRole === 'ADMIN' && (
          <div className="space-y-5 animate-in fade-in">
            {/* Main Google Drive Integration Banner */}
            <div className="bg-gradient-to-br from-[#0c1f4a] via-[#102a6b] to-[#1d4ed8] text-white rounded-2xl p-6 shadow-md border border-blue-400/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      โฟลเดอร์ Google Drive รวมขององค์กร (เชื่อมต่อพร้อมใช้งาน)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200 font-mono text-xs">
                      Shared Drive
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-white">
                    คลังจัดเก็บไฟล์ ปพ.5 รวมโรงเรียนบ้านคูเมือง
                  </h4>

                  <p className="text-xs text-blue-100 leading-relaxed max-w-2xl">
                    ระบบเชื่อมต่อกับโฟลเดอร์กลางของโรงเรียนโดยตรง ครูผู้สอนจัดเก็บไฟล์ต้นฉบับทั้ง Excel (.xlsx) และ PDF ในโฟลเดอร์นี้ ผู้ตรวจทานสามารถเปิดเข้าไปตรวจสอบไฟล์ต้นฉบับได้ทันทีโดยไม่ต้องขอสิทธิ์ส่วนบุคคลเพิ่มเติม
                  </p>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
                  <a
                    href={organizationDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                  >
                    <FolderUp className="w-4 h-4 text-slate-900" />
                    <span>เปิดโฟลเดอร์ใน Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                  </a>

                  <button
                    onClick={handleCopyDriveLink}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-200" />
                    <span>{copiedDriveLink ? '✓ คัดลอกลิงก์สำเร็จ' : 'คัดลอกลิงก์โฟลเดอร์'}</span>
                  </button>
                </div>
              </div>

              {/* URL & Folder ID Box */}
              <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                  <span className="text-[11px] text-blue-200 block mb-1">ลิงก์โฟลเดอร์ Google Drive:</span>
                  <a
                    href={organizationDriveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-amber-200 hover:text-amber-100 underline truncate block text-[11px]"
                  >
                    {organizationDriveUrl}
                  </a>
                </div>

                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                  <span className="text-[11px] text-blue-200 block mb-1">Folder ID กลางของโรงเรียน:</span>
                  <span className="font-mono text-white font-bold text-[11px]">
                    {organizationDriveFolderId}
                  </span>
                </div>
              </div>
            </div>

            {/* Reviewer Direct Checking Guidance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold font-mono">
                  1
                </div>
                <h5 className="text-xs font-bold text-slate-900">ตรวจไฟล์ Excel ใน Drive</h5>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  เปิดไฟล์ <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">{currentVer?.excel_file_name}</code> ตรวจดูสูตรคำนวณคะแนนตัวชี้วัด SUM และ AVERAGE
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-bold font-mono">
                  2
                </div>
                <h5 className="text-xs font-bold text-slate-900">ตรวจไฟล์ PDF ใน Drive</h5>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  เปิดไฟล์ <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">{currentVer?.pdf_file_name}</code> ตรวจความเรียบร้อยของหน้าปก คำนำ สารบัญ และตารางผลการเรียน
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold font-mono">
                  3
                </div>
                <h5 className="text-xs font-bold text-slate-900">บันทึกผลและรับรองเอกสาร</h5>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  เมื่อตรวจทานไฟล์ใน Google Drive แล้ว หากถูกต้องครบถ้วนให้เลือกแบบประเมิน 4 ด้านด้านล่าง หรือกดส่งกลับแก้ไขหากพบข้อบกพร่อง
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Document Preview Modal */}
      {isFullscreenModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold">
                <FileText className="w-4 h-4 text-rose-400" />
                <span>พรีวิวเล่มเอกสาร ปพ.5: {course.course_code} {course.course_name} ({course.grade_level})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadFile('PDF')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 rounded text-xs font-semibold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด PDF</span>
                </button>
                <button
                  onClick={() => setIsFullscreenModalOpen(false)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-xs font-semibold"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-200 p-6 overflow-y-auto flex justify-center">
              <div className="bg-white shadow-xl border border-slate-300 rounded-sm w-full max-w-[850px] p-8 sm:p-12 text-slate-900 space-y-6">
                <div className="text-center border-b pb-4">
                  <h3 className="text-lg font-bold">สมุดบันทึกผลการพัฒนาคุณภาพผู้เรียน (ปพ.5)</h3>
                  <p className="text-xs text-slate-600">โรงเรียนบ้านคูเมือง สพป.สิงห์บุรี</p>
                </div>
                <div className="p-4 bg-slate-50 border rounded-lg text-xs space-y-2">
                  <p><strong>วิชา:</strong> {course.course_code} {course.course_name} ({course.grade_level})</p>
                  <p><strong>ครูผู้สอน:</strong> {teacher?.full_name}</p>
                  <p><strong>เวอร์ชันเอกสาร:</strong> {currentVer?.version_number}</p>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  คุณสามารถดาวน์โหลดไฟล์ต้นฉบับ .xlsx และ .pdf ไปเปิดตรวจสอบได้อย่างละเอียดในเครื่อง
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DirectFileInspector = GradeSheetSimulator;
