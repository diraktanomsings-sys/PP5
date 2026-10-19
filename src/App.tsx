import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/common/Sidebar';
import { TopNavbar } from './components/common/TopNavbar';
import { LoginView } from './components/auth/LoginView';
import { RoleSelectionView } from './components/auth/RoleSelectionView';
import { AccessDeniedView } from './components/common/AccessDeniedView';
import { ViewBoundary } from './production/ViewBoundary';

// Teacher Components
const TeacherDashboard = React.lazy(() =>
  import('./components/teacher/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard })),
);
const TeacherSubmitForm = React.lazy(() =>
  import('./components/teacher/TeacherSubmitForm').then((m) => ({ default: m.TeacherSubmitForm })),
);
const TeacherDetailView = React.lazy(() =>
  import('./components/teacher/TeacherDetailView').then((m) => ({ default: m.TeacherDetailView })),
);

// Reviewer Components
const ReviewerDashboard = React.lazy(() =>
  import('./components/reviewer/ReviewerDashboard').then((m) => ({ default: m.ReviewerDashboard })),
);
const ReviewerVerifyView = React.lazy(() =>
  import('./components/reviewer/ReviewerVerifyView').then((m) => ({
    default: m.ReviewerVerifyView,
  })),
);

// Executive Components
const ExecutiveDashboard = React.lazy(() =>
  import('./components/executive/ExecutiveDashboard').then((m) => ({
    default: m.ExecutiveDashboard,
  })),
);
const ExecutiveApproveView = React.lazy(() =>
  import('./components/executive/ExecutiveApproveView').then((m) => ({
    default: m.ExecutiveApproveView,
  })),
);

// Admin Components
const AdminDashboard = React.lazy(() =>
  import('./components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
);
const AdminCourses = React.lazy(() =>
  import('./components/admin/AdminCourses').then((m) => ({ default: m.AdminCourses })),
);
const AdminTerms = React.lazy(() =>
  import('./components/admin/AdminTerms').then((m) => ({ default: m.AdminTerms })),
);
const AdminUsers = React.lazy(() =>
  import('./components/admin/AdminUsers').then((m) => ({ default: m.AdminUsers })),
);
const AdminAssignReviewers = React.lazy(() =>
  import('./components/admin/AdminAssignReviewers').then((m) => ({
    default: m.AdminAssignReviewers,
  })),
);
const AdminCalendar = React.lazy(() =>
  import('./components/admin/AdminCalendar').then((m) => ({ default: m.AdminCalendar })),
);
const AdminArchive = React.lazy(() =>
  import('./components/admin/AdminArchive').then((m) => ({ default: m.AdminArchive })),
);
const AdminAuditLogs = React.lazy(() =>
  import('./components/admin/AdminAuditLogs').then((m) => ({ default: m.AdminAuditLogs })),
);

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
            <ViewBoundary key={activeView}>
              <React.Suspense
                fallback={
                  <p role="status" className="p-6 text-sm text-slate-600">
                    กำลังเปิดหน้า…
                  </p>
                }
              >
                {renderActiveView()}
              </React.Suspense>
            </ViewBoundary>
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
