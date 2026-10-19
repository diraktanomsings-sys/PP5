import React, { useEffect, useState } from 'react';
import type { PP5Submission, Course } from '../../types/schema';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import type { Sheet } from '../../lib/workbook';
const PdfPreview = React.lazy(() => import('../../production/PdfPreview'));
const tabs = [
  ['pdf', 'เอกสาร PDF'],
  ['excel', 'ตรวจไฟล์ Excel'],
  ['findings', 'ข้อค้นพบ / ผลตรวจ'],
  ['criteria', 'เกณฑ์ตรวจ 4 ด้าน'],
  ['drive', 'Google Drive'],
] as const;
export function GradeSheetSimulator({
  submission,
  course,
}: {
  submission: PP5Submission;
  course: Course;
}) {
  const { currentUser, currentRole, organizationDriveUrl, download, downloadSigned, mutate } =
    useApp();
  const [tab, setTab] = useState<string>('pdf');
  const [versionIndex, setVersionIndex] = useState(0);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState('');
  const [comment, setComment] = useState('');
  const [issueType, setIssueType] = useState('COMPLETENESS');
  const v = submission.versions[versionIndex] || submission.versions[0];
  useEffect(() => {
    setVersionIndex(0);
    setTab('pdf');
  }, [submission.id]);
  useEffect(() => {
    if (tab !== 'excel' || !v) return;
    let active = true;
    setLoading(true);
    setError('');
    setSheets([]);
    setSheetIndex(0);
    void (async () => {
      const res = await fetch(v.excel_file_url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('เปิด Excel ไม่สำเร็จ');
      const { readWorkbook } = await import('../../lib/workbook');
      const rows = readWorkbook(new Uint8Array(await res.arrayBuffer()));
      if (active) setSheets(rows);
    })()
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'อ่านไฟล์ไม่สำเร็จ');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, v?.excel_file_url]);
  if (!v) return <div className="p-6 text-slate-500">ยังไม่มีไฟล์เอกสาร</div>;
  const canFind =
    currentRole === 'REVIEWER' &&
    submission.status === 'PENDING_REVIEW' &&
    versionIndex === 0 &&
    course.teacher_id !== currentUser.id;
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-slate-50 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 flex gap-2 items-center">
            <Search className="w-4 h-4 text-blue-800" />
            ตรวจไฟล์ต้นฉบับ ปพ.5 · {course.course_code}
          </h3>
          <p className="text-xs text-slate-500 mt-1">ไฟล์และประวัติจากเวอร์ชันที่ส่งจริง</p>
        </div>
        <label className="text-xs">
          เวอร์ชัน{' '}
          <select
            aria-label="เวอร์ชันเอกสาร"
            value={versionIndex}
            onChange={(e) => setVersionIndex(Number(e.target.value))}
            className="p-2 border rounded-lg bg-white"
          >
            {submission.versions.map((v, i) => (
              <option key={v.id} value={i}>
                {v.version_number} ·{' '}
                {new Date(v.submitted_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap border-b">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={
              'px-4 py-3 text-xs font-bold border-b-2 ' +
              (tab === key
                ? 'border-blue-800 text-blue-900 bg-blue-50'
                : 'border-transparent text-slate-500')
            }
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-4 flex flex-wrap gap-2 border-b">
        {submission.status === 'FINAL_LOCKED' && (
          <button
            onClick={() => void downloadSigned(submission.id)}
            className="text-xs px-3 py-2 rounded-lg bg-blue-900 text-white"
          >
            PDF พร้อมหลักฐานอนุมัติ
          </button>
        )}
        <button
          onClick={() => void download(v.excel_file_url, v.excel_file_name)}
          className="text-xs px-3 py-2 rounded-lg border border-emerald-200 text-emerald-800 flex gap-2 items-center"
        >
          <FileSpreadsheet className="w-4 h-4" />
          ดาวน์โหลด Excel ต้นฉบับ
        </button>
        <button
          onClick={() => void download(v.pdf_file_url, v.pdf_file_name)}
          className="text-xs px-3 py-2 rounded-lg border border-red-200 text-red-800 flex gap-2 items-center"
        >
          <FileText className="w-4 h-4" />
          ดาวน์โหลด PDF ต้นฉบับ
        </button>
      </div>
      <div className="p-4 sm:p-5">
        {tab === 'pdf' && (
          <React.Suspense fallback={<p>กำลังเปิด PDF…</p>}>
            <div className="pp5-pdf">
              <PdfPreview url={v.pdf_file_url + '&inline=1'} />
            </div>
          </React.Suspense>
        )}
        {tab === 'excel' && (
          <>
            <p className="mb-3 text-xs text-slate-500">
              แสดงค่าที่บันทึกไว้ใน Excel โดยไม่คำนวณสูตรใหม่ แสดงตัวอย่างสูงสุด 500 แถวต่อชีต
              ดาวน์โหลดต้นฉบับเพื่อตรวจสูตรและรูปแบบทั้งหมด
            </p>
            {loading && <p>กำลังอ่าน Excel…</p>}
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
            {sheets.length > 0 && (
              <>
                <select
                  aria-label="แผ่นงาน Excel"
                  value={sheetIndex}
                  onChange={(e) => setSheetIndex(Number(e.target.value))}
                  className="border rounded p-2 text-xs mb-3"
                >
                  {sheets.map((s, i) => (
                    <option key={i} value={i}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <div className="overflow-auto max-h-[600px] border rounded-lg">
                  <table className="text-xs border-collapse w-full">
                    <tbody>
                      {sheets[sheetIndex]?.rows.slice(0, 500).map((row, i) => (
                        <tr key={i} className="even:bg-slate-50">
                          <th className="p-2 border bg-slate-100 sticky left-0">{i + 1}</th>
                          {row.map((cell, j) => (
                            <td key={j} className="p-2 border whitespace-nowrap max-w-sm truncate">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {!loading && !error && !sheets.length && (
              <p>ไม่พบแผ่นงานที่แสดงตัวอย่างได้ กรุณาดาวน์โหลดไฟล์เพื่อตรวจ</p>
            )}
          </>
        )}
        {tab === 'findings' && (
          <div className="space-y-4">
            {v.reviewer_notes && (
              <div className="p-4 rounded-xl border bg-slate-50 whitespace-pre-wrap text-sm">
                {v.reviewer_notes}
              </div>
            )}
            {v.findings?.map((f, i) => (
              <article key={i} className="border rounded-xl p-4 text-xs">
                <strong>{f.location}</strong>
                <p className="whitespace-pre-wrap my-2">{f.comment}</p>
                <small className="text-slate-500">
                  {new Date(f.at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
                </small>
              </article>
            ))}
            {v.annotated_file_url && (
              <button
                className="text-blue-800 text-xs underline"
                onClick={() =>
                  void download(v.annotated_file_url!, v.annotated_file_name || 'ผลตรวจ.pdf')
                }
              >
                ดาวน์โหลด PDF แนบผลตรวจ
              </button>
            )}
            {!v.reviewer_notes && !v.findings?.length && (
              <p className="text-sm text-slate-500">ยังไม่มีข้อค้นพบที่บันทึกในเวอร์ชันนี้</p>
            )}
            {canFind && (
              <form
                className="space-y-3 p-4 border rounded-xl bg-blue-50"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    await mutate('finding', {
                      id: submission.id,
                      expectedRevision: submission.revision,
                      location,
                      comment,
                      issueType,
                    })
                  ) {
                    setLocation('');
                    setComment('');
                  }
                }}
              >
                <h4 className="font-bold text-sm text-blue-900">บันทึกข้อค้นพบลงเวอร์ชันนี้</h4>
                <input
                  aria-label="ตำแหน่งข้อค้นพบ"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  placeholder="เช่น Excel ชีตคะแนน ช่อง F14 / PDF หน้า 4"
                  className="w-full border rounded-lg p-2 text-xs"
                />
                <select
                  aria-label="ประเภทข้อค้นพบ"
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="border rounded p-2 text-xs"
                >
                  <option value="COMPLETENESS">ความครบถ้วน</option>
                  <option value="FORMULA">สูตรคะแนน</option>
                  <option value="ATTENDANCE">เวลาเรียน</option>
                  <option value="TRAITS">คุณลักษณะ</option>
                  <option value="OTHER">อื่น ๆ</option>
                </select>
                <textarea
                  aria-label="ข้อเสนอแนะ"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  className="w-full border rounded-lg p-2 text-xs"
                />
                <button className="bg-blue-900 text-white rounded-lg px-4 py-2 text-xs">
                  บันทึกข้อค้นพบ
                </button>
              </form>
            )}
          </div>
        )}
        {tab === 'criteria' && (
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              'สัดส่วนคะแนนและสูตรตามรายวิชา',
              'เวลาเรียนและความครบถ้วนของนักเรียน',
              'คุณลักษณะอันพึงประสงค์',
              'การอ่าน คิดวิเคราะห์ และเขียน',
            ].map((label, i) => (
              <div key={i} className="p-4 border rounded-xl text-sm flex gap-2">
                <CheckCircle2
                  className={
                    'w-5 h-5 ' +
                    ([
                      v.validation_ratio_correct,
                      v.validation_attendance_correct,
                      v.validation_traits_correct,
                      v.validation_reading_analysis,
                    ][i]
                      ? 'text-emerald-600'
                      : 'text-slate-300')
                  }
                />
                {label}
              </div>
            ))}
            <p className="text-xs text-slate-500 sm:col-span-2">
              ผลจากการตรวจของผู้ตรวจที่ได้รับมอบหมาย การดูไฟล์ไม่เปลี่ยนผลตรวจโดยอัตโนมัติ
            </p>
          </div>
        )}
        {tab === 'drive' && (
          <div className="text-sm space-y-3">
            <h4 className="font-bold">ลิงก์เอกสารและโฟลเดอร์องค์กร</h4>
            {v.drive_file_url || organizationDriveUrl ? (
              <a
                href={v.drive_file_url || organizationDriveUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-800 underline inline-flex gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                เปิด Google Drive
              </a>
            ) : (
              <p className="text-slate-500">
                ผู้ดูแลยังไม่ได้ตั้งลิงก์ Google Drive ไฟล์ต้นฉบับยังดาวน์โหลดจากปุ่มด้านบนได้
              </p>
            )}
            <p className="text-xs text-slate-500">
              ไฟล์ที่ส่งผ่านระบบเก็บในพื้นที่ส่วนตัวของ PP5 การตั้งลิงก์นี้ไม่ได้คัดลอกไฟล์ไปยัง
              Google Drive อัตโนมัติ
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
export const DirectFileInspector = GradeSheetSimulator;
