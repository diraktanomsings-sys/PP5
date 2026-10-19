import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types/schema';
import { AdminSchoolLogoModal } from '../admin/AdminSchoolLogoModal';
import {
  Menu,
  ShieldCheck,
  Bell,
  ChevronDown,
  LogOut,
  HelpCircle,
  CheckCircle2,
  X,
  FileText,
  FolderUp,
  ExternalLink,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';

interface TopNavbarProps {
  onToggleSidebar: () => void;
  onMobileOpenSidebar: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onToggleSidebar,
  onMobileOpenSidebar,
}) => {
  const {
    currentUser,
    currentRole,
    switchRole,
    login,
    logout,
    users,
    setActiveView,
    activeView,
    submissions,
    activeTerm,
    schoolLogoUrl,
    changePassword,
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);

  // Change Password Modal State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('กรุณากรอกรหัสผ่านปัจจุบัน');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    const res = changePassword(currentUser.id, currentPassword, newPassword);
    if (!res.success) {
      setPasswordError(res.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
    } else {
      setPasswordSuccess('เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว!');
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setPasswordSuccess(null);
      }, 1500);
    }
  };

  const assignedRoles = currentUser.assigned_roles || [currentUser.role];
  const hasMultipleRoles = assignedRoles.length > 1;

  const pendingReviewCount = submissions.filter((s) => s.status === 'PENDING_REVIEW').length;
  const pendingDirectorCount = submissions.filter((s) => s.status === 'PENDING_DIRECTOR').length;
  const rejectedCount = submissions.filter((s) => s.status === 'REJECTED_REVISION').length;

  const handleRoleSwitch = (role: UserRole) => {
    switchRole(role);
    setIsUserMenuOpen(false);
  };

  const handleUserSwitch = (u: any) => {
    login(u);
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 shadow-2xs">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Left Zone: Sidebar Hamburger & Standard Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMobileOpenSidebar}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="เปิดเมนูด้านข้าง"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleSidebar}
              className="hidden lg:flex p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="ย่อ/ขยายเมนูด้านข้าง"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="hidden sm:inline text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              ระบบ ปพ.5 ออนไลน์ ดิจิทัล
            </span>
          </div>

          {/* Right Zone: Help, Notifications & User profile */}
          <div className="flex items-center gap-2.5">
            {/* Help Button */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-2 text-slate-500 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="คู่มือการใช้งานระบบ ปพ.5 ออนไลน์"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors relative cursor-pointer"
                title="การแจ้งเตือน"
              >
                <Bell className="w-4 h-4" />
                {(pendingReviewCount > 0 || rejectedCount > 0) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-800">การแจ้งเตือนระบบงาน ปพ.5</h4>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    {rejectedCount > 0 && (
                      <div
                        onClick={() => {
                          setShowNotifications(false);
                          setActiveView('teacher/dashboard');
                        }}
                        className="p-2.5 bg-rose-50 rounded-xl border border-rose-100 text-rose-800 cursor-pointer hover:bg-rose-100/60"
                      >
                        <p className="font-semibold">มีเอกสารส่งกลับแก้ไข {rejectedCount} รายวิชา</p>
                        <p className="text-[11px] text-rose-600 mt-0.5">วิชา ท13101 ภาษาไทย 3 ส่งกลับเพื่อแก้สูตร</p>
                      </div>
                    )}
                    {pendingReviewCount > 0 && (
                      <div
                        onClick={() => {
                          setShowNotifications(false);
                          if (currentRole === 'REVIEWER') {
                            setActiveView('reviewer/dashboard');
                          } else if (assignedRoles.includes('REVIEWER')) {
                            handleRoleSwitch('REVIEWER');
                          } else {
                            setActiveView('reviewer/dashboard');
                          }
                        }}
                        className="p-2.5 bg-blue-50 rounded-xl border border-blue-100 text-blue-800 cursor-pointer hover:bg-blue-100/60"
                      >
                        <p className="font-semibold">มีงานรอตรวจในคิว {pendingReviewCount} รายวิชา</p>
                        <p className="text-[11px] text-blue-600 mt-0.5">รอผู้ตรวจรับรองตามเกณฑ์ 4 ด้าน</p>
                      </div>
                    )}
                    {pendingDirectorCount > 0 && (
                      <div
                        onClick={() => {
                          setShowNotifications(false);
                          if (currentRole === 'EXECUTIVE') {
                            setActiveView('executive/dashboard');
                          } else if (assignedRoles.includes('EXECUTIVE')) {
                            handleRoleSwitch('EXECUTIVE');
                          } else {
                            setActiveView('executive/dashboard');
                          }
                        }}
                        className="p-2.5 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 cursor-pointer hover:bg-amber-100/60"
                      >
                        <p className="font-semibold">มีเอกสารรอ ผอ. ลงนาม {pendingDirectorCount} รายวิชา</p>
                        <p className="text-[11px] text-amber-600 mt-0.5">พร้อมสำหรับ Quick Batch Sign</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Header with RBAC indicator */}
            <div className="relative border-l border-slate-200 pl-4">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 text-left hover:bg-slate-50 p-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-slate-800">{currentUser.full_name}</div>
                  <div className="text-[10px] flex items-center justify-end gap-1 font-semibold text-blue-800 mt-0.5">
                    <span className="px-1.5 py-0.2 rounded bg-blue-100 border border-blue-200 font-mono">
                      {currentRole}
                    </span>
                    <span className="text-slate-400 font-normal">
                      ({assignedRoles.length > 1 ? `${assignedRoles.length} บทบาท` : '1 บทบาท'})
                    </span>
                  </div>
                </div>

                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white shadow-xs shrink-0">
                  {currentUser.full_name.slice(0, 2)}
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                  {/* User Profile Header */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        บัญชีผู้ใช้ปัจจุบัน
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {currentUser.teacher_id}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 mt-1">{currentUser.full_name}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.department}</p>
                  </div>

                  {/* Admin Specific Action */}
                  {currentRole === 'ADMIN' && (
                    <div className="p-2 border-b border-slate-100">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setShowLogoModal(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-xl text-xs text-amber-900 bg-amber-50 hover:bg-amber-100/80 font-bold transition-colors cursor-pointer border border-amber-200/80"
                      >
                        <ImageIcon className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>จัดการตราสัญลักษณ์โรงเรียน (เพิ่ม/ลบ)</span>
                      </button>
                    </div>
                  )}

                  {/* 2. Security & Password */}
                  <div className="p-2 border-b border-slate-100">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setPasswordError(null);
                        setPasswordSuccess(null);
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setShowChangePasswordModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-xl text-xs text-slate-700 hover:bg-slate-50 font-semibold transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>เปลี่ยนรหัสผ่านตนเอง (Change Password)</span>
                    </button>
                  </div>

                  {/* 3. Logout */}
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-xl text-xs text-rose-600 hover:bg-rose-50 font-semibold transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>ออกจากระบบ (Sign Out)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Manual / Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-700" />
                <span>คู่มือการใช้งานระบบ ปพ.5 ออนไลน์</span>
              </h4>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <h5 className="font-bold text-blue-900 mb-1">ขั้นตอนการจัดทำเอกสาร ปพ.5</h5>
                <ol className="list-decimal list-inside space-y-1 text-blue-950 text-[11px]">
                  <li>ครูผู้สอนบันทึกคะแนนเก็บและคะแนนปลายภาคในไฟล์ Excel อย่างครบถ้วน</li>
                  <li>Export ไฟล์รายงานผลการเรียนเป็นไฟล์ PDF สำหรับพิมพ์</li>
                  <li>อัปโหลดไฟล์คู่ (Excel + PDF) ในเมนู "ส่ง ปพ.5"</li>
                  <li>ผู้ตรวจเอกสารตรวจสอบเกณฑ์ 4 ด้าน และกดยืนยันรับรอง</li>
                  <li>ผู้อำนวยการลงนาม e-Signature และประทับตราดิจิทัลล็อกเล่มถาวร</li>
                </ol>
              </div>

              <p className="text-[11px] text-slate-500">
                หากพบปัญหาทางเทคนิค สามารถติดต่อกลุ่มงานสารสนเทศ เบอร์โทรศัพท์ภายใน 104
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-blue-800 text-white rounded-xl text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-700" />
                <span>เปลี่ยนรหัสผ่านตนเอง (Change Password)</span>
              </h4>
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs space-y-1">
              <div className="font-bold text-blue-900">{currentUser.full_name}</div>
              <div className="text-slate-600 text-[11px]">
                รหัสประจำตัว: <span className="font-mono">{currentUser.teacher_id}</span> · {currentUser.department}
              </div>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  รหัสผ่านปัจจุบัน *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านปัจจุบันของคุณ"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="กำหนดรหัสผ่านใหม่"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ยืนยันรหัสผ่านใหม่อีกครั้ง *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้งเพื่อยืนยัน"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/30 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00236f] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  บันทึกรหัสผ่านใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin School Logo Modal */}
      <AdminSchoolLogoModal
        isOpen={showLogoModal}
        onClose={() => setShowLogoModal(false)}
      />
    </>
  );
};
