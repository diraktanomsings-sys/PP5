import type { Role, Snapshot, FileRecord } from './types';
export class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T = any>(
  action: string,
  body?: unknown,
  role?: Role,
  query?: Record<string, string>,
): Promise<T> {
  const response = await fetch(`/api/pp5?${new URLSearchParams({ ...query, action })}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(role ? { 'X-PP5-Role': role } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({ error: 'ไม่สามารถติดต่อระบบได้' }));
  if (!response.ok) throw new RequestError(response.status, data.error || 'ดำเนินการไม่สำเร็จ');
  return data;
}
export const fileUrl = (id: string, role: Role, inline = false) =>
  `/api/pp5?action=file&id=${encodeURIComponent(id)}&role=${role}${inline ? '&inline=1' : ''}`;
export async function uploadFile(
  file: File,
  kind: 'excel' | 'pdf',
  courseId: string,
  snapshot: Snapshot,
  purpose?: 'annotation',
): Promise<FileRecord> {
  const intent = await api(
    'reserve',
    { name: file.name, size: file.size, kind, courseId, purpose },
    snapshot.role,
  );
  if (snapshot.storage === 'blob') {
    const { uploadPresigned } = await import('@vercel/blob/client');
    await uploadPresigned(intent.pathname, file, {
      access: 'private',
      contentType:
        kind === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      handleUploadUrl: '/api/pp5?action=blob',
      clientPayload: JSON.stringify({ id: intent.id }),
      multipart: true,
    });
    return api('finalize', { id: intent.id }, snapshot.role);
  }
  const response = await fetch(`/api/pp5?action=upload&id=${encodeURIComponent(intent.id)}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/octet-stream', 'X-PP5-Role': snapshot.role },
    body: file,
  });
  const result = await response.json();
  if (!response.ok) throw new RequestError(response.status, result.error);
  return result;
}
