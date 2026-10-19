export type Role = 'TEACHER' | 'REVIEWER' | 'EXECUTIVE' | 'ADMIN';
export type Status = 'PENDING_REVIEW' | 'REJECTED_REVISION' | 'PENDING_DIRECTOR' | 'FINAL_LOCKED';
export interface Person {
  id: string;
  name: string;
  email: string;
  teacherId: string;
  roles: Role[];
  active: boolean;
}
export interface Term {
  id: string;
  year: number;
  semester: number;
  deadline: string;
  active: boolean;
}
export interface Course {
  id: string;
  termId: string;
  code: string;
  name: string;
  grade: string;
  teacherId: string;
  reviewerId: string;
  open: boolean;
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
  review?: { by: string; at: string; pass: boolean; notes: string; checks: boolean[] };
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
