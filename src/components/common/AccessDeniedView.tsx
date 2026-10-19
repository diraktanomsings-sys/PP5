import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldAlert, ArrowLeft, RefreshCw, Lock, CheckCircle2 } from 'lucide-react';

interface AccessDeniedViewProps {
  requiredRole?: string;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({ requiredRole }) => {
  const { currentRole, currentUser, switchRole, setActiveView } = useApp();

  const handleReturnToDashboard = () => {
    switch (currentRole) {
      case 'TEACHER':
        setActiveView('teacher/dashboard');
        break;
      case 'REVIEWER':
        setActiveView('reviewer/dashboard');
        break;
      case 'EXECUTIVE':
        setActiveView('executive/dashboard');
        break;
      case 'ADMIN':
        setActiveView('admin/dashboard');
        break;
    }
  };

  const hasAlternativeRole = currentUser.assigned_roles && currentUser.assigned_roles.length > 1;

  // Check if current user has the required role in their assigned_roles
  const matchingRole = currentUser.assigned_roles?.find((r) =>
    requiredRole?.toUpperCase().includes(r)
  );

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-rose-200 p-8 text-center shadow-lg space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 font-mono text-xs font-bold">
            HTTP 403 · FORBIDDEN
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-3">
            ไม่ได้รับอนุญาตให้เข้าถึงหน้านี้
          </h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            ระบบตรวจสอบพบว่าบทบาทปัจจุบันของคุณคือ{' '}
            <span className="font-bold text-slate-800 font-mono">[{currentRole}]</span>{' '}
            ซึ่งไม่มีสิทธิ์เข้าถึงส่วนงาน{requiredRole ? `สำหรับบทบาท [${requiredRole}]` : 'ที่ร้องขอ'}
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 text-left space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">ผู้ใช้งาน:</span>
            <span className="font-semibold text-slate-800">{currentUser.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">บทบาทปัจจุบัน:</span>
            <span className="font-semibold text-blue-800 font-mono">{currentRole}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">สิทธิ์ที่ได้รับมอบหมาย:</span>
            <span className="font-semibold text-slate-800 font-mono">
              {currentUser.assigned_roles?.join(', ') || currentRole}
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {matchingRole ? (
            <button
              onClick={() => switchRole(matchingRole)}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>สลับเป็นบทบาท {matchingRole} ทันที</span>
            </button>
          ) : (
            <button
              onClick={handleReturnToDashboard}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#00236f] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับหน้าหลัก {currentRole}</span>
            </button>
          )}

          {hasAlternativeRole && (
            <button
              onClick={() => setActiveView('select-role')}
              className="w-full sm:w-auto px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>เลือกบทบาทอื่น</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
