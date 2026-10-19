import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types/schema';
import schoolLogo from '../../assets/schoolLogo';
import {
  School,
  Calendar,
  Clock,
  UserCheck,
  ChevronDown,
  Shield,
  FileSpreadsheet,
  CheckCircle2,
  Settings,
  Bell,
  LogOut,
  Sparkles,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    users,
    activeTerm,
    activeView,
    setActiveView,
    submissions,
  } = useApp();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Compute counts for notification indicator
  const pendingReviewCount = submissions.filter((s) => s.status === 'PENDING_REVIEW').length;
  const pendingDirectorCount = submissions.filter((s) => s.status === 'PENDING_DIRECTOR').length;
  const rejectedCount = submissions.filter((s) => s.status === 'REJECTED_REVISION').length;

  const handleRoleChange = (role: UserRole) => {
    const userForRole = users.find((u) => u.role === role);
    if (userForRole) {
      setCurrentUser(userForRole);
      // Route to default dashboard for role
      switch (role) {
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
    }
    setIsRoleDropdownOpen(false);
  };

  const getRoleTitleThai = (role: UserRole) => {
    switch (role) {
      case 'TEACHER':
        return 'ครูผู้สอน (Teacher)';
      case 'REVIEWER':
        return 'ผู้ตรวจเอกสาร (Reviewer)';
      case 'EXECUTIVE':
        return 'ผู้อำนวยการ (Executive)';
      case 'ADMIN':
        return 'ผู้ดูแลระบบ (Admin)';
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'TEACHER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REVIEWER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'EXECUTIVE':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'ADMIN':
        return 'bg-slate-800 text-slate-100 border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner Notice: Official Thai Public School Info */}
      <div className="bg-[#00236f] text-white px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-wide">สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสิงห์บุรี (สพป.สิงห์บุรี)</span>
          <span className="text-blue-200 hidden sm:inline">|</span>
          <span className="text-blue-100 hidden sm:inline">ระบบจัดเก็บเอกสาร ปพ.5 ดิจิทัลตามหลักสูตรแกนกลาง พ.ศ. 2551</span>
        </div>
        <div className="flex items-center gap-3 text-blue-100 font-mono text-[11px]">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-300" />
            <span>ปีการศึกษา {activeTerm.year} ภาคเรียนที่ {activeTerm.semester}</span>
          </span>
          <span className="hidden md:flex items-center gap-1 text-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>กำหนดส่ง: 15 ต.ค. 2569</span>
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Zone 1: Brand Wordmark & School Crest */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 overflow-hidden shrink-0 flex items-center justify-center">
              <img
                src={schoolLogo}
                alt="ตราโรงเรียนบ้านคูเมือง"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <button
                onClick={() => {
                  if (currentUser.role === 'TEACHER') setActiveView('teacher/dashboard');
                  else if (currentUser.role === 'REVIEWER') setActiveView('reviewer/dashboard');
                  else if (currentUser.role === 'EXECUTIVE') setActiveView('executive/dashboard');
                  else setActiveView('admin/dashboard');
                }}
                className="text-left group cursor-pointer"
              >
                <h1 className="text-base sm:text-lg font-bold text-[#00236f] group-hover:text-blue-800 transition-colors leading-tight">
                  ระบบ ปพ.5 ออนไลน์ โรงเรียนบ้านคูเมือง
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Khumuang Academic Portal · Four-Eyes Principle Standard
                </p>
              </button>
            </div>
          </div>

          {/* Zone 2: Role-based Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            {currentUser.role === 'TEACHER' && (
              <>
                <button
                  onClick={() => setActiveView('teacher/dashboard')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeView === 'teacher/dashboard'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ภาพรวมรายวิชา
                </button>
                <button
                  onClick={() => setActiveView('teacher/submit')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeView === 'teacher/submit'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  + ส่ง ปพ.5 ใหม่ (Excel+PDF)
                </button>
              </>
            )}

            {currentUser.role === 'REVIEWER' && (
              <>
                <button
                  onClick={() => setActiveView('reviewer/dashboard')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeView.startsWith('reviewer')
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  คิวตรวจสอบ ({pendingReviewCount})
                </button>
                <button
                  onClick={() => setActiveView('reviewer/revisions')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeView === 'reviewer/revisions'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  รายการส่งกลับแก้ไข ({rejectedCount})
                </button>
              </>
            )}

            {currentUser.role === 'EXECUTIVE' && (
              <>
                <button
                  onClick={() => setActiveView('executive/dashboard')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeView === 'executive/dashboard'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  สรุปงานรอลงนาม ({pendingDirectorCount})
                </button>
                <button
                  onClick={() => setActiveView('executive/metrics')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeView === 'executive/metrics'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ตัวชี้วัดโรงเรียน
                </button>
              </>
            )}

            {currentUser.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => setActiveView('admin/dashboard')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeView === 'admin/dashboard'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ภาพรวม
                </button>
                <button
                  onClick={() => setActiveView('admin/courses')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeView === 'admin/courses'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  รายวิชา
                </button>
                <button
                  onClick={() => setActiveView('admin/assign-reviewers')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeView === 'admin/assign-reviewers'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Four-Eyes
                </button>
                <button
                  onClick={() => setActiveView('admin/users')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeView === 'admin/users'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  บุคลากร
                </button>
                <button
                  onClick={() => setActiveView('admin/calendar')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeView === 'admin/calendar'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ปฏิทิน
                </button>
                <button
                  onClick={() => setActiveView('admin/archive')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeView === 'admin/archive'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  คลัง ปพ.5
                </button>
                <button
                  onClick={() => setActiveView('admin/audit-logs')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    activeView === 'admin/audit-logs'
                      ? 'bg-white text-blue-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Audit Logs
                </button>
              </>
            )}
          </nav>

          {/* Zone 3: Role Switcher & User Profile Controls */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Role Switcher (Crucial for exploring all 4 roles) */}
            <div className="relative">
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-800 transition-colors border border-slate-300"
                title="สลับบทบาทเพื่อทดสอบระบบ"
              >
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getRoleBadgeColor(currentUser.role)}`}>
                  {currentUser.role}
                </span>
                <span className="hidden sm:inline max-w-[110px] truncate">{currentUser.full_name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      สลับบทบาททดสอบ (Quick Switch Role)
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      เลือกเข้าใช้งานในฐานะผู้มีส่วนได้ส่วนเสีย 4 กลุ่ม
                    </p>
                  </div>

                  <div className="p-1 space-y-1">
                    <button
                      onClick={() => handleRoleChange('TEACHER')}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition-colors ${
                        currentUser.role === 'TEACHER' ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-medium">ครูผู้สอน (TEACHER)</div>
                        <div className="text-[11px] text-slate-500">อ.ประภาภรณ์ สมบูรณ์ (ภาษาไทย)</div>
                      </div>
                      {currentUser.role === 'TEACHER' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </button>

                    <button
                      onClick={() => handleRoleChange('REVIEWER')}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition-colors ${
                        currentUser.role === 'REVIEWER' ? 'bg-purple-50 text-purple-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-medium">ผู้ตรวจเอกสาร (REVIEWER)</div>
                        <div className="text-[11px] text-slate-500">ครูกิตติศักดิ์ ชัยสิทธิ์ (หัวหน้าวิชาการ)</div>
                      </div>
                      {currentUser.role === 'REVIEWER' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                    </button>

                    <button
                      onClick={() => handleRoleChange('EXECUTIVE')}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition-colors ${
                        currentUser.role === 'EXECUTIVE' ? 'bg-amber-50 text-amber-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-medium">ผู้บริหาร / ผู้อำนวยการ (EXECUTIVE)</div>
                        <div className="text-[11px] text-slate-500">ดร.วิรัตน์ ถนอมสิงห์ (ผอ.โรงเรียน)</div>
                      </div>
                      {currentUser.role === 'EXECUTIVE' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                    </button>

                    <button
                      onClick={() => handleRoleChange('ADMIN')}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition-colors ${
                        currentUser.role === 'ADMIN' ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-medium">ผู้ดูแลระบบ (ADMIN)</div>
                        <div className="text-[11px] text-slate-500">นายอดิศร เทพบันเทิง (สารสนเทศ/ทะเบียน)</div>
                      </div>
                      {currentUser.role === 'ADMIN' && <CheckCircle2 className="w-4 h-4 text-slate-900" />}
                    </button>

                    <div className="pt-1 mt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setIsRoleDropdownOpen(false);
                          setActiveView('login');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-xs text-rose-600 hover:bg-rose-50 font-medium transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>ออกจากระบบ (ไปยังหน้า Login)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
                title="การแจ้งเตือน"
              >
                <Bell className="w-4 h-4" />
                {(pendingReviewCount > 0 || rejectedCount > 0) && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50">
                  <h4 className="text-xs font-bold text-slate-800 mb-2">การแจ้งเตือนระบบงาน ปพ.5</h4>
                  <div className="space-y-2 text-xs">
                    {rejectedCount > 0 && (
                      <div
                        onClick={() => {
                          setShowNotifications(false);
                          setActiveView('teacher/dashboard');
                        }}
                        className="p-2 bg-rose-50 rounded-lg border border-rose-100 text-rose-800 cursor-pointer hover:bg-rose-100/60"
                      >
                        <p className="font-semibold">มีเอกสารส่งกลับแก้ไข {rejectedCount} รายวิชา</p>
                        <p className="text-[11px] text-rose-600 mt-0.5">วิชา ท13101 ภาษาไทย 3 ส่งกลับเพื่อแก้สูตรคะแนน</p>
                      </div>
                    )}
                    {pendingReviewCount > 0 && (
                      <div
                        onClick={() => {
                          setShowNotifications(false);
                          handleRoleChange('REVIEWER');
                        }}
                        className="p-2 bg-blue-50 rounded-lg border border-blue-100 text-blue-800 cursor-pointer hover:bg-blue-100/60"
                      >
                        <p className="font-semibold">มีงานรอตรวจในคิว {pendingReviewCount} รายวิชา</p>
                        <p className="text-[11px] text-blue-600 mt-0.5">วิชา ค13101 คณิตศาสตร์ และ ว21101</p>
                      </div>
                    )}
                    {pendingDirectorCount > 0 && (
                      <div
                        onClick={() => {
                          setShowNotifications(false);
                          handleRoleChange('EXECUTIVE');
                        }}
                        className="p-2 bg-amber-50 rounded-lg border border-amber-100 text-amber-800 cursor-pointer hover:bg-amber-100/60"
                      >
                        <p className="font-semibold">มีเอกสารรอ ผอ. ลงนาม {pendingDirectorCount} รายวิชา</p>
                        <p className="text-[11px] text-amber-600 mt-0.5">ผ่านการตรวจ 100% พร้อม Final Lock</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
