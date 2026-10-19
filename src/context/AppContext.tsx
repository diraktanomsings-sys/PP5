import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type {
  User,
  UserRole,
  AcademicTerm,
  Course,
  ReviewerAssignment,
  PP5Submission,
  AuditLog,
} from '../types/schema';
import type { Person, Snapshot, SessionPayload, PurgePreview } from '../production/types';
import { api, fileUrl, uploadFile, RequestError } from '../production/api';
import schoolLogo from '../assets/schoolLogo';

const anonymous: User = {
  id: '',
  citizen_id: '',
  teacher_id: '',
  full_name: '',
  email: '',
  role: 'TEACHER',
  assigned_roles: [],
  department: '',
  is_active: false,
  created_at: '',
};
const person = (p: Person): User => ({
  deleted_at: p.deletedAt,
  id: p.id,
  citizen_id: p.citizenId || '',
  teacher_id: p.teacherId,
  full_name: p.name,
  email: p.email,
  role: p.roles[0],
  assigned_roles: p.roles,
  department: p.department || '',
  is_active: p.active,
  created_at: p.createdAt || '',
});
const home = (role: UserRole) => `${role.toLowerCase()}/dashboard`;
const courseBody = (c: Course) => ({
  id: c.id,
  termId: c.term_id,
  code: c.course_code,
  name: c.course_name,
  grade: c.grade_level,
  department: c.department,
  teacherId: c.teacher_id,
  creditHours: c.credit_hours,
  scoreRatio: c.score_ratio,
  open: c.is_open_submission,
});

function useServerApp() {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [initialized, setInitialized] = useState(true);
  const [publicLogo, setPublicLogo] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Array<{ id: number; message: string }>>([]);
  const pendingId = useRef(0);
  const beginWait = useCallback((message: string) => {
    const id = ++pendingId.current;
    setPending((items) => [...items, { id, message }]);
    return () => setPending((items) => items.filter((item) => item.id !== id));
  }, []);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('login');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const generation = useRef(0);
  const current = useRef(snapshot);
  current.current = snapshot;
  const refresh = async (role?: UserRole, navigate = false) => {
    const finishWaiting = beginWait('กำลังโหลดข้อมูลระบบ…');
    const sequence = ++generation.current;
    try {
      const health = await api<SessionPayload>('session', undefined, role ?? current.current?.role);
      if (sequence !== generation.current) return;
      setReady(health.ready);
      setInitialized(health.initialized);
      setPublicLogo(health.schoolLogo || '');
      if (!health.snapshot) {
        setSnapshot(undefined);
        setActiveView('login');
        return;
      }
      const s = health.snapshot;
      setSnapshot(s);
      if (navigate) setActiveView(s.user.roles.length > 1 && !role ? 'select-role' : home(s.role));
    } catch (e) {
      if (sequence !== generation.current) return;
      if (e instanceof RequestError && e.status === 401) {
        setSnapshot(undefined);
        setActiveView('login');
      } else {
        setError(e instanceof Error ? e.message : 'ติดต่อระบบไม่สำเร็จ');
        if (e instanceof RequestError && e.status === 503) setReady(false);
      }
    } finally {
      finishWaiting();
      if (sequence === generation.current) setLoading(false);
    }
  };
  useEffect(() => {
    void refresh(undefined, true);
    return () => {
      ++generation.current;
    };
  }, []);
  const action = async (work: () => Promise<unknown>, message = 'กำลังบันทึกข้อมูล…') => {
    const finishWaiting = beginWait(message);
    setBusy(true);
    setError('');
    try {
      await work();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ');
      if (e instanceof RequestError && e.status === 401) {
        setSnapshot(undefined);
        setActiveView('login');
      }
      return false;
    } finally {
      finishWaiting();
      setBusy(false);
    }
  };
  const mutate = (name: string, body: unknown) =>
    action(async () => {
      await api(name, body, current.current?.role);
      await refresh();
    });
  const currentUser = snapshot ? person(snapshot.user) : anonymous;
  const currentRole = snapshot?.role || 'TEACHER';
  const archiveUsers = snapshot?.people.map(person) || [];
  const users = archiveUsers.filter((u) => !u.deleted_at);
  const archiveAcademicTerms: AcademicTerm[] =
    snapshot?.terms.map((t) => ({
      id: t.id,
      deleted_at: t.deletedAt,
      year: t.year,
      semester: t.semester,
      is_active: t.active,
      submission_deadline: t.deadline,
      review_deadline: t.reviewDeadline || t.deadline,
      is_archived: t.archived || false,
      created_at: t.createdAt || '',
    })) || [];
  const academicTerms = archiveAcademicTerms.filter((t) => !t.deleted_at);
  const activeTerm = academicTerms.find((t) => t.is_active) ||
    academicTerms[0] || {
      id: '',
      year: new Date().getFullYear() + 543,
      semester: 1,
      is_active: false,
      submission_deadline: new Date().toISOString(),
      review_deadline: new Date().toISOString(),
      is_archived: false,
      created_at: '',
    };
  const archiveCourses: Course[] =
    snapshot?.courses.map((c) => ({
      id: c.id,
      deleted_at: c.deletedAt,
      term_id: c.termId,
      course_code: c.code,
      course_name: c.name,
      grade_level: c.grade,
      department: c.department || '',
      credit_hours: c.creditHours,
      score_ratio: c.scoreRatio || '70:30',
      teacher_id: c.teacherId,
      is_open_submission: c.open,
      created_at: c.createdAt || '',
    })) || [];
  const courses = archiveCourses.filter((c) => !c.deleted_at);
  const assignments: ReviewerAssignment[] =
    snapshot?.courses
      .filter((c) => c.reviewerId && !c.deletedAt)
      .map((c) => ({
        id: c.id,
        term_id: c.termId,
        reviewer_id: c.reviewerId,
        course_id: c.id,
        assignment_type: c.assignmentType || 'DEPARTMENT',
        created_at: c.createdAt || '',
      })) || [];
  const archiveSubmissions: PP5Submission[] =
    snapshot?.submissions.map((s) => ({
      id: s.id,
      course_id: s.courseId,
      revision: s.revision,
      status: s.status,
      current_version: s.versions.length,
      average_gpa: s.versions.at(-1)?.metrics?.averageGpa ?? NaN,
      pass_percentage: s.versions.at(-1)?.metrics?.passPercentage ?? NaN,
      average_attendance_percentage: s.versions.at(-1)?.metrics?.averageAttendance ?? NaN,
      approved_by: s.approval?.by,
      approved_at: s.approval?.at,
      digital_certificate_hash: s.approval?.manifestHash,
      created_at: s.versions[0]?.submittedAt || '',
      updated_at:
        s.approval?.at || s.versions.at(-1)?.review?.at || s.versions.at(-1)?.submittedAt || '',
      versions: [...s.versions].reverse().map((v) => ({
        id: `${s.id}:${v.number}`,
        submission_id: s.id,
        version_number: `V${String(v.number).padStart(3, '0')}`,
        excel_file_url: fileUrl(v.excel.id, currentRole),
        excel_file_name: v.excel.name,
        pdf_file_url: fileUrl(v.pdf.id, currentRole),
        pdf_file_name: v.pdf.name,
        submitted_by: v.submittedBy,
        submitted_at: v.submittedAt,
        reviewer_notes: v.review?.notes,
        reviewed_by: v.review?.by,
        drive_file_url: v.driveUrl,
        findings: v.findings,
        validation_ratio_correct: v.review?.checks[0] || false,
        validation_attendance_correct: v.review?.checks[1] || false,
        validation_traits_correct: v.review?.checks[2] || false,
        validation_reading_analysis: v.review?.checks[3] || false,
        annotated_file_url: v.review?.annotated
          ? fileUrl(v.review.annotated.id, currentRole)
          : undefined,
        annotated_file_name: v.review?.annotated?.name,
      })),
    })) || [];
  const submissions = archiveSubmissions.filter((s) => courses.some((c) => c.id === s.course_id));
  const auditLogs: AuditLog[] =
    snapshot?.audit.map((a) => ({
      id: a.id,
      created_at: a.at,
      actor_id: a.actorId,
      actor_name: a.actorName,
      role: (a.details.role as UserRole) || 'ไม่ระบุ',
      action_type: a.action as AuditLog['action_type'],
      target_id: a.target,
      target_name:
        archiveCourses.find((c) => c.id === a.target)?.course_name ||
        archiveUsers.find((u) => u.id === a.target)?.full_name ||
        a.target,
      details: a.details,
      ip_address: 'ไม่บันทึก',
    })) || [];
  const verifyCredentials = async (identifier: string, password: string) => {
    const finishWaiting = beginWait('กำลังตรวจสอบการเข้าสู่ระบบ…');
    setError('');
    try {
      await api('login', { identifier, password });
      await refresh(undefined, true);
      return { user: true, error: '' };
    } catch (e) {
      return { user: null, error: e instanceof Error ? e.message : 'เข้าสู่ระบบไม่สำเร็จ' };
    } finally {
      finishWaiting();
    }
  };
  const logout = () =>
    action(async () => {
      await api('logout', {});
      ++generation.current;
      setSnapshot(undefined);
      setSelectedSubmissionId(null);
      setActiveView('login');
    });
  const selectRole = (role: UserRole) => refresh(role, true);
  const createUser = (u: User) =>
    mutate('user', {
      name: u.full_name,
      email: u.email,
      teacherId: u.teacher_id,
      roles: u.assigned_roles,
      password: u.password,
      department: u.department,
      citizenId: u.citizen_id,
    });
  const updateUser = (id: string, u: Partial<User>) =>
    mutate('user-edit', {
      id,
      name: u.full_name,
      email: u.email,
      teacherId: u.teacher_id,
      department: u.department,
      citizenId: u.citizen_id,
      active: u.is_active,
      roles: u.assigned_roles,
    });
  const send = async (courseId: string, excel: File, pdf: File, notes = '', driveUrl = '') =>
    action(async () => {
      const s = current.current!;
      if (!(excel instanceof File) || !(pdf instanceof File))
        throw new Error('เลือกไฟล์ Excel และ PDF จริงให้ครบ');
      const ex = await uploadFile(excel, 'excel', courseId, s);
      const pd = await uploadFile(pdf, 'pdf', courseId, s);
      await api(
        'submit',
        {
          courseId,
          excelId: ex.id,
          pdfId: pd.id,
          notes,
          driveUrl,
          confirmed: true,
          expectedRevision: s.submissions.find((v) => v.courseId === courseId)?.revision || 0,
        },
        s.role,
      );
      await refresh();
    }, 'กำลังอัปโหลดและตรวจสอบไฟล์…');
  const reviewSubmission = (
    id: string,
    pass: boolean,
    checks: boolean[],
    notes: string,
    annotated?: File,
  ) =>
    action(async () => {
      const s = current.current!;
      const sub = s.submissions.find((v) => v.id === id)!;
      const f = annotated
        ? await uploadFile(annotated, 'pdf', sub.courseId, s, 'annotation')
        : undefined;
      await api(
        'review',
        { id, pass, checks, notes, annotatedId: f?.id, expectedRevision: sub.revision },
        s.role,
      );
      await refresh();
    });
  const changePassword = async (_id: string, current: string, password: string) => {
    const success = await action(async () => {
      await api('password', { current, password });
      ++generation.current;
      setSnapshot(undefined);
      setActiveView('login');
    });
    return { success };
  };
  const download = (url: string, name: string) =>
    action(async () => {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'ดาวน์โหลดไม่สำเร็จ' }));
        throw new Error(body.error);
      }
      const blob = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = blob;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blob), 1000);
    }, 'กำลังเตรียมไฟล์ดาวน์โหลด…');
  return {
    currentUser,
    currentRole,
    users,
    archiveUsers,
    archiveAcademicTerms,
    archiveCourses,
    archiveSubmissions,
    academicTerms,
    activeTerm,
    courses,
    assignments,
    submissions,
    auditLogs,
    activeView,
    setActiveView,
    selectedSubmissionId,
    setSelectedSubmissionId,
    loading,
    ready,
    initialized,
    busy,
    waitingMessage: pending[0]?.message || '',
    error,
    setError,
    refresh,
    action,
    mutate,
    previewPurge: async (kind: PurgePreview['kind'], id: string) => {
      let preview: PurgePreview | undefined;
      await action(async () => {
        preview = await api<PurgePreview>('purge-preview', undefined, current.current?.role, {
          kind,
          id,
        });
      }, 'กำลังสรุปรายการที่จะลบถาวร…');
      return preview;
    },
    permanentlyDelete: (preview: PurgePreview, confirmation = '') =>
      action(async () => {
        let result: { done: boolean };
        do {
          result = await api(
            'purge',
            {
              kind: preview.kind,
              id: preview.id,
              planHash: preview.planHash,
              confirmation,
              confirmed: true,
            },
            current.current?.role,
          );
        } while (!result.done);
        await refresh();
      }, 'กำลังลบข้อมูลและไฟล์ถาวร…'),
    driveStorage: snapshot?.drive,
    cleanupDriveCopies: () =>
      action(async () => {
        try {
          for (const f of current.current?.drive?.retained || [])
            await api('drive-cleanup', { id: f.id, confirmed: true }, current.current?.role);
        } finally {
          await refresh();
        }
      }, 'กำลังตรวจไฟล์ใน Drive และคืนพื้นที่สำเนาชั่วคราว…'),
    organizeDrive: () =>
      action(async () => {
        for (const f of current.current?.drive?.unorganized || [])
          await api('drive-organize', { id: f.id }, current.current?.role);
        await refresh();
      }, 'กำลังจัดไฟล์ใน Drive ตามภาคเรียน ชั้น และวิชา…'),
    verifyCredentials,
    logout,
    selectRole,
    switchRole: selectRole,
    login: (_u: unknown) => {},
    setCurrentUser: (_u: User) => {},
    setCurrentRole: selectRole,
    setup: (body: unknown) =>
      action(async () => {
        await api('setup', body);
        await refresh(undefined, true);
      }),
    setUsers: async (value: User[] | ((p: User[]) => User[])) => {
      const next = typeof value === 'function' ? value(users) : value;
      for (const u of next.filter((u) => !users.some((p) => p.id === u.id)))
        if (!(await createUser(u))) return false;
      return true;
    },
    createUser,
    updateUser,
    updateUserRoles: (id: string, roles: UserRole[]) => mutate('user-edit', { id, roles }),
    adminResetPassword: async (id: string, password: string) => ({
      success: await mutate('user-password', { id, password }),
    }),
    changePassword,
    setCourses: async (value: Course[] | ((p: Course[]) => Course[])) => {
      const next = typeof value === 'function' ? value(courses) : value;
      for (const c of next.filter((c) => !courses.some((p) => p.id === c.id)))
        if (!(await mutate('course', courseBody(c)))) return false;
      return true;
    },
    setAssignments: (value: ReviewerAssignment[]) =>
      mutate('reviewers', {
        assignments: value.map((a) => ({
          courseId: a.course_id,
          reviewerId: a.reviewer_id,
          type: a.assignment_type,
        })),
      }),
    assignReviewerWithCheck: async (courseId: string, reviewerId: string, type: string) => ({
      success: await mutate('reviewers', { assignments: [{ courseId, reviewerId, type }] }),
    }),
    toggleCourseOpenSubmission: (id: string) =>
      mutate('course-open', { id, open: !courses.find((c) => c.id === id)?.is_open_submission }),
    setActiveTermId: (id: string) => mutate('term-active', { id }),
    extendDeadline: (id: string, deadline: string, reason: string, reference?: string) =>
      mutate('deadline', { id, deadline, reason, reference }),
    addTerm: (body: unknown) => mutate('term', body),
    submitPP5: send,
    submitRevision: (id: string, excel: File, pdf: File, notes?: string, driveUrl?: string) =>
      send(snapshot!.submissions.find((s) => s.id === id)!.courseId, excel, pdf, notes, driveUrl),
    reviewSubmission,
    approveSubmission: (id: string, signature: string) =>
      mutate('approve', {
        id,
        signature,
        confirmed: true,
        expectedRevision: current.current?.submissions.find((s) => s.id === id)?.revision,
      }),
    batchApproveSubmissions: (ids: string[], signature: string) =>
      mutate('approve-batch', {
        signature,
        confirmed: true,
        items: ids.map((id) => ({
          id,
          expectedRevision: current.current?.submissions.find((s) => s.id === id)?.revision,
        })),
      }),
    emergencyUnlock: (id: string, reason: string, password: string) =>
      mutate('unlock', {
        id,
        reason,
        password,
        expectedRevision: current.current?.submissions.find((s) => s.id === id)?.revision,
      }),
    addAuditLog: (_log: unknown) => {},
    organizationDriveUrl: snapshot?.settings?.organizationDriveUrl || '',
    organizationDriveFolderId:
      snapshot?.settings?.organizationDriveUrl?.match(/\/folders\/([^/?]+)/)?.[1] || '',
    organizationDriveTitle: snapshot?.settings?.organizationDriveTitle || 'โฟลเดอร์องค์กร',
    updateOrganizationDriveUrl: (organizationDriveUrl: string, organizationDriveTitle?: string) =>
      mutate('school-settings', { organizationDriveUrl, organizationDriveTitle }),
    schoolLogoUrl: snapshot?.settings?.schoolLogo || publicLogo || schoolLogo,
    customSchoolLogo: snapshot?.settings?.schoolLogo || '',
    hasCustomLogo: !!snapshot?.settings?.schoolLogo,
    uploadSchoolLogo: (schoolLogo: string) => mutate('school-settings', { schoolLogo }),
    removeSchoolLogo: () => mutate('school-settings', { schoolLogo: '' }),
    download,
    downloadSigned: (id: string) =>
      download(
        `/api/pp5?action=signed&role=${currentRole}&id=${encodeURIComponent(id)}`,
        'PP5-approved.pdf',
      ),
    downloadArchive: (filters: Record<string, string>) =>
      download(
        `/api/pp5?action=archive&role=${currentRole}&${new URLSearchParams(filters)}`,
        'PP5-archive.zip',
      ),
  };
}
const AppContext = createContext<ReturnType<typeof useServerApp> | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const value = useServerApp();
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('AppProvider required');
  return context;
}
