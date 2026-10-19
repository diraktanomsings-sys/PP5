export type UserRole = 'TEACHER' | 'REVIEWER' | 'EXECUTIVE' | 'ADMIN';

export interface User {
  deleted_at?: string;
  id: string;
  citizen_id: string;
  teacher_id: string;
  full_name: string;
  email: string;
  username?: string;
  password?: string;
  role: UserRole;
  assigned_roles: UserRole[]; // Multi-role assignments from Admin / DB
  department: string; // กลุ่มสาระการเรียนรู้
  signature_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface AcademicTerm {
  deleted_at?: string;
  id: string;
  year: number; // เช่น 2569
  semester: number; // 1 หรือ 2
  is_active: boolean;
  submission_deadline: string;
  review_deadline: string;
  is_archived: boolean;
  created_at: string;
}

export interface Course {
  deleted_at?: string;
  id: string;
  term_id: string;
  course_code: string; // เช่น ท13101
  course_name: string; // วิชา ภาษาไทย 3
  grade_level: string; // ป.3/1, ม.1/1
  department: string;
  credit_hours?: number;
  teacher_id: string;
  score_ratio?: string; // Optional legacy field
  is_open_submission: boolean;
  created_at: string;
}

export interface ReviewerAssignment {
  id: string;
  term_id: string;
  reviewer_id: string;
  course_id: string;
  assignment_type: 'DEPARTMENT' | 'GRADE_LEVEL';
  created_at: string;
}

export type SubmissionStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'REJECTED_REVISION'
  | 'PASSED_REVIEW'
  | 'PENDING_DIRECTOR'
  | 'FINAL_LOCKED';

export interface SubmissionVersion {
  id: string;
  submission_id: string;
  version_number: string; // V001, V002, V003
  excel_file_url: string;
  excel_file_name: string;
  pdf_file_url: string;
  pdf_file_name: string;
  drive_folder_url?: string;
  drive_file_url?: string;
  submitted_by: string;
  submitted_at: string;
  reviewer_notes?: string;
  reviewed_by?: string;
  annotated_file_url?: string;
  annotated_file_name?: string;
  // 4 Validation pillars
  validation_ratio_correct: boolean; // เกณฑ์สัดส่วนคะแนน 70:30
  validation_attendance_correct: boolean; // เวลาเรียนไม่ต่ำกว่า 80%
  validation_traits_correct: boolean; // คุณลักษณะอันพึงประสงค์ 8 ประการ
  validation_reading_analysis: boolean; // การประเมินการอ่าน คิดวิเคราะห์ และเขียน
  findings?: Array<{
    by: string;
    at: string;
    location: string;
    comment: string;
    issueType: string;
  }>;
}

export interface OrganizationDriveConfig {
  folderId: string;
  folderUrl: string;
  title: string;
  description: string;
  updatedAt: string;
}

export interface PP5Submission {
  id: string;
  course_id: string;
  revision?: number;
  status: SubmissionStatus;
  current_version: number;
  average_gpa: number;
  pass_percentage: number;
  average_attendance_percentage: number;
  approved_by?: string;
  approved_at?: string;
  digital_certificate_hash?: string;
  created_at: string;
  updated_at: string;
  versions: SubmissionVersion[];
}

export interface AuditLog {
  id: string;
  action_type:
    | 'SUBMISSION_CREATED'
    | 'REVISION_SUBMITTED'
    | 'REVIEW_PASSED'
    | 'REVIEW_REJECTED'
    | 'DIRECTOR_APPROVED_LOCKED'
    | 'BATCH_SIGN_APPROVED'
    | 'DEADLINE_CHANGED'
    | 'DEADLINE_EXTENDED'
    | 'EMERGENCY_UNLOCKED'
    | 'COURSE_MODIFIED'
    | 'REVIEWER_ASSIGNED'
    | 'USER_ROLE_CHANGED'
    | 'ORGANIZATION_DRIVE_UPDATED';
  actor_id: string;
  actor_name: string;
  role: UserRole | 'ไม่ระบุ';
  target_id: string;
  target_name: string;
  details: Record<string, any>;
  ip_address: string;
  created_at: string;
}

// Student record mock for interactive score sheet simulator
export interface StudentScoreRecord {
  id: string;
  student_number: number;
  student_code: string;
  name: string;
  gender: 'M' | 'F';
  formative_score: number; // 70 max
  summative_score: number; // 30 max
  total_score: number; // 100 max
  grade: number; // 0, 1, 1.5, 2, 2.5, 3, 3.5, 4
  attendance_percentage: number; // e.g. 92%
  traits_level: 'ดีเยี่ยม' | 'ดี' | 'ผ่าน' | 'ไม่ผ่าน';
  reading_analysis_level: 'ดีเยี่ยม' | 'ดี' | 'ผ่าน' | 'ไม่ผ่าน';
}
