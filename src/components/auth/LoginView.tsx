import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Lock,
  User as UserIcon,
  ArrowRight,
  Info,
  Eye,
  EyeOff,
  HelpCircle,
  Phone,
  Mail,
  AlertCircle,
  X,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { login, verifyCredentials, schoolLogoUrl } = useApp();

  const [citizenId, setCitizenId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Standard form submit with citizen ID or admin shortcut
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmed = citizenId.trim();
    if (!trimmed) {
      setErrorMessage('กรุณาระบุเลขประจำตัวประชาชน 13 หลัก หรือรหัสผู้ดูแลระบบ (admin)');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('กรุณาระบุรหัสผ่าน');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const res = verifyCredentials(trimmed, password);

      if (res.user) {
        setErrorMessage(null);
        login(res.user);
        if (onLoginSuccess) onLoginSuccess();
      } else {
        setErrorMessage(res.error || 'ไม่พบข้อมูลผู้ใช้นี้ในระบบ กรุณาตรวจสอบหรือติดต่อฝ่ายงานทะเบียนวัดผล');
      }
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00164e] via-[#00236f] to-slate-900 flex flex-col items-center justify-center p-4 py-8 relative">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-blue-200/40 animate-in fade-in zoom-in-95">
        {/* Crest & Banner */}
        <div className="p-6 sm:p-8 text-center bg-gradient-to-b from-blue-50/90 to-white border-b border-slate-100">
          <div className="w-28 h-28 mx-auto mb-3 flex items-center justify-center">
            <img
              src={schoolLogoUrl}
              alt="ตราประจำโรงเรียนบ้านคูเมือง"
              className="max-w-full max-h-full object-contain drop-shadow-sm"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#00236f] tracking-tight">
            โรงเรียนบ้านคูเมือง
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5">
            สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสิงห์บุรี (สพป.สิงห์บุรี)
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100/80 border border-blue-200 text-blue-900 rounded-full text-[11px] font-semibold mt-2.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
            <span>ระบบบันทึกและส่งผล ปพ.5 ออนไลน์ (e-PP5)</span>
          </div>
        </div>

        {/* Real Production Form */}
        <div className="p-6 sm:p-8 space-y-5">
          <div className="text-center sm:text-left">
            <h2 className="text-base font-bold text-slate-900">
              เข้าสู่ระบบบุคลากรทางการศึกษา
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ระบุเลขประจำตัวประชาชน 13 หลัก หรือรหัสผู้ดูแลระบบเพื่อเข้าใช้งาน
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2 shadow-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
            {/* Citizen ID or Admin Username */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                เลขประจำตัวประชาชน 13 หลัก / อีเมล / ชื่อผู้ใช้ *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  maxLength={80}
                  required
                  value={citizenId}
                  onChange={(e) => {
                    setCitizenId(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="เช่น 3310400010999, อีเมล หรือ admin"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 text-xs transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-slate-700">
                  รหัสผ่าน (Password) *
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold hover:underline cursor-pointer"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="กรอกรหัสผ่านของคุณ"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 text-xs transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                * บุคลากรทั่วไปใช้รหัสเริ่มต้น หรือเลขวันเดือนปีเกิด 8 หลัก (ววดดปปปป)
              </p>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-slate-600 text-xs font-medium">จดจำการเข้าสู่ระบบบนอุปกรณ์นี้</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#00236f] hover:bg-blue-900 active:scale-[0.99] text-white rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              <span>{isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ (Sign In)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Governance Notice */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2.5 leading-relaxed">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              ระบบรักษาความปลอดภัยตามมาตรฐานธรรมาภิบาลข้อมูล สพป.สิงห์บุรี และ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) ทุกเซสชันมีการบันทึก Audit Logs
            </span>
          </div>

          {/* Support help button */}
          <div className="text-center pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-800 font-medium transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>ติดต่อผู้ดูแลระบบ / งานทะเบียนวัดผล</span>
            </button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-blue-200/70 mt-4 text-center">
        © 2569 โรงเรียนบ้านคูเมือง · สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสิงห์บุรี · All Rights Reserved
      </p>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-700" />
                <span>ความช่วยเหลือและการเข้าสู่ระบบ</span>
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                หากคุณครูหรือบุคลากรทางการศึกษาไม่สามารถเข้าสู่ระบบได้ หรือลืมรหัสผ่าน กรุณาติดต่อ:
              </p>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2 text-xs">
                <div className="font-bold text-blue-950">กลุ่มงานทะเบียนวัดผลและสารสนเทศ</div>
                <div className="flex items-center gap-2 text-blue-900">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>โทร. 044-699-123 (ห้องวิชาการ)</span>
                </div>
                <div className="flex items-center gap-2 text-blue-900">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>aditsorn.t@khumuang.ac.th</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                * ผู้ดูแลระบบสามารถตรวจสอบและรีเซ็ตรหัสผ่าน รวมถึงปรับสิทธิ์ตามคำสั่งโรงเรียนได้ตลอดเวลา
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-[#00236f] hover:bg-blue-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
