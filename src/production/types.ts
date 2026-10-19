export type Role = 'TEACHER' | 'REVIEWER' | 'EXECUTIVE' | 'ADMIN';
export interface PurgePreview {
  kind: 'user' | 'course' | 'term' | 'submission';
  id: string;
  label: string;
  planHash: string;
  fileCount: number;
  bytes: number;
  submissionCount: number;
  versionCount: number;
  removed: number;
  continuing: boolean;
}
export type Status = 'PENDING_REVIEW' | 'REJECTED_REVISION' | 'PENDING_DIRECTOR' | 'FINAL_LOCKED';
export interface Person {
  deletedAt?: string;
  id: string;
  name: string;
  email: string;
  teacherId: string;
  roles: Role[];
  active: boolean;
  department?: string;
  citizenId?: string;
  createdAt?: string;
}
export interface Term {
  deletedAt?: string;
  id: string;
  year: number;
  semester: number;
  deadline: string;
  active: boolean;
  reviewDeadline?: string;
  archived?: boolean;
  createdAt?: string;
}
export interface Course {
  deletedAt?: string;
  id: string;
  termId: string;
  code: string;
  name: string;
  grade: string;
  teacherId: string;
  reviewerId: string;
  open: boolean;
  department?: string;
  creditHours?: number;
  scoreRatio?: string;
  assignmentType?: 'DEPARTMENT' | 'GRADE_LEVEL';
  createdAt?: string;
}
export interface FileRecord {
  id: string;
  name: string;
  kind: 'excel' | 'pdf';
  size: number;
  sha256: string;
}
export interface Version {
  number: number;
  excel: FileRecord;
  pdf: FileRecord;
  submittedAt: string;
  submittedBy: string;
  notes: string;
  driveUrl?: string;
  metrics?: {
    averageGpa: number;
    passPercentage: number;
    averageAttendance: number | null;
    studentCount?: number;
  };
  findings?: Array<{
    by: string;
    at: string;
    location: string;
    comment: string;
    issueType: string;
  }>;
  review?: {
    by: string;
    at: string;
    pass: boolean;
    notes: string;
    checks: boolean[];
    annotated?: FileRecord;
  };
}
export interface Submission {
  id: string;
  courseId: string;
  status: Status;
  revision: number;
  versions: Version[];
  approval?: {
    by: string;
    at: string;
    signature: string;
    manifest: string;
    manifestHash: string;
    pdfHash: string;
    excelHash: string;
  };
  approvalHistory?: Array<{
    version: number;
    approval: NonNullable<Submission['approval']>;
    unlockedAt: string;
    by: string;
    reason: string;
  }>;
}
export interface Audit {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  details: Record<string, unknown>;
}
export interface Snapshot {
  user: Person;
  role: Role;
  people: Person[];
  terms: Term[];
  courses: Course[];
  submissions: Submission[];
  audit: Audit[];
  storage: 'local' | 'blob';
  settings?: SchoolSettings;
  drive?: {
    enabled: boolean;
    folderId: string;
    folderName: string;
    ownerEmail?: string;
    url?: string;
    remaining?: Array<{ id: string; name: string }>;
    unorganized?: Array<{ id: string; name: string }>;
    stored?: number;
  };
}
export interface SchoolSettings {
  schoolLogo?: string;
  organizationDriveUrl?: string;
  organizationDriveTitle?: string;
}
export interface SessionPayload {
  ready: boolean;
  initialized: boolean;
  schoolLogo: string;
  snapshot?: Snapshot;
}
export const roleNames: Record<Role, string> = {
  TEACHER: 'ครูผู้สอน',
  REVIEWER: 'ผู้ตรวจเอกสาร',
  EXECUTIVE: 'ผู้บริหาร',
  ADMIN: 'ผู้ดูแลระบบ',
};
export const statusNames: Record<Status, string> = {
  PENDING_REVIEW: 'รอผู้ตรวจ',
  REJECTED_REVISION: 'ส่งกลับแก้ไข',
  PENDING_DIRECTOR: 'รอผู้บริหารอนุมัติ',
  FINAL_LOCKED: 'อนุมัติและล็อกแล้ว',
};
