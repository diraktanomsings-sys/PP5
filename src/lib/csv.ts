import type { User } from '../types/schema';
export function parseCsv(source: string): string[][] {
  if (source.length > 300_000) throw new Error('CSV ต้องมีขนาดไม่เกิน 300 KB');
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  source = source.replace(/^\uFEFF/, '');
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        if (!quoted && value) throw new Error('รูปแบบเครื่องหมายคำพูด CSV ไม่ถูกต้อง');
        quoted = !quoted;
      }
    } else if (c === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && source[i + 1] === '\n') i++;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else value += c;
  }
  if (quoted) throw new Error('CSV มีเครื่องหมายคำพูดไม่ครบ');
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function parseCourseCsv(source: string, termId: string, users: User[]) {
  const [headers, ...rows] = parseCsv(source);
  const required = ['course_code', 'course_name', 'grade_level', 'teacher_id'];
  if (!headers || !required.every((k) => headers.includes(k)))
    throw new Error('CSV ต้องมีคอลัมน์ ' + required.join(', '));
  if (new Set(headers).size !== headers.length || rows.length < 1 || rows.length > 200)
    throw new Error('หัวคอลัมน์ต้องไม่ซ้ำ และมี 1–200 รายวิชา');
  return rows.map((row, index) => {
    if (row.length !== headers.length)
      throw new Error(`แถว ${index + 2} มีจำนวนคอลัมน์ไม่ตรงกับหัวตาราง`);
    const d = Object.fromEntries(headers.map((k, i) => [k, row[i]]));
    const teacher = users.find(
      (u) =>
        (u.id === d.teacher_id || u.teacher_id === d.teacher_id) &&
        u.is_active &&
        u.assigned_roles.includes('TEACHER'),
    );
    const reviewer = users.find(
      (u) =>
        (u.id === d.reviewer_id || u.teacher_id === d.reviewer_id) &&
        u.is_active &&
        u.assigned_roles.includes('REVIEWER'),
    );
    if (!teacher || (d.reviewer_id && !reviewer))
      throw new Error(`แถว ${index + 2}: ไม่พบครูหรือผู้ตรวจตามรหัสที่ระบุ`);
    return {
      termId,
      code: d.course_code,
      name: d.course_name,
      grade: d.grade_level,
      teacherId: teacher.id,
      reviewerId: reviewer?.id || '',
      department: d.department || '',
      creditHours: Number(d.credit_hours || 0),
      scoreRatio: d.score_ratio || '70:30',
    };
  });
}
