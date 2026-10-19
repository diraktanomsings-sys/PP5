import type { AcademicTerm, Course, PP5Submission, User, SubmissionVersion } from '../types/schema';

export const archiveStatuses = {
  ALL: 'ทุกสถานะที่ส่งแล้ว',
  PENDING_REVIEW: 'รอตรวจ',
  REJECTED_REVISION: 'ส่งกลับแก้ไข',
  PENDING_DIRECTOR: 'รอผู้บริหารอนุมัติ',
  FINAL_LOCKED: 'อนุมัติและล็อกเล่มแล้ว',
} as const;
export type ArchiveStatus = keyof typeof archiveStatuses;
export type ArchiveFilters = {
  termId: string;
  year: string;
  grade: string;
  q: string;
  status: ArchiveStatus;
};
export function sameGradeLevel(grade: string, selected: string) {
  const normalize = (s: string) => s.replace(/\s/g, '').split(/[/-]/)[0];
  return normalize(grade) === normalize(selected);
}
export function latestArchiveVersion(versions: SubmissionVersion[]) {
  return versions.reduce<SubmissionVersion | undefined>(
    (latest, v) =>
      !latest ||
      Number(v.version_number.replace(/^V/i, '')) > Number(latest.version_number.replace(/^V/i, ''))
        ? v
        : latest,
    undefined,
  );
}
export function archiveRows(
  data: { submissions: PP5Submission[]; courses: Course[]; terms: AcademicTerm[]; users: User[] },
  filters: ArchiveFilters,
) {
  return data.submissions
    .filter(
      (s) => s.versions.length > 0 && (filters.status === 'ALL' || s.status === filters.status),
    )
    .map((submission) => {
      const course = data.courses.find((c) => c.id === submission.course_id);
      return {
        submission,
        course,
        term: data.terms.find((t) => t.id === course?.term_id),
        teacher: data.users.find((u) => u.id === course?.teacher_id),
        latestVer: latestArchiveVersion(submission.versions),
      };
    })
    .filter(({ course, term, teacher }) => {
      if (!course) return false;
      if (filters.termId !== 'ALL' && course.term_id !== filters.termId) return false;
      if (filters.year !== 'ALL' && String(term?.year) !== filters.year) return false;
      if (filters.grade !== 'ALL' && !sameGradeLevel(course.grade_level, filters.grade))
        return false;
      const q = filters.q.trim().toLocaleLowerCase();
      return (
        !q ||
        [course.course_code, course.course_name, course.grade_level, teacher?.full_name].some((s) =>
          s?.toLocaleLowerCase().includes(q),
        )
      );
    });
}
