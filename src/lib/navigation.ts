import type { UserRole } from '../types/schema';
export function notificationView(
  role: UserRole,
  status: 'PENDING_REVIEW' | 'PENDING_DIRECTOR' | 'REJECTED_REVISION',
) {
  if (role === 'TEACHER')
    return status === 'REJECTED_REVISION' ? 'teacher/detail' : 'teacher/dashboard';
  if (role === 'REVIEWER')
    return status === 'REJECTED_REVISION' ? 'reviewer/revisions' : 'reviewer/dashboard';
  return `${role.toLowerCase()}/dashboard`;
}
