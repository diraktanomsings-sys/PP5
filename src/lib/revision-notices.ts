import type { Course, PP5Submission, User } from '../types/schema';
import { latestArchiveVersion } from './archive';

export function teacherRevisionNotices(
  submissions: PP5Submission[],
  courses: Course[],
  users: User[],
  teacherId: string,
  termId: string,
) {
  return submissions.flatMap((submission) => {
    const course = courses.find((c) => c.id === submission.course_id);
    if (
      submission.status !== 'REJECTED_REVISION' ||
      !course ||
      course.deleted_at ||
      course.teacher_id !== teacherId ||
      course.term_id !== termId
    )
      return [];
    // Only the current version's actual review may supply feedback. An old
    // review or a newly assigned reviewer must not be attributed to this result.
    const version = latestArchiveVersion(submission.versions);
    const reviewer = version?.reviewed_by
      ? users.find((u) => u.id === version.reviewed_by)
      : undefined;
    return [
      {
        id: submission.id,
        title: `วิชา ${course.course_code} ${course.course_name} (${course.grade_level}) ถูกส่งกลับแก้ไข`,
        reviewerName: reviewer?.full_name,
        notes: version?.reviewed_by ? version.reviewer_notes?.trim() : undefined,
      },
    ];
  });
}
