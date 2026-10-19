import React from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types/schema';
import schoolLogo from '../../assets/schoolLogo';
import {
  LayoutDashboard,
  FileText,
  FileUp,
  CheckSquare,
  Award,
  Archive,
  CalendarCheck,
  Settings,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  School,
  X,
  RefreshCw,
  Users,
  ShieldCheck,
  Clock,
  Stamp,
  Activity,
  Layers,
  Search,
  LogOut,
  FolderUp,
  ExternalLink,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  isMobileOpen,
  onMobileClose,
}) => {
  const {
    activeView,
    setActiveView,
    activeTerm,
    currentUser,
    currentRole,
    switchRole,
    logout,
    submissions,
    organizationDriveUrl,
    organizationDriveFolderId,
    schoolLogoUrl,
  } = useApp();

  const assignedRoles = currentUser.assigned_roles || [currentUser.role];
  const hasMultipleRoles = assignedRoles.length > 1;

  // Counts for badge
  const pendingReviewCount = submissions.filter((s) => s.status === 'PENDING_REVIEW').length;
  const pendingDirectorCount = submissions.filter((s) => s.status === 'PENDING_DIRECTOR').length;
  const rejectedCount = submissions.filter((s) => s.status === 'REJECTED_REVISION').length;

  // Role-Specific Navigation Menu Definitions (Requirement 2)
  const getNavItemsByRole = (role: UserRole) => {
    switch (role) {
      case 'TEACHER':
        return [
          {
            id: 'teacher/dashboard',
            label: 'Dashboard ครู',
            icon: LayoutDashboard,
          },
          {
            id: 'teacher/my-courses',
            label: 'ปพ.5 ของฉัน',
            icon: FileText,
          },
          {
            id: 'teacher/submit',
            label: 'ส่ง ปพ.5 (Dual Upload)',
            icon: FileUp,
            badge: 'ใหม่',
          },
          {
            id: 'teacher/detail',
            label: 'ติดตามผลตรวจ & แก้ไข',
            icon: Activity,
            badgeCount: rejectedCount > 0 ? rejectedCount : undefined,
            badgeColor: 'bg-rose-500',
          },
          {
            id: 'admin/archive',
            label: 'คลัง ปพ.5 รายเทอม/ปีย้อนหลัง',
            icon: Archive,
          },
        ];

      case 'REVIEWER':
        return [
          {
            id: 'reviewer/dashboard',
            label: 'คิวงานรอตรวจเอกสาร',
            icon: CheckSquare,
            badgeCount: pendingReviewCount > 0 ? pendingReviewCount : undefined,
            badgeColor: 'bg-blue-500',
          },
          {
            id: 'reviewer/revisions',
            label: 'รายการส่งกลับแก้ไข',
            icon: Clock,
            badgeCount: rejectedCount > 0 ? rejectedCount : undefined,
            badgeColor: 'bg-rose-500',
          },
          {
            id: 'reviewer/verify',
            label: 'ตรวจประเมินผลสัมฤทธิ์',
            icon: ShieldCheck,
          },
          {
            id: 'admin/archive',
            label: 'คลัง ปพ.5 รายเทอม/ปีย้อนหลัง',
            icon: Archive,
          },
        ];

      case 'EXECUTIVE':
        return [
          {
            id: 'executive/dashboard',
            label: 'สรุปงานรอลงนามอนุมัติ',
            icon: LayoutDashboard,
            badgeCount: pendingDirectorCount > 0 ? pendingDirectorCount : undefined,
            badgeColor: 'bg-amber-500',
          },
          {
            id: 'executive/approve',
            label: 'ลงนาม e-Signature & ล็อกเล่ม',
            icon: Stamp,
          },
          {
            id: 'executive/metrics',
            label: 'ตัวชี้วัดผลสัมฤทธิ์โรงเรียน',
            icon: Award,
          },
          {
            id: 'admin/archive',
            label: 'คลัง ปพ.5 ที่อนุมัติแล้ว',
            icon: Archive,
          },
        ];

      case 'ADMIN':
        return [
          {
            id: 'admin/dashboard',
            label: 'ภาพรวมระบบ & Bottlenecks',
            icon: Activity,
          },
          {
            id: 'admin/courses',
            label: 'จัดการโครงสร้างรายวิชา',
            icon: Layers,
          },
          {
            id: 'admin/users',
            label: 'จัดการบุคลากร & สิทธิ์ RBAC',
            icon: Users,
          },
          {
            id: 'admin/assign-reviewers',
            label: 'Four-Eyes มอบหมายผู้ตรวจ',
            icon: ShieldCheck,
          },
          {
            id: 'admin/calendar',
            label: 'ปฏิทินงาน & ขยาย Deadline',
            icon: CalendarCheck,
          },
          {
            id: 'admin/terms',
            label: 'ปีการศึกษา & ภาคเรียน',
            icon: Clock,
          },
          {
            id: 'admin/archive',
            label: 'คลัง ปพ.5 & ปลดล็อกด้วยรหัสผ่าน',
            icon: Archive,
          },
          {
            id: 'admin/audit-logs',
            label: 'Audit Logs (ITA & PDPA)',
            icon: FileText,
          },
        ];
    }
  };

  const navItems = getNavItemsByRole(currentRole);

  const getRoleHeaderInfo = (role: UserRole) => {
    switch (role) {
      case 'TEACHER':
        return {
          label: 'บทบาท: ครูผู้สอน',
          color: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
        };
      case 'REVIEWER':
        return {
          label: 'บทบาท: ผู้ตรวจเอกสาร',
          color: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
        };
      case 'EXECUTIVE':
        return {
          label: 'บทบาท: ผู้อำนวยการ',
          color: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
        };
      case 'ADMIN':
        return {
          label: 'บทบาท: ผู้ดูแลระบบ',
          color: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
        };
    }
  };

  const roleInfo = getRoleHeaderInfo(currentRole);

  const handleNavClick = (viewId: string) => {
    setActiveView(viewId === 'teacher/my-courses' ? 'teacher/dashboard' : viewId);
    onMobileClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden animate-in fade-in"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#0b1736] text-white transition-all duration-300 ease-in-out border-r border-blue-950/60 shadow-xl ${
          isOpen ? 'w-64' : 'w-20'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Sidebar Brand Header */}
        <div className="flex items-center justify-between p-4 border-b border-blue-900/50 bg-[#08122d]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-lg bg-white p-0.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              <img
                src={schoolLogoUrl}
                alt="ตราโรงเรียนบ้านคูเมือง"
                className="w-full h-full object-contain"
              />
            </div>
            {isOpen && (
              <div className="overflow-hidden animate-in fade-in">
                <h1 className="text-sm font-bold text-white tracking-wide truncate">
                  โรงเรียนบ้านคูเมือง
                </h1>
                <p className="text-[11px] text-blue-200/70 truncate font-light">
                  สพป.สิงห์บุรี · ระบบ ปพ.5
                </p>
              </div>
            )}
          </div>

          {/* Desktop Toggle Button */}
          <button
            onClick={onToggle}
            className="hidden lg:flex p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-blue-900/60 transition-colors cursor-pointer"
            title={isOpen ? 'ย่อแถบเมนู' : 'ขยายแถบเมนู'}
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-blue-900/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Role Badge */}
        {isOpen && (
          <div className="px-4 py-2.5 bg-[#0e1d45] border-b border-blue-900/30 flex items-center justify-between">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.color}`}
            >
              {roleInfo.label}
            </span>

            {/* Quick Switch Role button if user has multiple assigned roles */}
            {hasMultipleRoles && (
              <button
                onClick={() => setActiveView('select-role')}
                className="text-[10px] text-amber-300 hover:text-white font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                title="สลับบทบาทการปฏิบัติงาน"
              >
                <RefreshCw className="w-3 h-3" />
                <span>สลับสิทธิ์</span>
              </button>
            )}
          </div>
        )}

        {/* Dynamic Navigation Section based on Current Role */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            {isOpen && (
              <div className="flex items-center justify-between px-3 mb-2">
                <p className="text-[10px] font-semibold text-blue-300/60 uppercase tracking-wider">
                  เมนูประจำบทบาท ({currentRole})
                </p>
              </div>
            )}

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  activeView === item.id ||
                  (item.id === 'teacher/my-courses' && activeView === 'teacher/dashboard');

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                      isActive
                        ? 'bg-[#1e3a8a] text-white font-semibold shadow-md border border-blue-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-blue-900/40'
                    }`}
                    title={!isOpen ? item.label : undefined}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isActive
                          ? 'text-white scale-110'
                          : 'text-blue-300/80 group-hover:text-white'
                      }`}
                    />
                    {isOpen && <span className="truncate flex-1 text-left">{item.label}</span>}
                    {isOpen && item.badgeCount && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold text-white ${item.badgeColor || 'bg-blue-600'}`}
                      >
                        {item.badgeCount}
                      </span>
                    )}
                    {isOpen && item.badge && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-900 text-[9px] font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Switch Role Drawer in Sidebar if multiple roles */}
          {isOpen && hasMultipleRoles && (
            <div className="pt-2 border-t border-blue-900/40">
              <p className="px-3 text-[10px] font-semibold text-blue-300/50 uppercase tracking-wider mb-2">
                สลับบทบาทที่คุณมี ({assignedRoles.length})
              </p>
              <div className="space-y-1">
                {assignedRoles.map((r) => (
                  <button
                    key={r}
                    onClick={() => switchRole(r)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                      currentRole === r
                        ? 'bg-blue-900/70 text-amber-300 font-bold border border-blue-700/50'
                        : 'text-blue-200/70 hover:bg-blue-900/30 hover:text-white'
                    }`}
                  >
                    <span className="truncate">เข้าฐานะ {r}</span>
                    {currentRole === r && <span className="text-[10px]">● ใช้งานอยู่</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom User Profile & Year Card */}
        <div className="p-3 border-t border-blue-900/50 bg-[#08122d] space-y-2">
          {isOpen ? (
            <>
              {/* User Identity Banner */}
              <div className="flex items-center gap-2.5 px-2 py-1">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-blue-400/40">
                  {currentUser.full_name.slice(0, 2)}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-white truncate">
                    {currentUser.full_name}
                  </div>
                  <div className="text-[10px] text-blue-300/70 truncate">
                    {currentUser.department}
                  </div>
                </div>
              </div>

              {/* Google Drive Organization Shared Folder Card - Admin Only */}
              {currentRole === 'ADMIN' && (
                <a
                  href={organizationDriveUrl || undefined}
                  aria-disabled={!organizationDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/70 to-teal-950/60 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all group cursor-pointer shadow-xs"
                  title={`เปิดโฟลเดอร์ Google Drive รวมองค์กรโรงเรียน (ID: ${organizationDriveFolderId})`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                        ▲
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-[11px] font-bold text-white group-hover:text-emerald-300 block truncate transition-colors">
                          Google Drive องค์กร
                        </span>
                        <span className="text-[9px] text-emerald-300/70 block truncate font-mono">
                          เฉพาะแอดมิน
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400 opacity-70 group-hover:opacity-100 shrink-0" />
                  </div>
                </a>
              )}

              {/* Academic Year */}
              <div className="bg-[#142657] border border-blue-800/60 rounded-xl p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-blue-300/70 block">ปีการศึกษา</span>
                  <span className="text-xs font-bold font-mono text-white">
                    {activeTerm.year} / ภาคเรียนที่ {activeTerm.semester}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-lg bg-blue-700/60 flex items-center justify-center text-blue-200">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={logout}
                className="w-full py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-rose-800/40 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {currentRole === 'ADMIN' && (
                <a
                  href={organizationDriveUrl || undefined}
                  aria-disabled={!organizationDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-emerald-400 hover:text-white hover:bg-emerald-950/60 rounded-lg flex justify-center transition-colors cursor-pointer"
                  title={`เปิด Google Drive รวมองค์กร (ID: ${organizationDriveFolderId})`}
                >
                  <FolderUp className="w-5 h-5" />
                </a>
              )}
              <div
                className="flex justify-center p-2 text-blue-300 hover:text-white cursor-pointer"
                title={`ผู้ใช้: ${currentUser.full_name} (${currentRole})`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <button
                onClick={logout}
                className="p-2 text-rose-400 hover:text-rose-200 cursor-pointer"
                title="ออกจากระบบ"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
