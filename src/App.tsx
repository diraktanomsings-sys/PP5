import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/common/Sidebar';
import { TopNavbar } from './components/common/TopNavbar';
import { LoginView } from './components/auth/LoginView';
import { RoleSelectionView } from './components/auth/RoleSelectionView';
import { AccessDeniedView } from './components/common/AccessDeniedView';

// Teacher Components
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { TeacherSubmitForm } from './components/teacher/TeacherSubmitForm';
import { TeacherDetailView } from './components/teacher/TeacherDetailView';

// Reviewer Components
import { ReviewerDashboard } from './components/reviewer/ReviewerDashboard';
import { ReviewerVerifyView } from './components/reviewer/ReviewerVerifyView';

// Executive Components
import { ExecutiveDashboard } from './components/executive/ExecutiveDashboard';
import { ExecutiveApproveView } from './components/executive/ExecutiveApproveView';

// Admin Components
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminCourses } from './components/admin/AdminCourses';
import { AdminTerms } from './components/admin/AdminTerms';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminAssignReviewers } from './components/admin/AdminAssignReviewers';
import { AdminCalendar } from './components/admin/AdminCalendar';
import { AdminArchive } from './components/admin/AdminArchive';
import { AdminAuditLogs } from './components/admin/AdminAuditLogs';

const MainAppLayout: React.FC = () => {
  const {
    activeView,
    setActiveView,
    currentRole,
    currentUser,
    loading,
    ready,
    refresh,
    busy,
    error,
    setError,
  } = useApp();

  // Sidebar collapsible state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  if (loading || !ready)
    return (
      <main className="min-h-screen bg-[#00236f] flex items-center justify-center p-6">
        <section className="rounded-3xl bg-white p-8 max-w-md text-center">
          <h1 className="font-bold text-xl text-blue-950">ระบบ ปพ.5 ออนไลน์</h1>
          <p className="my-5">{loading ? 'กำลังตรวจสอบระบบ…' : error || 'ติดต่อระบบไม่สำเร็จ'}</p>
          {!loading && (
            <button
              className="bg-blue-900 text-white rounded-lg px-5 py-2"
              onClick={() => void refresh()}
            >
              ลองอีกครั้ง
            </button>
          )}
        </section>
      </main>
    );

  // If in login view, show full screen Login page
  if (!currentUser.id || activeView === 'login') {
    return <LoginView onLoginSuccess={() => {}} />;
  }

  // If in role selection view, show full screen Role Selection screen
  if (activeView === 'select-role') {
    return <RoleSelectionView />;
  }

  // Route Guard / Authorization Check
  const checkRouteAuthorization = (): { authorized: boolean; requiredRole?: string } => {
    if (activeView.startsWith('teacher/')) {
      return { authorized: currentRole === 'TEACHER', requiredRole: 'TEACHER (ครูผู้สอน)' };
    }
    if (activeView.startsWith('reviewer/')) {
      return { authorized: currentRole === 'REVIEWER', requiredRole: 'REVIEWER (ผู้ตรวจเอกสาร)' };
    }
    if (activeView.startsWith('executive/')) {
      return { authorized: currentRole === 'EXECUTIVE', requiredRole: 'EXECUTIVE (ผู้อำนวยการ)' };
    }
    if (activeView === 'admin/archive') {
      // Both ADMIN and EXECUTIVE have access to view archives
      return { authorized: !!currentUser.id };
    }
    if (activeView.startsWith('admin/')) {
      return { authorized: currentRole === 'ADMIN', requiredRole: 'ADMIN (ผู้ดูแลระบบ)' };
    }
    return { authorized: true };
  };

  const renderActiveView = () => {
    const { authorized, requiredRole } = checkRouteAuthorization();
    if (!authorized) {
      return <AccessDeniedView requiredRole={requiredRole} />;
    }

    switch (activeView) {
      // Teacher Views
      case 'teacher/dashboard':
      case 'teacher/my-courses':
        return <TeacherDashboard />;
      case 'teacher/submit':
        return <TeacherSubmitForm />;
      case 'teacher/detail':
        return <TeacherDetailView />;

      // Reviewer Views
      case 'reviewer/dashboard':
      case 'reviewer/revisions':
        return <ReviewerDashboard />;
      case 'reviewer/verify':
        return <ReviewerVerifyView />;

      // Executive Views
      case 'executive/dashboard':
      case 'executive/metrics':
        return <ExecutiveDashboard />;
      case 'executive/approve':
        return <ExecutiveApproveView />;

      // Admin Views
      case 'admin/detail':
        return <TeacherDetailView />;
      case 'admin/dashboard':
        return <AdminDashboard />;
      case 'admin/courses':
        return <AdminCourses />;
      case 'admin/terms':
        return <AdminTerms />;
      case 'admin/users':
        return <AdminUsers />;
      case 'admin/assign-reviewers':
        return <AdminAssignReviewers />;
      case 'admin/calendar':
        return <AdminCalendar />;
      case 'admin/archive':
        return <AdminArchive />;
      case 'admin/audit-logs':
        return <AdminAuditLogs />;

      default:
        return <TeacherSubmitForm />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans antialiased">
      {/* 1. Left Collapsible Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Wrapper with dynamic margin based on sidebar state */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'lg:pl-64' : 'lg:pl-20'
        }`}
      >
        {/* Top Navbar */}
        <TopNavbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onMobileOpenSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <div className="flex justify-end mb-3">
            <button
              disabled={busy}
              onClick={() => void refresh()}
              className="text-xs font-semibold text-blue-900 border border-blue-200 bg-white px-3 py-2 rounded-lg"
            >
              {busy ? 'กำลังบันทึก…' : 'รีเฟรชข้อมูล'}
            </button>
          </div>
          {error && (
            <div
              role="alert"
              className="fixed z-[100] top-20 left-4 right-4 sm:left-auto sm:right-6 max-w-xl rounded-xl border border-red-300 bg-red-50 text-red-900 p-4 shadow-xl flex justify-between gap-3"
            >
              <span>{error}</span>
              <button aria-label="ปิดข้อความผิดพลาด" onClick={() => setError('')}>
                ✕
              </button>
            </div>
          )}
          <fieldset disabled={busy} className="min-w-0 contents">
            {renderActiveView()}
          </fieldset>
        </main>

        {/* Subtle Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-400 text-center flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            โรงเรียนบ้านคูเมือง · สำนักงานเขตพื้นที่การศึกษาประถมศึกษาสิงห์บุรี (สพป.สิงห์บุรี)
          </div>
          <div className="text-[11px]">
            ระบบบันทึกผลการพัฒนาคุณภาพผู้เรียน ปพ.5 ออนไลน์ ดิจิทัล 100%
          </div>
        </footer>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppLayout />
    </AppProvider>
  );
}
