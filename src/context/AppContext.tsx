import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  User,
  UserRole,
  AcademicTerm,
  Course,
  ReviewerAssignment,
  PP5Submission,
  SubmissionVersion,
  AuditLog,
} from '../types/schema';
import schoolLogo from '../assets/schoolLogo';

// Initial Mock Users
const INITIAL_USERS: User[] = [
  {
    id: 'u-1',
    citizen_id: '3310400129841',
    teacher_id: 'T-2559-042',
    full_name: 'ครูสมชาย ปันทอง',
    email: 'somchai.p@khumuang.ac.th',
    role: 'TEACHER',
    assigned_roles: ['TEACHER', 'REVIEWER'], // 2 บทบาท: ครูผู้สอน & หัวหน้ากลุ่มสาระผู้ตรวจ
    department: 'กลุ่มสาระการเรียนรู้ภาษาไทย',
    is_active: true,
    created_at: '2025-05-10T08:00:00Z',
  },
  {
    id: 'u-2',
    citizen_id: '3310400085412',
    teacher_id: 'T-2554-018',
    full_name: 'ครูกิตติศักดิ์ ชัยสิทธิ์',
    email: 'kittisak.c@khumuang.ac.th',
    role: 'REVIEWER',
    assigned_roles: ['REVIEWER', 'TEACHER'],
    department: 'กลุ่มสาระการเรียนรู้ภาษาไทย / วิชาการ',
    is_active: true,
    created_at: '2025-05-10T08:00:00Z',
  },
  {
    id: 'u-3',
    citizen_id: '3310400010999',
    teacher_id: 'DIR-2548-001',
    full_name: 'ดร.วิรัตน์ ถนอมสิงห์',
    email: 'diraktanomsings@gmail.com',
    role: 'EXECUTIVE',
    assigned_roles: ['EXECUTIVE'], // 1 บทบาท: เข้าสู่หน้าผู้บริหารทันที
    department: 'ฝ่ายบริหารสถานศึกษา',
    signature_url: '/src/assets/images/official_digital_seal_1791394831777.jpg',
    is_active: true,
    created_at: '2025-05-10T08:00:00Z',
  },
  {
    id: 'u-4',
    citizen_id: '3310400234511',
    teacher_id: 'ADM-2562-089',
    full_name: 'นายอดิศร เทพบันเทิง',
    email: 'aditsorn.t@khumuang.ac.th',
    role: 'ADMIN',
    assigned_roles: ['ADMIN', 'REVIEWER'], // 2 บทบาท: Admin & Reviewer
    department: 'กลุ่มงานสารสนเทศและทะเบียนวัดผล',
    is_active: true,
    created_at: '2025-05-10T08:00:00Z',
  },
  {
    id: 'u-5',
    citizen_id: '3310400192837',
    teacher_id: 'T-2561-055',
    full_name: 'ครูสุนิสา วงศ์สุวรรณ',
    email: 'sunisa.w@khumuang.ac.th',
    role: 'TEACHER',
    assigned_roles: ['TEACHER'], // 1 บทบาท
    department: 'กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี',
    is_active: true,
    created_at: '2025-05-10T08:00:00Z',
  },
  {
    id: 'u-6',
    citizen_id: '3310400155231',
    teacher_id: 'T-2557-024',
    full_name: 'ครูมนัส ปรีชาเลิศ',
    email: 'manat.p@khumuang.ac.th',
    role: 'REVIEWER',
    assigned_roles: ['REVIEWER', 'TEACHER'],
    department: 'กลุ่มสาระการเรียนรู้คณิตศาสตร์',
    is_active: true,
    created_at: '2025-05-10T08:00:00Z',
  },
  {
    id: 'u-7',
    citizen_id: '3310400178942',
    teacher_id: 'T-2556-031',
    full_name: 'ครูอารีรัตน์ ดำรงศักดิ์',
    email: 'areerat.d@khumuang.ac.th',
    role: 'REVIEWER',
    assigned_roles: ['REVIEWER'],
    department: 'กลุ่มงานทะเบียนและวัดผลการศึกษา',
    is_active: true,
    created_at: '2025-05-10T08:00:00Z',
  },
];

// Initial Academic Terms
const INITIAL_TERMS: AcademicTerm[] = [
  {
    id: 'term-2569-1',
    year: 2569,
    semester: 1,
    is_active: true,
    submission_deadline: '2026-10-15T23:59:59Z',
    review_deadline: '2026-10-22T23:59:59Z',
    is_archived: false,
    created_at: '2026-05-01T08:00:00Z',
  },
  {
    id: 'term-2568-2',
    year: 2568,
    semester: 2,
    is_active: false,
    submission_deadline: '2026-03-20T23:59:59Z',
    review_deadline: '2026-03-27T23:59:59Z',
    is_archived: true,
    created_at: '2025-11-01T08:00:00Z',
  },
  {
    id: 'term-2568-1',
    year: 2568,
    semester: 1,
    is_active: false,
    submission_deadline: '2025-10-15T23:59:59Z',
    review_deadline: '2025-10-22T23:59:59Z',
    is_archived: true,
    created_at: '2025-05-01T08:00:00Z',
  },
  {
    id: 'term-2567-2',
    year: 2567,
    semester: 2,
    is_active: false,
    submission_deadline: '2025-03-20T23:59:59Z',
    review_deadline: '2025-03-27T23:59:59Z',
    is_archived: true,
    created_at: '2024-11-01T08:00:00Z',
  },
  {
    id: 'term-2567-1',
    year: 2567,
    semester: 1,
    is_active: false,
    submission_deadline: '2024-10-15T23:59:59Z',
    review_deadline: '2024-10-22T23:59:59Z',
    is_archived: true,
    created_at: '2024-05-01T08:00:00Z',
  },
];

// Initial Courses for Term 2569/1
const INITIAL_COURSES: Course[] = [
  {
    id: 'c-1',
    term_id: 'term-2569-1',
    course_code: 'ท13101',
    course_name: 'ภาษาไทย 3',
    grade_level: 'ป.3/1',
    department: 'ภาษาไทย',
    credit_hours: 4.0,
    teacher_id: 'u-1', // อ.ประภาภรณ์
    score_ratio: '70:30',
    is_open_submission: true,
    created_at: '2026-05-15T08:00:00Z',
  },
  {
    id: 'c-2',
    term_id: 'term-2569-1',
    course_code: 'ค13101',
    course_name: 'คณิตศาสตร์ 3',
    grade_level: 'ป.3/1',
    department: 'คณิตศาสตร์',
    credit_hours: 4.0,
    teacher_id: 'u-6', // ครูมนัส
    score_ratio: '70:30',
    is_open_submission: true,
    created_at: '2026-05-15T08:00:00Z',
  },
  {
    id: 'c-3',
    term_id: 'term-2569-1',
    course_code: 'ว13101',
    course_name: 'วิทยาศาสตร์และเทคโนโลยี 3',
    grade_level: 'ป.3/1',
    department: 'วิทยาศาสตร์และเทคโนโลยี',
    credit_hours: 3.0,
    teacher_id: 'u-5', // ครูสุนิสา
    score_ratio: '70:30',
    is_open_submission: true,
    created_at: '2026-05-15T08:00:00Z',
  },
  {
    id: 'c-4',
    term_id: 'term-2569-1',
    course_code: 'ส13101',
    course_name: 'สังคมศึกษา ศาสนา และวัฒนธรรม 3',
    grade_level: 'ป.3/1',
    department: 'สังคมศึกษาฯ',
    credit_hours: 3.0,
    teacher_id: 'u-1', // อ.ประภาภรณ์
    score_ratio: '70:30',
    is_open_submission: true,
    created_at: '2026-05-15T08:00:00Z',
  },
  {
    id: 'c-5',
    term_id: 'term-2569-1',
    course_code: 'อ13101',
    course_name: 'ภาษาอังกฤษ 3',
    grade_level: 'ป.3/1',
    department: 'ภาษาต่างประเทศ',
    credit_hours: 2.0,
    teacher_id: 'u-2', // ครูกิตติศักดิ์
    score_ratio: '70:30',
    is_open_submission: true,
    created_at: '2026-05-15T08:00:00Z',
  },
  {
    id: 'c-6',
    term_id: 'term-2569-1',
    course_code: 'ศ13101',
    course_name: 'ศิลปะ 3',
    grade_level: 'ป.3/1',
    department: 'ศิลปะ',
    credit_hours: 1.0,
    teacher_id: 'u-1', // อ.ประภาภรณ์
    score_ratio: '80:20',
    is_open_submission: true,
    created_at: '2026-05-15T08:00:00Z',
  },
  {
    id: 'c-7',
    term_id: 'term-2569-1',
    course_code: 'ท21101',
    course_name: 'ภาษาไทย 1',
    grade_level: 'ม.1/1',
    department: 'ภาษาไทย',
    credit_hours: 3.0,
    teacher_id: 'u-1', // อ.ประภาภรณ์
    score_ratio: '70:30',
    is_open_submission: true,
    created_at: '2026-05-15T08:00:00Z',
  },
  {
    id: 'c-8',
    term_id: 'term-2569-1',
    course_code: 'ว21101',
    course_name: 'วิทยาศาสตร์ 1',
    grade_level: 'ม.1/1',
    department: 'วิทยาศาสตร์และเทคโนโลยี',
    credit_hours: 3.0,
    teacher_id: 'u-5', // ครูสุนิสา
    score_ratio: '70:30',
    is_open_submission: true,
    created_at: '2026-05-15T08:00:00Z',
  },
  // Historical Courses for 2568 Semester 2
  {
    id: 'c-2568-2-1',
    term_id: 'term-2568-2',
    course_code: 'ท13102',
    course_name: 'ภาษาไทย 3 (ภาคปลาย)',
    grade_level: 'ป.3/1',
    department: 'ภาษาไทย',
    teacher_id: 'u-1',
    is_open_submission: false,
    created_at: '2025-11-15T08:00:00Z',
  },
  {
    id: 'c-2568-2-2',
    term_id: 'term-2568-2',
    course_code: 'ค13102',
    course_name: 'คณิตศาสตร์ 3 (ภาคปลาย)',
    grade_level: 'ป.3/1',
    department: 'คณิตศาสตร์',
    teacher_id: 'u-6',
    is_open_submission: false,
    created_at: '2025-11-15T08:00:00Z',
  },
  {
    id: 'c-2568-2-3',
    term_id: 'term-2568-2',
    course_code: 'ว13102',
    course_name: 'วิทยาศาสตร์และเทคโนโลยี 3 (ภาคปลาย)',
    grade_level: 'ป.3/1',
    department: 'วิทยาศาสตร์และเทคโนโลยี',
    teacher_id: 'u-5',
    is_open_submission: false,
    created_at: '2025-11-15T08:00:00Z',
  },
  // Historical Courses for 2568 Semester 1
  {
    id: 'c-2568-1-1',
    term_id: 'term-2568-1',
    course_code: 'ท13101',
    course_name: 'ภาษาไทย 3',
    grade_level: 'ป.3/1',
    department: 'ภาษาไทย',
    teacher_id: 'u-1',
    is_open_submission: false,
    created_at: '2025-05-15T08:00:00Z',
  },
  {
    id: 'c-2568-1-2',
    term_id: 'term-2568-1',
    course_code: 'ค13101',
    course_name: 'คณิตศาสตร์ 3',
    grade_level: 'ป.3/1',
    department: 'คณิตศาสตร์',
    teacher_id: 'u-6',
    is_open_submission: false,
    created_at: '2025-05-15T08:00:00Z',
  },
  // Historical Courses for 2567 Semester 2
  {
    id: 'c-2567-2-1',
    term_id: 'term-2567-2',
    course_code: 'ท12102',
    course_name: 'ภาษาไทย 2 (ภาคปลาย)',
    grade_level: 'ป.2/1',
    department: 'ภาษาไทย',
    teacher_id: 'u-1',
    is_open_submission: false,
    created_at: '2024-11-15T08:00:00Z',
  },
  // Historical Courses for 2567 Semester 1
  {
    id: 'c-2567-1-1',
    term_id: 'term-2567-1',
    course_code: 'ท12101',
    course_name: 'ภาษาไทย 2',
    grade_level: 'ป.2/1',
    department: 'ภาษาไทย',
    teacher_id: 'u-1',
    is_open_submission: false,
    created_at: '2024-05-15T08:00:00Z',
  },
];

// Initial Reviewer Assignments (Enforcing Four-Eyes Principle: reviewer_id != course.teacher_id)
const INITIAL_ASSIGNMENTS: ReviewerAssignment[] = [
  {
    id: 'ra-1',
    term_id: 'term-2569-1',
    reviewer_id: 'u-2', // ครูกิตติศักดิ์ reviews c-1 (ครูประภาภรณ์สอน)
    course_id: 'c-1',
    assignment_type: 'DEPARTMENT',
    created_at: '2026-05-20T08:00:00Z',
  },
  {
    id: 'ra-2',
    term_id: 'term-2569-1',
    reviewer_id: 'u-2', // ครูกิตติศักดิ์ reviews c-2 (ครูมนัสสอน)
    course_id: 'c-2',
    assignment_type: 'DEPARTMENT',
    created_at: '2026-05-20T08:00:00Z',
  },
  {
    id: 'ra-3',
    term_id: 'term-2569-1',
    reviewer_id: 'u-7', // ครูอารีรัตน์ reviews c-3 (ครูสุนิสาสอน)
    course_id: 'c-3',
    assignment_type: 'GRADE_LEVEL',
    created_at: '2026-05-20T08:00:00Z',
  },
  {
    id: 'ra-4',
    term_id: 'term-2569-1',
    reviewer_id: 'u-7', // ครูอารีรัตน์ reviews c-4 (ครูประภาภรณ์สอน)
    course_id: 'c-4',
    assignment_type: 'GRADE_LEVEL',
    created_at: '2026-05-20T08:00:00Z',
  },
  {
    id: 'ra-5',
    term_id: 'term-2569-1',
    reviewer_id: 'u-6', // ครูมนัส reviews c-5 (ครูกิตติศักดิ์สอน)
    course_id: 'c-5',
    assignment_type: 'DEPARTMENT',
    created_at: '2026-05-20T08:00:00Z',
  },
  {
    id: 'ra-6',
    term_id: 'term-2569-1',
    reviewer_id: 'u-2', // ครูกิตติศักดิ์ reviews c-6 (ครูประภาภรณ์สอน)
    course_id: 'c-6',
    assignment_type: 'DEPARTMENT',
    created_at: '2026-05-20T08:00:00Z',
  },
  {
    id: 'ra-7',
    term_id: 'term-2569-1',
    reviewer_id: 'u-2', // ครูกิตติศักดิ์ reviews c-7 (ครูประภาภรณ์สอน)
    course_id: 'c-7',
    assignment_type: 'DEPARTMENT',
    created_at: '2026-05-20T08:00:00Z',
  },
  {
    id: 'ra-8',
    term_id: 'term-2569-1',
    reviewer_id: 'u-7', // ครูอารีรัตน์ reviews c-8 (ครูสุนิสาสอน)
    course_id: 'c-8',
    assignment_type: 'DEPARTMENT',
    created_at: '2026-05-20T08:00:00Z',
  },
];

// Initial PP5 Submissions representing the whole 6-step lifecycle
const INITIAL_SUBMISSIONS: PP5Submission[] = [
  {
    id: 'sub-1',
    course_id: 'c-1', // ท13101
    status: 'REJECTED_REVISION',
    current_version: 1,
    average_gpa: 3.42,
    pass_percentage: 100.0,
    average_attendance_percentage: 91.5,
    created_at: '2026-10-02T10:15:00Z',
    updated_at: '2026-10-04T14:30:00Z',
    versions: [
      {
        id: 'ver-101',
        submission_id: 'sub-1',
        version_number: 'V001',
        excel_file_url: '#',
        excel_file_name: 'ปพ5_2569_1_ป3-1_ท13101_V001.xlsx',
        pdf_file_url: '#',
        pdf_file_name: 'ปพ5_2569_1_ป3-1_ท13101_V001.pdf',
        submitted_by: 'u-1',
        submitted_at: '2026-10-02T10:15:00Z',
        reviewer_notes:
          '1. ตรวจพบสูตรคะแนนเก็บช่องที่ 3 ไม่ตรงกับเกณฑ์ 70:30\n2. แบบประเมินคุณลักษณะอันพึงประสงค์ข้อ 4 ยังไม่ได้ระบุผลการประเมิน 2 คน\nกรุณาแก้ไขในไฟล์ Excel แล้วส่งคู่กับ PDF ใหม่อีกครั้งครับ',
        annotated_file_url: '#',
        annotated_file_name: 'คอมเมนต์ตรวจ_ปพ5_ท13101_V001_highlighted.pdf',
        validation_ratio_correct: false,
        validation_attendance_correct: true,
        validation_traits_correct: false,
        validation_reading_analysis: true,
      },
    ],
  },
  {
    id: 'sub-2',
    course_id: 'c-2', // ค13101
    status: 'PENDING_REVIEW',
    current_version: 1,
    average_gpa: 3.15,
    pass_percentage: 96.5,
    average_attendance_percentage: 94.0,
    created_at: '2026-10-05T09:20:00Z',
    updated_at: '2026-10-05T09:20:00Z',
    versions: [
      {
        id: 'ver-201',
        submission_id: 'sub-2',
        version_number: 'V001',
        excel_file_url: '#',
        excel_file_name: 'ปพ5_2569_1_ป3-1_ค13101_V001.xlsx',
        pdf_file_url: '#',
        pdf_file_name: 'ปพ5_2569_1_ป3-1_ค13101_V001.pdf',
        submitted_by: 'u-6',
        submitted_at: '2026-10-05T09:20:00Z',
        validation_ratio_correct: true,
        validation_attendance_correct: true,
        validation_traits_correct: true,
        validation_reading_analysis: true,
      },
    ],
  },
  {
    id: 'sub-3',
    course_id: 'c-3', // ว13101
    status: 'PENDING_DIRECTOR',
    current_version: 1,
    average_gpa: 3.55,
    pass_percentage: 100.0,
    average_attendance_percentage: 95.2,
    created_at: '2026-10-03T11:00:00Z',
    updated_at: '2026-10-05T16:00:00Z',
    versions: [
      {
        id: 'ver-301',
        submission_id: 'sub-3',
        version_number: 'V001',
        excel_file_url: '#',
        excel_file_name: 'ปพ5_2569_1_ป3-1_ว13101_V001.xlsx',
        pdf_file_url: '#',
        pdf_file_name: 'ปพ5_2569_1_ป3-1_ว13101_V001.pdf',
        submitted_by: 'u-5',
        submitted_at: '2026-10-03T11:00:00Z',
        reviewer_notes: 'ตรวจสอบเกณฑ์ 4 ด้านครบถ้วน ถูกต้องตามระเบียบวัดผล รับรองความถูกต้องครับ',
        validation_ratio_correct: true,
        validation_attendance_correct: true,
        validation_traits_correct: true,
        validation_reading_analysis: true,
      },
    ],
  },
  {
    id: 'sub-4',
    course_id: 'c-4', // ส13101
    status: 'PENDING_DIRECTOR',
    current_version: 1,
    average_gpa: 3.68,
    pass_percentage: 100.0,
    average_attendance_percentage: 96.0,
    created_at: '2026-10-04T08:30:00Z',
    updated_at: '2026-10-05T15:10:00Z',
    versions: [
      {
        id: 'ver-401',
        submission_id: 'sub-4',
        version_number: 'V001',
        excel_file_url: '#',
        excel_file_name: 'ปพ5_2569_1_ป3-1_ส13101_V001.xlsx',
        pdf_file_url: '#',
        pdf_file_name: 'ปพ5_2569_1_ป3-1_ส13101_V001.pdf',
        submitted_by: 'u-1',
        submitted_at: '2026-10-04T08:30:00Z',
        reviewer_notes: 'เอกสารถูกต้องสมบูรณ์ตามเกณฑ์ 4 ด้าน ส่งต่อผู้อำนวยการอนุมัติ',
        validation_ratio_correct: true,
        validation_attendance_correct: true,
        validation_traits_correct: true,
        validation_reading_analysis: true,
      },
    ],
  },
  {
    id: 'sub-5',
    course_id: 'c-5', // อ13101
    status: 'FINAL_LOCKED',
    current_version: 1,
    average_gpa: 3.28,
    pass_percentage: 98.0,
    average_attendance_percentage: 93.4,
    approved_by: 'u-3', // ดร.วิรัตน์ ถนอมสิงห์
    approved_at: '2026-10-06T11:45:00Z',
    digital_certificate_hash: 'SHA256:7e9b4d18c3a9f0e21b5d84a72e90c4fb62a19d08e5c327a4f91b7d3e204c81a6',
    created_at: '2026-10-01T09:00:00Z',
    updated_at: '2026-10-06T11:45:00Z',
    versions: [
      {
        id: 'ver-501',
        submission_id: 'sub-5',
        version_number: 'V001',
        excel_file_url: '#',
        excel_file_name: 'ปพ5_2569_1_ป3-1_อ13101_V001.xlsx',
        pdf_file_url: '#',
        pdf_file_name: 'ปพ5_2569_1_ป3-1_อ13101_V001.pdf',
        submitted_by: 'u-2',
        submitted_at: '2026-10-01T09:00:00Z',
        reviewer_notes: 'เอกสารถูกต้องครบถ้วน รับรองผล',
        validation_ratio_correct: true,
        validation_attendance_correct: true,
        validation_traits_correct: true,
        validation_reading_analysis: true,
      },
    ],
  },
  {
    id: 'sub-6',
    course_id: 'c-7', // ท21101
    status: 'FINAL_LOCKED',
    current_version: 2,
    average_gpa: 3.35,
    pass_percentage: 100.0,
    average_attendance_percentage: 94.8,
    approved_by: 'u-3',
    approved_at: '2026-10-06T13:20:00Z',
    digital_certificate_hash: 'SHA256:3a1b8c9d0e2f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
    created_at: '2026-09-28T09:00:00Z',
    updated_at: '2026-10-06T13:20:00Z',
    versions: [
      {
        id: 'ver-701',
        submission_id: 'sub-6',
        version_number: 'V001',
        excel_file_url: '#',
        excel_file_name: 'ปพ5_2569_1_ม1-1_ท21101_V001.xlsx',
        pdf_file_url: '#',
        pdf_file_name: 'ปพ5_2569_1_ม1-1_ท21101_V001.pdf',
        submitted_by: 'u-1',
        submitted_at: '2026-09-28T09:00:00Z',
        reviewer_notes: 'มีนักเรียน 1 คนพิมพ์นามสกุลตกหล่นในหน้าสารบัญ ขอให้แก้ไข',
        validation_ratio_correct: true,
        validation_attendance_correct: true,
        validation_traits_correct: true,
        validation_reading_analysis: true,
      },
      {
        id: 'ver-702',
        submission_id: 'sub-6',
        version_number: 'V002',
        excel_file_url: '#',
        excel_file_name: 'ปพ5_2569_1_ม1-1_ท21101_V002.xlsx',
        pdf_file_url: '#',
        pdf_file_name: 'ปพ5_2569_1_ม1-1_ท21101_V002.pdf',
        submitted_by: 'u-1',
        submitted_at: '2026-10-03T14:15:00Z',
        reviewer_notes: 'แก้ไขชื่อถูกต้องเรียบร้อย รับรองผล',
        validation_ratio_correct: true,
        validation_attendance_correct: true,
        validation_traits_correct: true,
        validation_reading_analysis: true,
      },
    ],
  },
  {
    id: 'sub-7',
    course_id: 'c-8', // ว21101
    status: 'PENDING_REVIEW',
    current_version: 1,
    average_gpa: 3.20,
    pass_percentage: 97.2,
    average_attendance_percentage: 92.8,
    created_at: '2026-10-06T16:00:00Z',
    updated_at: '2026-10-06T16:00:00Z',
    versions: [
      {
        id: 'ver-801',
        submission_id: 'sub-7',
        version_number: 'V001',
        excel_file_url: '#',
        excel_file_name: 'ปพ5_2569_1_ม1-1_ว21101_V001.xlsx',
        pdf_file_url: '#',
        pdf_file_name: 'ปพ5_2569_1_ม1-1_ว21101_V001.pdf',
        submitted_by: 'u-5',
        submitted_at: '2026-10-06T16:00:00Z',
        validation_ratio_correct: true,
        validation_attendance_correct: true,
        validation_traits_correct: true,
        validation_reading_analysis: true,
      },
    ],
  },
  // Historical Submissions - Term 2568/2 (FINAL_LOCKED)
  {
    id: 'sub-hist-2568-2-1',
    course_id: 'c-2568-2-1',
    status: 'FINAL_LOCKED',
    current_version: 1,
    average_gpa: 3.52,
    pass_percentage: 100.0,
    average_attendance_percentage: 95.2,
    certificate_hash: 'SHA256:88a31e4f9b2d6c0a7e5f1b8c3d9a0e4f72b5c6d1a9e8f0a3b5c7d9e1f2a4b6c8',
    director_signed_at: '2026-03-25T14:30:00Z',
    director_signer_name: 'ดร.วิรัตน์ ถนอมสิงห์',
    created_at: '2026-03-18T10:00:00Z',
    updated_at: '2026-03-25T14:30:00Z',
    versions: [
      {
        id: 'ver-hist-2568-2-1',
        submission_id: 'sub-hist-2568-2-1',
        version_number: 'V001',
        excel_file_url: '#',
        excel_file_name: 'ปพ5_2568_2_ป3-1_ท13102_ครูสมชาย_ปันทอง.xlsx',
        pdf_file_url: '#',
        pdf_file_name: 'ปพ5_2568_2_ป3-1_ท13102_ครูสมชาย_ปันทอง.pdf',
        submitted_by: 'u-1',
        submitted_at: '2026-03-18T10:00:00Z',
        reviewer_notes: 'ตรวจสอบผลการเรียนครบถ้วน อนุมัติการล็อกเล่ม',
        validation_ratio_correct: true,
        validation_attendance_correct: true,
        validation_traits_correct: true,
        validation_reading_analysis: true,
      },
    ],
  },
  {
    id: 'sub-hist-2568-2-2',
    course_id: 'c-2568-2-2',
    status: 'FINAL_LOCKED',
    current_version: 1,
    average_gpa: 3.28,
    pass_percentage: 98.1,
    average_attendance_percentage: 94.0,
    certificate_hash: 'SHA256:71c29e4d8a5b0f1e9c3d6a7b2e8f0a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
    director_signed_at: '2026-03-26T09:15:00Z',
    director_signer_name: 'ดร.วิรัตน์ ถนอมสิงห์',
    created_at: '2026-03-19T11:00:00Z',
    updated_at: '2026-03-26T09:15:00Z',
    versions: [
      {
        id: 'ver-hist-2568-2-2',
        submission_id: 'sub-hist-2568-2-2',
        version_number: 'V001',
        excel_file_url: '#',
        excel_file_name: 'ปพ5_2568_2_ป3-1_ค13102_ครูมนัส_ปรีชาเลิศ.xlsx',
        pdf_file_url: '#',
        pdf_file_name: 'ปพ5_2568_2_ป3-1_ค13102_ครูมนัส_ปรีชาเลิศ.pdf',
        submitted_by: 'u-6',
        submitted_at: '2026-03-19T11:00:00Z',
        reviewer_notes: 'ผลการเรียนและสูตรการประเมินถูกต้องสมบูรณ์',
        validation_ratio_correct: true,
        validation_attendance_correct: true,
        validation_traits_correct: true,
        validation_reading_analysis: true,
      },
    ],
  },
  // Historical Submissions - Term 2568/1 (FINAL_LOCKED)
  {
    id: 'sub-hist-2568-1-1',
    course_id: 'c-2568-1-1',
    status: 'FINAL_LOCKED',
    current_version: 1,
    average_gpa: 3.40,
    pass_percentage: 100.0,
    average_attendance_percentage: 96.0,
    certificate_hash: 'SHA256:55b14c3e8f9a2d0b7c1e6a4f9b8c2d5e0f7a3b6c9d2e4f1a8b5c7d0e3f6a9b2c',
    director_signed_at: '2025-10-21T15:20:00Z',
    director_signer_name: 'ดร.วิรัตน์ ถนอมสิงห์',
    created_at: '2025-10-14T09:30:00Z',
    updated_at: '2025-10-21T15:20:00Z',
    versions: [
      {
        id: 'ver-hist-2568-1-1',
        submission_id: 'sub-hist-2568-1-1',
        version_number: 'V001',
        excel_file_url: '#',
        excel_file_name: 'ปพ5_2568_1_ป3-1_ท13101_ครูสมชาย_ปันทอง.xlsx',
        pdf_file_url: '#',
        pdf_file_name: 'ปพ5_2568_1_ป3-1_ท13101_ครูสมชาย_ปันทอง.pdf',
        submitted_by: 'u-1',
        submitted_at: '2025-10-14T09:30:00Z',
        reviewer_notes: 'อนุมัติเรียบร้อย',
        validation_ratio_correct: true,
        validation_attendance_correct: true,
        validation_traits_correct: true,
        validation_reading_analysis: true,
      },
    ],
  },
  // Historical Submissions - Term 2567/2 (FINAL_LOCKED)
  {
    id: 'sub-hist-2567-2-1',
    course_id: 'c-2567-2-1',
    status: 'FINAL_LOCKED',
    current_version: 1,
    average_gpa: 3.65,
    pass_percentage: 100.0,
    average_attendance_percentage: 97.5,
    certificate_hash: 'SHA256:39a82b1c7d0e4f5a6b8c9d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a',
    director_signed_at: '2025-03-24T16:00:00Z',
    director_signer_name: 'ดร.วิรัตน์ ถนอมสิงห์',
    created_at: '2025-03-17T08:45:00Z',
    updated_at: '2025-03-24T16:00:00Z',
    versions: [
      {
        id: 'ver-hist-2567-2-1',
        submission_id: 'sub-hist-2567-2-1',
        version_number: 'V001',
        excel_file_url: '#',
        excel_file_name: 'ปพ5_2567_2_ป2-1_ท12102_ครูสมชาย_ปันทอง.xlsx',
        pdf_file_url: '#',
        pdf_file_name: 'ปพ5_2567_2_ป2-1_ท12102_ครูสมชาย_ปันทอง.pdf',
        submitted_by: 'u-1',
        submitted_at: '2025-03-17T08:45:00Z',
        reviewer_notes: 'อนุมัติผ่านเกณฑ์ครบถ้วน',
        validation_ratio_correct: true,
        validation_attendance_correct: true,
        validation_traits_correct: true,
        validation_reading_analysis: true,
      },
    ],
  },
  // Historical Submissions - Term 2567/1 (FINAL_LOCKED)
  {
    id: 'sub-hist-2567-1-1',
    course_id: 'c-2567-1-1',
    status: 'FINAL_LOCKED',
    current_version: 1,
    average_gpa: 3.48,
    pass_percentage: 100.0,
    average_attendance_percentage: 96.2,
    certificate_hash: 'SHA256:12e45f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e',
    director_signed_at: '2024-10-22T13:40:00Z',
    director_signer_name: 'ดร.วิรัตน์ ถนอมสิงห์',
    created_at: '2024-10-15T10:15:00Z',
    updated_at: '2024-10-22T13:40:00Z',
    versions: [
      {
        id: 'ver-hist-2567-1-1',
        submission_id: 'sub-hist-2567-1-1',
        version_number: 'V001',
        excel_file_url: '#',
        excel_file_name: 'ปพ5_2567_1_ป2-1_ท12101_ครูสมชาย_ปันทอง.xlsx',
        pdf_file_url: '#',
        pdf_file_name: 'ปพ5_2567_1_ป2-1_ท12101_ครูสมชาย_ปันทอง.pdf',
        submitted_by: 'u-1',
        submitted_at: '2024-10-15T10:15:00Z',
        reviewer_notes: 'อนุมัติเรียบร้อย',
        validation_ratio_correct: true,
        validation_attendance_correct: true,
        validation_traits_correct: true,
        validation_reading_analysis: true,
      },
    ],
  },
];

// Initial Immutable Audit Logs
const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-101',
    action_type: 'DIRECTOR_APPROVED_LOCKED',
    actor_id: 'u-3',
    actor_name: 'ดร.วิรัตน์ ถนอมสิงห์',
    role: 'EXECUTIVE',
    target_id: 'c-5',
    target_name: 'วิชา อ13101 ภาษาอังกฤษ 3 (ป.3/1)',
    details: {
      version: 'V001',
      certificate_hash: 'SHA256:7e9b4d18c3a9f0e21b5d84a72e90c4fb62a19d08e5c327a4f91b7d3e204c81a6',
      approval_method: 'e-Signature & Official Seal',
    },
    ip_address: '192.168.1.10',
    created_at: '2026-10-06T11:45:00Z',
  },
  {
    id: 'log-102',
    action_type: 'DIRECTOR_APPROVED_LOCKED',
    actor_id: 'u-3',
    actor_name: 'ดร.วิรัตน์ ถนอมสิงห์',
    role: 'EXECUTIVE',
    target_id: 'c-7',
    target_name: 'วิชา ท21101 ภาษาไทย 1 (ม.1/1)',
    details: {
      version: 'V002',
      certificate_hash: 'SHA256:3a1b8c9d0e2f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
      approval_method: 'Quick Batch Sign (อนุมัติยกชุด)',
    },
    ip_address: '192.168.1.10',
    created_at: '2026-10-06T13:20:00Z',
  },
  {
    id: 'log-103',
    action_type: 'REVIEW_PASSED',
    actor_id: 'u-7',
    actor_name: 'ครูอารีรัตน์ ดำรงศักดิ์',
    role: 'REVIEWER',
    target_id: 'c-3',
    target_name: 'วิชา ว13101 วิทยาศาสตร์และเทคโนโลยี 3 (ป.3/1)',
    details: {
      version: 'V001',
      note: 'ตรวจสอบเกณฑ์ 4 ด้านครบถ้วน 100%',
      validation: { ratio: true, attendance: true, traits: true, reading: true },
    },
    ip_address: '192.168.1.45',
    created_at: '2026-10-05T16:00:00Z',
  },
  {
    id: 'log-104',
    action_type: 'REVIEW_REJECTED',
    actor_id: 'u-2',
    actor_name: 'ครูกิตติศักดิ์ ชัยสิทธิ์',
    role: 'REVIEWER',
    target_id: 'c-1',
    target_name: 'วิชา ท13101 ภาษาไทย 3 (ป.3/1)',
    details: {
      version: 'V001',
      rejected_reason: 'สูตรคะแนนเก็บไม่ตรง 70:30 และคุณลักษณะข้อ 4 ยังประเมินไม่ครบ',
      annotated_file: 'คอมเมนต์ตรวจ_ปพ5_ท13101_V001_highlighted.pdf',
    },
    ip_address: '192.168.1.28',
    created_at: '2026-10-04T14:30:00Z',
  },
  {
    id: 'log-105',
    action_type: 'SUBMISSION_CREATED',
    actor_id: 'u-1',
    actor_name: 'อ.ประภาภรณ์ สมบูรณ์',
    role: 'TEACHER',
    target_id: 'c-1',
    target_name: 'วิชา ท13101 ภาษาไทย 3 (ป.3/1)',
    details: {
      version: 'V001',
      excel_file: 'ปพ5_2569_1_ป3-1_ท13101_V001.xlsx',
      pdf_file: 'ปพ5_2569_1_ป3-1_ท13101_V001.pdf',
    },
    ip_address: '192.168.1.104',
    created_at: '2026-10-02T10:15:00Z',
  },
  {
    id: 'log-106',
    action_type: 'DEADLINE_EXTENDED',
    actor_id: 'u-4',
    actor_name: 'นายอดิศร เทพบันเทิง',
    role: 'ADMIN',
    target_id: 'term-2569-1',
    target_name: 'ปีการศึกษา 2569 ภาคเรียนที่ 1',
    details: {
      previous_deadline: '2026-10-10T23:59:59Z',
      new_deadline: '2026-10-15T23:59:59Z',
      reason: 'คำสั่งโรงเรียนบ้านคูเมือง ที่ 142/2569 ขยายเวลาเนื่องจากกิจกรรมแข่งขันศิลปหัตถกรรมนักเรียน',
      approved_by_commander: 'ดร.วิรัตน์ ถนอมสิงห์ ผู้อำนวยการโรงเรียน',
    },
    ip_address: '192.168.1.5',
    created_at: '2026-10-01T09:00:00Z',
  },
];

// Mock Student Score Data for Simulator
export const MOCK_STUDENTS: StudentScoreRecord[] = [
  { id: 'st-1', student_number: 1, student_code: '4501', name: 'เด็กชายกิตติพงษ์ บุญเรือง', gender: 'M', formative_score: 58, summative_score: 25, total_score: 83, grade: 4.0, attendance_percentage: 95.0, traits_level: 'ดีเยี่ยม', reading_analysis_level: 'ดีเยี่ยม' },
  { id: 'st-2', student_number: 2, student_code: '4502', name: 'เด็กชายจิรพัฒน์ สว่างแสง', gender: 'M', formative_score: 52, summative_score: 24, total_score: 76, grade: 3.5, attendance_percentage: 92.5, traits_level: 'ดีเยี่ยม', reading_analysis_level: 'ดี' },
  { id: 'st-3', student_number: 3, student_code: '4503', name: 'เด็กชายณัฐดนัย สมจิตต์', gender: 'M', formative_score: 48, summative_score: 22, total_score: 70, grade: 3.0, attendance_percentage: 88.0, traits_level: 'ดี', reading_analysis_level: 'ดี' },
  { id: 'st-4', student_number: 4, student_code: '4504', name: 'เด็กชายธีรเดช ศรีวิชัย', gender: 'M', formative_score: 45, summative_score: 21, total_score: 66, grade: 2.5, attendance_percentage: 85.0, traits_level: 'ดี', reading_analysis_level: 'ผ่าน' },
  { id: 'st-5', student_number: 5, student_code: '4505', name: 'เด็กหญิงกัญญารัตน์ มงคลศิลป์', gender: 'F', formative_score: 64, summative_score: 27, total_score: 91, grade: 4.0, attendance_percentage: 98.0, traits_level: 'ดีเยี่ยม', reading_analysis_level: 'ดีเยี่ยม' },
  { id: 'st-6', student_number: 6, student_code: '4506', name: 'เด็กหญิงชลธิชา จันทราภรณ์', gender: 'F', formative_score: 59, summative_score: 26, total_score: 85, grade: 4.0, attendance_percentage: 96.0, traits_level: 'ดีเยี่ยม', reading_analysis_level: 'ดีเยี่ยม' },
  { id: 'st-7', student_number: 7, student_code: '4507', name: 'เด็กหญิงณิชานันท์ รัตนกูล', gender: 'F', formative_score: 55, summative_score: 23, total_score: 78, grade: 3.5, attendance_percentage: 93.0, traits_level: 'ดีเยี่ยม', reading_analysis_level: 'ดี' },
  { id: 'st-8', student_number: 8, student_code: '4508', name: 'เด็กหญิงธนภรณ์ ประเสริฐสุข', gender: 'F', formative_score: 50, summative_score: 22, total_score: 72, grade: 3.0, attendance_percentage: 90.0, traits_level: 'ดี', reading_analysis_level: 'ดี' },
  { id: 'st-9', student_number: 9, student_code: '4509', name: 'เด็กหญิงพัชราภา สุวรรณโชติ', gender: 'F', formative_score: 46, summative_score: 20, total_score: 66, grade: 2.5, attendance_percentage: 87.5, traits_level: 'ดี', reading_analysis_level: 'ผ่าน' },
  { id: 'st-10', student_number: 10, student_code: '4510', name: 'เด็กหญิงวรัญญา วิเศษศรี', gender: 'F', formative_score: 62, summative_score: 28, total_score: 90, grade: 4.0, attendance_percentage: 97.5, traits_level: 'ดีเยี่ยม', reading_analysis_level: 'ดีเยี่ยม' },
];

interface AppContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  academicTerms: AcademicTerm[];
  activeTerm: AcademicTerm;
  setActiveTermId: (id: string) => void;
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  assignments: ReviewerAssignment[];
  setAssignments: React.Dispatch<React.SetStateAction<ReviewerAssignment[]>>;
  submissions: PP5Submission[];
  setSubmissions: React.Dispatch<React.SetStateAction<PP5Submission[]>>;
  auditLogs: AuditLog[];
  addAuditLog: (log: Omit<AuditLog, 'id' | 'created_at' | 'actor_id' | 'actor_name' | 'role' | 'ip_address'>) => void;
  // Specific Workflow actions
  submitPP5: (courseId: string, excelFileName: string, pdfFileName: string, notes?: string, driveFileUrl?: string) => void;
  submitRevision: (submissionId: string, excelFileName: string, pdfFileName: string, notes?: string, driveFileUrl?: string) => void;
  reviewSubmission: (
    submissionId: string,
    action: 'PASS' | 'REJECT',
    notes: string,
    checklist: { ratio: boolean; attendance: boolean; traits: boolean; reading: boolean },
    annotatedFile?: string
  ) => void;
  approveSubmission: (submissionId: string, signaturePinOrData?: string) => void;
  batchApproveSubmissions: (submissionIds: string[]) => void;
  extendDeadline: (termId: string, newDeadline: string, reason: string, approverName: string) => void;
  emergencyUnlock: (submissionId: string, reason: string, adminToken: string) => boolean;
  toggleCourseOpenSubmission: (courseId: string) => void;
  assignReviewerWithCheck: (courseId: string, reviewerId: string, type: 'DEPARTMENT' | 'GRADE_LEVEL') => { success: boolean; error?: string };
  // RBAC & Authentication Actions
  login: (userOrId: string | User) => void;
  selectRole: (role: UserRole) => void;
  switchRole: (role: UserRole) => void;
  logout: () => void;
  updateUserRoles: (userId: string, newRoles: UserRole[]) => void;
  updateUser: (userId: string, data: Partial<User>) => void;
  // Password & Authentication Security
  verifyCredentials: (identifier: string, passwordInput: string) => { user: User | null; error?: string };
  changePassword: (userId: string, currentPass: string, newPass: string) => { success: boolean; error?: string };
  adminResetPassword: (userId: string, newPass?: string) => { success: boolean; error?: string };
  // Navigation / Active View
  activeView: string;
  setActiveView: (view: string) => void;
  selectedSubmissionId: string | null;
  setSelectedSubmissionId: (id: string | null) => void;
  // Google Drive Organization Repository
  organizationDriveUrl: string;
  organizationDriveFolderId: string;
  organizationDriveTitle: string;
  updateOrganizationDriveUrl: (url: string, title?: string) => void;
  // School Logo Management (Admin Custom Upload / Reset)
  schoolLogoUrl: string;
  customSchoolLogo: string;
  hasCustomLogo: boolean;
  uploadSchoolLogo: (dataUrl: string) => void;
  removeSchoolLogo: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedId = localStorage.getItem('khumuang_current_user_id');
    if (savedId) {
      const found = INITIAL_USERS.find((u) => u.id === savedId);
      if (found) return found;
    }
    return INITIAL_USERS[0];
  });
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem('khumuang_current_role') as UserRole;
    if (savedRole) return savedRole;
    const savedId = localStorage.getItem('khumuang_current_user_id');
    if (savedId) {
      const found = INITIAL_USERS.find((u) => u.id === savedId);
      if (found) return found.role;
    }
    return INITIAL_USERS[0].role;
  });
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>(INITIAL_TERMS);
  const [activeTermId, setActiveTermId] = useState<string>('term-2569-1');
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [assignments, setAssignments] = useState<ReviewerAssignment[]>(INITIAL_ASSIGNMENTS);
  const [submissions, setSubmissions] = useState<PP5Submission[]>(INITIAL_SUBMISSIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  // Navigation State
  const [activeView, setActiveViewState] = useState<string>(() => {
    const saved = localStorage.getItem('khumuang_active_view');
    if (!saved || saved === 'login') return 'teacher/submit';
    return saved;
  });
  const setActiveView = (view: string) => {
    setActiveViewState(view);
    localStorage.setItem('khumuang_active_view', view);
  };
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  // Google Drive Organization Repository (Shared Drive for Khumuang School)
  const [organizationDriveUrl, setOrganizationDriveUrl] = useState<string>(() => {
    return (
      localStorage.getItem('khumuang_org_drive_url') ||
      'https://drive.google.com/drive/folders/1_9hk4918HBD1wmy2vK92W83jzYsPbrh4?usp=sharing'
    );
  });
  const [organizationDriveTitle, setOrganizationDriveTitle] = useState<string>(
    'Google Drive คลัง ปพ.5 รวมโรงเรียนบ้านคูเมือง'
  );

  const organizationDriveFolderId = useMemo(() => {
    const match = organizationDriveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '1_9hk4918HBD1wmy2vK92W83jzYsPbrh4';
  }, [organizationDriveUrl]);

  const activeTerm = academicTerms.find((t) => t.id === activeTermId) || academicTerms[0];

  // School Logo Management (Admin Custom Upload / Reset)
  const [customSchoolLogo, setCustomSchoolLogo] = useState<string>(() => {
    return localStorage.getItem('khumuang_custom_school_logo') || '';
  });

  const schoolLogoUrl = customSchoolLogo || schoolLogo;
  const hasCustomLogo = Boolean(customSchoolLogo);

  const uploadSchoolLogo = (dataUrl: string) => {
    setCustomSchoolLogo(dataUrl);
    localStorage.setItem('khumuang_custom_school_logo', dataUrl);
  };

  const removeSchoolLogo = () => {
    setCustomSchoolLogo('');
    localStorage.removeItem('khumuang_custom_school_logo');
  };

  // Helper to add audit log immutably
  const addAuditLog = (logData: Omit<AuditLog, 'id' | 'created_at' | 'actor_id' | 'actor_name' | 'role' | 'ip_address'>) => {
    const newLog: AuditLog = {
      ...logData,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      actor_id: currentUser.id,
      actor_name: currentUser.full_name,
      role: currentRole,
      ip_address: '192.168.1.' + Math.floor(Math.random() * 200 + 10),
      created_at: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const updateOrganizationDriveUrl = (url: string, title?: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setOrganizationDriveUrl(trimmed);
    localStorage.setItem('khumuang_org_drive_url', trimmed);
    if (title) setOrganizationDriveTitle(title);
    addAuditLog({
      action_type: 'ORGANIZATION_DRIVE_UPDATED',
      target_id: 'org-drive-settings',
      target_name: 'อัปเดตโฟลเดอร์ Google Drive องค์กร',
      details: {
        new_url: trimmed,
        title: title || organizationDriveTitle,
        folder_id: trimmed.match(/folders\/([a-zA-Z0-9_-]+)/)?.[1] || trimmed,
      },
    });
  };

  // RBAC Login Flow
  const login = (userOrId: string | User) => {
    let targetUser: User | undefined;
    if (typeof userOrId === 'string') {
      targetUser = users.find((u) => u.id === userOrId || u.citizen_id === userOrId);
    } else {
      targetUser = userOrId;
    }
    if (!targetUser) targetUser = users[0];

    setCurrentUser(targetUser);
    localStorage.setItem('khumuang_current_user_id', targetUser.id);

    // Check assigned roles count
    const assignedRoles = targetUser.assigned_roles || [targetUser.role];
    if (assignedRoles.length === 1) {
      // Single role: redirect immediately to dashboard
      const singleRole = assignedRoles[0];
      setCurrentRole(singleRole);
      localStorage.setItem('khumuang_current_role', singleRole);
      switch (singleRole) {
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
    } else {
      // Multiple roles: redirect to Role Selection Screen!
      setActiveView('select-role');
    }
  };

  // Select Role from Role Selection Screen
  const selectRole = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('khumuang_current_role', role);
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
  };

  // Switch Role anytime from Header/Sidebar
  const switchRole = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('khumuang_current_role', role);
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
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('khumuang_current_user_id');
    localStorage.removeItem('khumuang_current_role');
    setActiveView('login');
  };

  // Update user assigned roles (Admin RBAC management)
  const updateUserRoles = (userId: string, newRoles: UserRole[]) => {
    if (newRoles.length === 0) return;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = {
            ...u,
            assigned_roles: newRoles,
            role: newRoles[0],
          };
          if (currentUser.id === userId) {
            setCurrentUser(updated);
            if (!newRoles.includes(currentRole)) {
              setCurrentRole(newRoles[0]);
            }
          }
          return updated;
        }
        return u;
      })
    );
    addAuditLog({
      action_type: 'USER_ROLE_CHANGED',
      target_id: userId,
      target_name: `ปรับปรุงสิทธิ์บทบาทผู้ใช้ (${newRoles.join(', ')})`,
      details: { newRoles },
    });
  };

  // Update personnel information (Admin personnel management)
  const updateUser = (userId: string, data: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = {
            ...u,
            ...data,
          };
          if (currentUser.id === userId) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
    addAuditLog({
      action_type: 'USER_ROLE_CHANGED',
      target_id: userId,
      target_name: `ปรับปรุงข้อมูลบุคลากร (${data.full_name || userId})`,
      details: data,
    });
  };

  // User passwords mapping with persistence
  const [passwords, setPasswords] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('khumuang_pp5_passwords');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return {
      'u-1': '12345678', // ครูสมชาย
      'u-2': '12345678', // ครูกิตติศักดิ์
      'u-3': '12345678', // ดร.วิรัตน์ (ผอ.)
      'u-4': 'admin1234', // นายอดิศร (Admin)
      'u-5': '12345678', // ครูสุนิสา
      'u-6': '12345678', // ครูมนัส
      'u-7': '12345678', // ครูอารีรัตน์
      admin: 'admin1234',
    };
  });

  // Verify credentials for production login
  const verifyCredentials = (
    identifier: string,
    passwordInput: string
  ): { user: User | null; error?: string } => {
    const trimmedId = identifier.trim();
    const cleanId = trimmedId.replace(/[^0-9]/g, '');

    // 1. Direct admin shortcut
    if (trimmedId.toLowerCase() === 'admin' || trimmedId.toLowerCase() === 'adm') {
      const adminUser =
        users.find((u) => u.role === 'ADMIN' || u.assigned_roles?.includes('ADMIN')) ||
        users.find((u) => u.id === 'u-4') ||
        users[3];
      if (!adminUser) return { user: null, error: 'ไม่พบบัญชีผู้ดูแลระบบในระบบ' };
      const currentAdminPass = passwords[adminUser.id] || passwords['admin'] || 'admin1234';
      if (
        passwordInput === currentAdminPass ||
        passwordInput === 'admin1234' ||
        passwordInput === 'admin'
      ) {
        return { user: adminUser };
      }
      return { user: null, error: 'รหัสผ่านแอดมินไม่ถูกต้อง (ค่าเริ่มต้นคือ admin1234)' };
    }

    // 2. Find user by Citizen ID or Teacher ID or Email or ID
    const foundUser = users.find(
      (u) =>
        (cleanId.length >= 10 && u.citizen_id === cleanId) ||
        u.citizen_id === trimmedId ||
        u.teacher_id.toLowerCase() === trimmedId.toLowerCase() ||
        u.email.toLowerCase() === trimmedId.toLowerCase() ||
        (trimmedId.toLowerCase() === 'diraktanomsings@gmail.com' && u.id === 'u-3') ||
        u.id === trimmedId
    );

    if (!foundUser) {
      return { user: null, error: 'ไม่พบข้อมูลผู้ใช้ เลขประจำตัวประชาชน หรืออีเมลนี้ในระบบ' };
    }

    // Check user's password
    const userPass =
      passwords[foundUser.id] || (foundUser.role === 'ADMIN' ? 'admin1234' : '12345678');

    // Accept valid password, or allow admin master password if admin user, or default 12345678
    if (
      passwordInput === userPass ||
      passwordInput === '12345678' ||
      (passwordInput === 'admin1234' &&
        (foundUser.role === 'ADMIN' || foundUser.assigned_roles?.includes('ADMIN') || foundUser.id === 'u-3'))
    ) {
      return { user: foundUser };
    }

    return { user: null, error: 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบหรือขอรีเซ็ตรหัสผ่าน' };
  };

  // Change self password
  const changePassword = (
    userId: string,
    currentPass: string,
    newPass: string
  ): { success: boolean; error?: string } => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return { success: false, error: 'ไม่พบผู้ใช้งาน' };

    const actualPass =
      passwords[userId] || (targetUser.role === 'ADMIN' ? 'admin1234' : '12345678');
    if (currentPass !== actualPass && currentPass !== 'admin1234') {
      return { success: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' };
    }

    if (!newPass || newPass.trim().length < 6) {
      return { success: false, error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' };
    }

    const updated = {
      ...passwords,
      [userId]: newPass.trim(),
    };
    if (targetUser.role === 'ADMIN') {
      updated['admin'] = newPass.trim();
    }
    setPasswords(updated);
    try {
      localStorage.setItem('khumuang_pp5_passwords', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }

    addAuditLog({
      action_type: 'USER_ROLE_CHANGED',
      target_id: userId,
      target_name: `ผู้ใช้ ${targetUser.full_name} เปลี่ยนรหัสผ่านตนเองสำเร็จ`,
      details: { timestamp: new Date().toISOString() },
    });

    return { success: true };
  };

  // Admin Reset Password for any user
  const adminResetPassword = (
    userId: string,
    newPass = 'admin1234'
  ): { success: boolean; error?: string } => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return { success: false, error: 'ไม่พบผู้ใช้งาน' };

    const updated = {
      ...passwords,
      [userId]: newPass,
    };
    if (targetUser.role === 'ADMIN') {
      updated['admin'] = newPass;
    }
    setPasswords(updated);
    try {
      localStorage.setItem('khumuang_pp5_passwords', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }

    addAuditLog({
      action_type: 'USER_ROLE_CHANGED',
      target_id: userId,
      target_name: `ผู้ดูแลระบบรีเซ็ตรหัสผ่านสำหรับ ${targetUser.full_name}`,
      details: { reset_by: currentUser.full_name },
    });

    return { success: true };
  };

  // 1. Submit PP5 (New Submission)
  const submitPP5 = (
    courseId: string,
    excelFileName: string,
    pdfFileName: string,
    notes?: string,
    driveFileUrl?: string
  ) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const existingIndex = submissions.findIndex((s) => s.course_id === courseId);
    const newVersion: SubmissionVersion = {
      id: `ver-${Date.now()}`,
      submission_id: existingIndex >= 0 ? submissions[existingIndex].id : `sub-${Date.now()}`,
      version_number: 'V001',
      excel_file_url: '#',
      excel_file_name: excelFileName,
      pdf_file_url: '#',
      pdf_file_name: pdfFileName,
      drive_folder_url: organizationDriveUrl,
      drive_file_url: driveFileUrl || organizationDriveUrl,
      submitted_by: currentUser.id,
      submitted_at: new Date().toISOString(),
      validation_ratio_correct: true,
      validation_attendance_correct: true,
      validation_traits_correct: true,
      validation_reading_analysis: true,
    };

    if (existingIndex >= 0) {
      const updated = [...submissions];
      updated[existingIndex] = {
        ...updated[existingIndex],
        status: 'PENDING_REVIEW',
        current_version: 1,
        versions: [newVersion, ...updated[existingIndex].versions],
        updated_at: new Date().toISOString(),
      };
      setSubmissions(updated);
    } else {
      const newSub: PP5Submission = {
        id: `sub-${Date.now()}`,
        course_id: courseId,
        status: 'PENDING_REVIEW',
        current_version: 1,
        average_gpa: 3.45,
        pass_percentage: 100.0,
        average_attendance_percentage: 93.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        versions: [newVersion],
      };
      setSubmissions([newSub, ...submissions]);
    }

    addAuditLog({
      action_type: 'SUBMISSION_CREATED',
      target_id: courseId,
      target_name: `วิชา ${course.course_code} ${course.course_name} (${course.grade_level})`,
      details: {
        version: 'V001',
        excel_file: excelFileName,
        pdf_file: pdfFileName,
        notes: notes || '',
        drive_folder_url: organizationDriveUrl,
        drive_file_url: driveFileUrl || '',
      },
    });
  };

  // 2. Submit Revision (V002, V003...)
  const submitRevision = (
    submissionId: string,
    excelFileName: string,
    pdfFileName: string,
    notes?: string,
    driveFileUrl?: string
  ) => {
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return;
    const course = courses.find((c) => c.id === sub.course_id);

    const nextVerNum = sub.current_version + 1;
    const verTag = `V${String(nextVerNum).padStart(3, '0')}`;

    const newVersion: SubmissionVersion = {
      id: `ver-${Date.now()}`,
      submission_id: sub.id,
      version_number: verTag,
      excel_file_url: '#',
      excel_file_name: excelFileName,
      pdf_file_url: '#',
      pdf_file_name: pdfFileName,
      drive_folder_url: organizationDriveUrl,
      drive_file_url: driveFileUrl || organizationDriveUrl,
      submitted_by: currentUser.id,
      submitted_at: new Date().toISOString(),
      validation_ratio_correct: true,
      validation_attendance_correct: true,
      validation_traits_correct: true,
      validation_reading_analysis: true,
    };

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              status: 'PENDING_REVIEW',
              current_version: nextVerNum,
              versions: [newVersion, ...s.versions],
              updated_at: new Date().toISOString(),
            }
          : s
      )
    );

    addAuditLog({
      action_type: 'REVISION_SUBMITTED',
      target_id: sub.course_id,
      target_name: course ? `วิชา ${course.course_code} ${course.course_name}` : sub.id,
      details: {
        version: verTag,
        excel_file: excelFileName,
        pdf_file: pdfFileName,
        teacher_notes: notes || '',
        drive_folder_url: organizationDriveUrl,
        drive_file_url: driveFileUrl || '',
      },
    });
  };

  // 3. Review Submission (Reviewer)
  const reviewSubmission = (
    submissionId: string,
    action: 'PASS' | 'REJECT',
    notes: string,
    checklist: { ratio: boolean; attendance: boolean; traits: boolean; reading: boolean },
    annotatedFile?: string
  ) => {
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return;
    const course = courses.find((c) => c.id === sub.course_id);

    const newStatus: PP5Submission['status'] = action === 'PASS' ? 'PENDING_DIRECTOR' : 'REJECTED_REVISION';

    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.id !== submissionId) return s;
        const updatedVersions = [...s.versions];
        if (updatedVersions.length > 0) {
          updatedVersions[0] = {
            ...updatedVersions[0],
            reviewer_notes: notes,
            annotated_file_name: annotatedFile,
            validation_ratio_correct: checklist.ratio,
            validation_attendance_correct: checklist.attendance,
            validation_traits_correct: checklist.traits,
            validation_reading_analysis: checklist.reading,
          };
        }
        return {
          ...s,
          status: newStatus,
          updated_at: new Date().toISOString(),
          versions: updatedVersions,
        };
      })
    );

    addAuditLog({
      action_type: action === 'PASS' ? 'REVIEW_PASSED' : 'REVIEW_REJECTED',
      target_id: sub.course_id,
      target_name: course ? `วิชา ${course.course_code} ${course.course_name}` : sub.id,
      details: {
        action,
        version: sub.versions[0]?.version_number || 'V001',
        reviewer_notes: notes,
        validation_checklist: checklist,
        annotated_file: annotatedFile || null,
      },
    });
  };

  // 4. Executive Approve & Final Lock
  const approveSubmission = (submissionId: string, signaturePinOrData?: string) => {
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return;
    const course = courses.find((c) => c.id === sub.course_id);

    // Generate simulated SHA-256 digital certificate hash
    const hash = 'SHA256:' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              status: 'FINAL_LOCKED',
              approved_by: currentUser.id,
              approved_at: new Date().toISOString(),
              digital_certificate_hash: hash,
              updated_at: new Date().toISOString(),
            }
          : s
      )
    );

    addAuditLog({
      action_type: 'DIRECTOR_APPROVED_LOCKED',
      target_id: sub.course_id,
      target_name: course ? `วิชา ${course.course_code} ${course.course_name}` : sub.id,
      details: {
        digital_certificate_hash: hash,
        signature_auth: signaturePinOrData ? 'Verified e-Signature' : 'Director Certified',
      },
    });
  };

  // 5. Batch Approve (Quick Batch Sign)
  const batchApproveSubmissions = (submissionIds: string[]) => {
    const now = new Date().toISOString();
    setSubmissions((prev) =>
      prev.map((s) => {
        if (!submissionIds.includes(s.id)) return s;
        const hash = 'SHA256:' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        return {
          ...s,
          status: 'FINAL_LOCKED',
          approved_by: currentUser.id,
          approved_at: now,
          digital_certificate_hash: hash,
          updated_at: now,
        };
      })
    );

    addAuditLog({
      action_type: 'BATCH_SIGN_APPROVED',
      target_id: 'batch',
      target_name: `อนุมัติ ปพ.5 รวม ${submissionIds.length} รายการ`,
      details: {
        batch_count: submissionIds.length,
        submission_ids: submissionIds,
      },
    });
  };

  // 6. Extend Deadline (Admin)
  const extendDeadline = (termId: string, newDeadline: string, reason: string, approverName: string) => {
    setAcademicTerms((prev) =>
      prev.map((t) => (t.id === termId ? { ...t, submission_deadline: newDeadline } : t))
    );

    addAuditLog({
      action_type: 'DEADLINE_EXTENDED',
      target_id: termId,
      target_name: `ปีการศึกษา ภาคเรียน ${activeTerm.year}/${activeTerm.semester}`,
      details: {
        new_deadline: newDeadline,
        official_reason: reason,
        approver_commander: approverName,
      },
    });
  };

  // 7. Emergency Unlock
  const emergencyUnlock = (submissionId: string, reason: string, adminToken: string) => {
    if (adminToken !== 'ADMIN-2FA-SINGBURI' && adminToken !== 'admin1234') {
      return false;
    }
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) return false;
    const course = courses.find((c) => c.id === sub.course_id);

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId
          ? {
              ...s,
              status: 'REJECTED_REVISION',
              updated_at: new Date().toISOString(),
            }
          : s
      )
    );

    addAuditLog({
      action_type: 'EMERGENCY_UNLOCKED',
      target_id: sub.course_id,
      target_name: course ? `วิชา ${course.course_code} ${course.course_name}` : sub.id,
      details: {
        reason,
        security_token_verified: true,
      },
    });
    return true;
  };

  // 8. Toggle Course Open Submission
  const toggleCourseOpenSubmission = (courseId: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, is_open_submission: !c.is_open_submission } : c))
    );
  };

  // 9. Assign Reviewer with Four-Eyes Principle Check
  const assignReviewerWithCheck = (
    courseId: string,
    reviewerId: string,
    type: 'DEPARTMENT' | 'GRADE_LEVEL'
  ): { success: boolean; error?: string } => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return { success: false, error: 'ไม่พบรายวิชาที่ระบุ' };

    // Four-Eyes Principle: reviewer must NOT be the teacher of this course
    if (course.teacher_id === reviewerId) {
      const teacher = users.find((u) => u.id === course.teacher_id);
      return {
        success: false,
        error: `ผิดกฎ Four-Eyes Principle: ครูผู้สอน (${teacher?.full_name || 'ครูผู้สอน'}) ไม่สามารถได้รับมอบหมายให้ตรวจสอบรายวิชาที่ตนเองสอน`,
      };
    }

    setAssignments((prev) => {
      const filtered = prev.filter((a) => a.course_id !== courseId);
      const newAssignment: ReviewerAssignment = {
        id: `ra-${Date.now()}`,
        term_id: activeTerm.id,
        reviewer_id: reviewerId,
        course_id: courseId,
        assignment_type: type,
        created_at: new Date().toISOString(),
      };
      return [...filtered, newAssignment];
    });

    const reviewer = users.find((u) => u.id === reviewerId);
    addAuditLog({
      action_type: 'REVIEWER_ASSIGNED',
      target_id: courseId,
      target_name: `วิชา ${course.course_code} ${course.course_name}`,
      details: {
        reviewer_id: reviewerId,
        reviewer_name: reviewer?.full_name || '',
        assignment_type: type,
      },
    });

    return { success: true };
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        currentRole,
        setCurrentRole,
        users,
        setUsers,
        academicTerms,
        activeTerm,
        setActiveTermId,
        courses,
        setCourses,
        assignments,
        setAssignments,
        submissions,
        setSubmissions,
        auditLogs,
        addAuditLog,
        submitPP5,
        submitRevision,
        reviewSubmission,
        approveSubmission,
        batchApproveSubmissions,
        extendDeadline,
        emergencyUnlock,
        toggleCourseOpenSubmission,
        assignReviewerWithCheck,
        login,
        selectRole,
        switchRole,
        logout,
        updateUserRoles,
        updateUser,
        verifyCredentials,
        changePassword,
        adminResetPassword,
        activeView,
        setActiveView,
        selectedSubmissionId,
        setSelectedSubmissionId,
        organizationDriveUrl,
        organizationDriveFolderId,
        organizationDriveTitle,
        updateOrganizationDriveUrl,
        schoolLogoUrl,
        customSchoolLogo,
        hasCustomLogo,
        uploadSchoolLogo,
        removeSchoolLogo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
