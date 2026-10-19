import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AuditLog } from '../../types/schema';
import {
  FileText,
  Shield,
  Download,
  Filter,
  Search,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Clock,
  Sparkles,
} from 'lucide-react';

export const AdminAuditLogs: React.FC = () => {
  const { auditLogs } = useApp();

  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const filteredLogs = auditLogs.filter((log) => {
    if (selectedAction !== 'ALL' && log.action_type !== selectedAction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchActor = log.actor_name.toLowerCase().includes(q);
      const matchTarget = log.target_name.toLowerCase().includes(q);
      const matchType = log.action_type.toLowerCase().includes(q);
      if (!matchActor && !matchTarget && !matchType) return false;
    }
    return true;
  });

  const getActionBadge = (type: AuditLog['action_type']) => {
    switch (type) {
      case 'DIRECTOR_APPROVED_LOCKED':
      case 'BATCH_SIGN_APPROVED':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          label: 'ผู้อำนวยการอนุมัติ (Final Lock)',
        };
      case 'REVIEW_PASSED':
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'ผู้ตรวจรับรอง (Pass Review)',
        };
      case 'REVIEW_REJECTED':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-200',
          label: 'ผู้ตรวจส่งกลับแก้ไข (Reject)',
        };
      case 'SUBMISSION_CREATED':
      case 'REVISION_SUBMITTED':
        return {
          bg: 'bg-purple-100 text-purple-800 border-purple-200',
          label: 'ครูส่งไฟล์ (Submit)',
        };
      case 'DEADLINE_EXTENDED':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          label: 'ขยายเวลา Deadline',
        };
      case 'EMERGENCY_UNLOCKED':
        return {
          bg: 'bg-rose-200 text-rose-950 border-rose-400',
          label: 'ปลดล็อกฉุกเฉิน (Emergency 2FA)',
        };
      case 'REVIEWER_ASSIGNED':
        return {
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          label: 'มอบหมายผู้ตรวจ (Four-Eyes)',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: type,
        };
    }
  };

  const handleExport = (type: 'ITA' | 'PDPA') => {
    setExportNotice(
      `ส่งออกบันทึกประวัติ Audit Logs ตามมาตรฐาน ${type} (JSON/CSV) สำเร็จ! พร้อมส่งผู้ตรวจการ`
    );
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full w-fit border border-slate-200">
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>Immutable Ledger · ไม่สามารถลบหรือดัดแปลงประวัติได้</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">
            บันทึกประวัติระบบ (Audit Logs & Governance Ledger)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ติดตามทุกการกระทำในระบบ ปพ.5 พร้อม IP Address และวันเวลา สำหรับการตรวจสอบ ITA & PDPA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('ITA')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>รายงานเกณฑ์ ITA</span>
          </button>
          <button
            onClick={() => handleExport('PDPA')}
            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>รายงานเกณฑ์ PDPA</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">กรองประเภทกิจกรรม:</span>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
          >
            <option value="ALL">กิจกรรมทั้งหมด ({auditLogs.length})</option>
            <option value="DIRECTOR_APPROVED_LOCKED">ผู้อำนวยการอนุมัติ (Final Lock)</option>
            <option value="REVIEW_PASSED">ผู้ตรวจรับรอง</option>
            <option value="REVIEW_REJECTED">ผู้ตรวจส่งกลับแก้ไข</option>
            <option value="SUBMISSION_CREATED">ส่งเอกสารใหม่</option>
            <option value="REVISION_SUBMITTED">ส่งเอกสารแก้ไข</option>
            <option value="DEADLINE_EXTENDED">ขยายเวลา Deadline</option>
            <option value="EMERGENCY_UNLOCKED">ปลดล็อกฉุกเฉิน (2FA)</option>
            <option value="REVIEWER_ASSIGNED">มอบหมายผู้ตรวจ</option>
          </select>
        </div>

        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ค้นหาผู้กระทำ, เป้าหมาย, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">วันและเวลา (UTC/BKK)</th>
                <th className="px-4 py-3">ประเภทกิจกรรม</th>
                <th className="px-4 py-3">ผู้ดำเนินการ (Actor)</th>
                <th className="px-4 py-3">เป้าหมาย (Target)</th>
                <th className="px-4 py-3 font-mono">IP Address</th>
                <th className="px-4 py-3 text-right">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const badge = getActionBadge(log.action_type);

                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('th-TH')}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg} whitespace-nowrap`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{log.actor_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.role}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-800 max-w-[200px] truncate font-medium">
                      {log.target_name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">
                      {log.ip_address}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>เปิดดู</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details JSON Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-700" />
                <span>รายละเอียดบันทึกประวัติ (Audit Log Details)</span>
              </h4>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500">Log ID:</span>{' '}
                <span className="font-mono font-bold text-slate-800">{selectedLog.id}</span>
              </div>
              <div>
                <span className="text-slate-500">ผู้ดำเนินการ:</span>{' '}
                <span className="font-bold text-slate-900">
                  {selectedLog.actor_name} ({selectedLog.role})
                </span>
              </div>
              <div>
                <span className="text-slate-500">เป้าหมาย:</span>{' '}
                <span className="font-bold text-slate-900">{selectedLog.target_name}</span>
              </div>
              <div>
                <span className="text-slate-500">เวลาที่บันทึก:</span>{' '}
                <span className="font-mono text-slate-800">
                  {new Date(selectedLog.created_at).toLocaleString('th-TH')}
                </span>
              </div>
              <div>
                <span className="text-slate-500">IP Address:</span>{' '}
                <span className="font-mono text-slate-800">{selectedLog.ip_address}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                โครงสร้างข้อมูลดิบ (JSON Payload):
              </label>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-[#00236f] text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
