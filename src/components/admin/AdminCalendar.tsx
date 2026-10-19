import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
} from 'lucide-react';

export const AdminCalendar: React.FC = () => {
  const { activeTerm, extendDeadline } = useApp();

  const [newDeadlineDate, setNewDeadlineDate] = useState('2026-10-20T23:59');
  const [officialReason, setOfficialReason] = useState(
    'คำสั่งโรงเรียนบ้านคูเมือง ที่ 145/2569 เรื่อง ขยายเวลาส่งแบบ ปพ.5 เนื่องจากครูติดภารกิจนำนักเรียนเข้าร่วมแข่งขันศิลปหัตถกรรมนักเรียน ระดับเขตพื้นที่'
  );
  const [approverName, setApproverName] = useState(
    'ดร.วิรัตน์ ถนอมสิงห์ (ผู้อำนวยการโรงเรียนบ้านคูเมือง)'
  );
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const scheduleSteps = [
    {
      step: 1,
      title: 'ครูผู้สอนส่งไฟล์คู่ (Excel + PDF)',
      period: '1 - 15 ต.ค. 2569',
      status: 'CURRENT',
      desc: 'ตรวจความถูกต้องของคะแนนตัวชี้วัดและเวลาเรียน 80%',
    },
    {
      step: 2,
      title: 'ผู้ตรวจตรวจสอบตามเกณฑ์ 4 ด้าน',
      period: '16 - 22 ต.ค. 2569',
      status: 'UPCOMING',
      desc: 'หัวหน้ากลุ่มสาระและงานทะเบียนตรวจรับรองหรือส่งกลับแก้ไข',
    },
    {
      step: 3,
      title: 'การส่งกลับแก้ไขรอบสุดท้าย (Revisions Window)',
      period: '23 - 25 ต.ค. 2569',
      status: 'UPCOMING',
      desc: 'ครูอัปโหลดไฟล์แก้ไข V002 / V003 ตามจุดบกพร่องที่คอมเมนต์',
    },
    {
      step: 4,
      title: 'ผู้อำนวยการลงนาม e-Signature & ประทับตรา',
      period: '26 - 28 ต.ค. 2569',
      status: 'UPCOMING',
      desc: 'สร้าง Digital Certificate Hash (SHA-256) และ Final Lock',
    },
    {
      step: 5,
      title: 'จัดเก็บเข้าคลัง ปพ.5 กลางถาวรและส่ง สพป.สิงห์บุรี',
      period: '31 ต.ค. 2569',
      status: 'UPCOMING',
      desc: 'จัดเก็บเข้าโฟลเดอร์ Google Drive รวมองค์กรถาวร และออกรายงานความสมบูรณ์ 100% รายชั้นส่ง สพป.สิงห์บุรี',
    },
  ];

  const handleExtendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    extendDeadline(activeTerm.id, newDeadlineDate + ':00Z', officialReason, approverName);
    setSuccessMsg('ขยายเวลา Deadline สำเร็จ และบันทึกเข้าสู่ Audit Trail เรียบร้อยแล้ว!');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          ปฏิทินกำหนดการส่งเกรด & ขยายเวลา Deadline
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          กำกับกระบวนการส่ง ปพ.5 5 ขั้นตอน และควบคุมระเบียบการขยายเวลาส่งเกรดทางราชการ
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 5-Step Calendar Schedule Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-700" />
          <span>ปฏิทินกำหนดการ 5 ขั้นตอน ประจำภาคเรียนที่ {activeTerm.semester}/{activeTerm.year}</span>
        </h3>

        <div className="space-y-3">
          {scheduleSteps.map((s) => (
            <div
              key={s.step}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                s.status === 'CURRENT'
                  ? 'bg-blue-50/70 border-blue-300'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold font-mono text-xs shrink-0 ${
                    s.status === 'CURRENT'
                      ? 'bg-blue-800 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {s.step}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{s.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span className="font-semibold text-slate-700 px-2.5 py-1 rounded bg-white border border-slate-200">
                  {s.period}
                </span>
                {s.status === 'CURRENT' && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[10px]">
                    ช่วงเวลาปัจจุบัน
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deadline Extension Form */}
      <div className="bg-white rounded-xl border border-amber-200 bg-amber-50/20 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-amber-700" />
          <h3 className="text-sm font-bold text-slate-900">
            แบบฟอร์มขอขยายเวลาส่งเอกสาร (Deadline Extension Form)
          </h3>
        </div>
        <p className="text-xs text-slate-600 mb-4">
          การขยายเวลาจะทำการบันทึกเป็นประวัติทางราชการ (Audit Trail) เพื่อการตรวจสอบความโปร่งใส ITA & PDPA
        </p>

        <form onSubmit={handleExtendSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                กำหนดส่งปัจจุบัน (Current Deadline)
              </label>
              <input
                type="text"
                disabled
                value={new Date(activeTerm.submission_deadline).toLocaleString('th-TH')}
                className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                กำหนดเวลาส่งใหม่ที่ต้องการขยาย (New Extended Deadline) *
              </label>
              <input
                type="datetime-local"
                required
                value={newDeadlineDate}
                onChange={(e) => setNewDeadlineDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              เหตุผลความจำเป็นทางราชการ (Official Administrative Reason) *
            </label>
            <textarea
              required
              rows={3}
              value={officialReason}
              onChange={(e) => setOfficialReason(e.target.value)}
              placeholder="ระบุเลขที่คำสั่งโรงเรียน หรือเหตุผลทางราชการ..."
              className="w-full p-3 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              ผู้มีอำนาจอนุมัติคำสั่ง (Authorized Commander) *
            </label>
            <input
              type="text"
              required
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="เช่น ดร.วิรัตน์ ถนอมสิงห์ ผู้อำนวยการโรงเรียนบ้านคูเมือง"
              className="w-full p-2.5 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ยืนยันคำสั่งขยายเวลาส่งเกรด & บันทึก Audit Log</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
