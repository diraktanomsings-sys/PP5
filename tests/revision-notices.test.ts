import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { teacherRevisionNotices } from '../src/lib/revision-notices';
import { RevisionNotices } from '../src/components/teacher/RevisionNotices';
import type { Course, PP5Submission, User } from '../src/types/schema';

const courses = [
  {
    id: 'math',
    course_code: 'ค14101',
    course_name: 'คณิตศาสตร์ 4',
    grade_level: 'ป.4/2',
    teacher_id: 'teacher',
    term_id: 'current',
  },
  {
    id: 'science',
    course_code: 'ว15101',
    course_name: 'วิทยาศาสตร์ 5',
    grade_level: 'ป.5/1',
    teacher_id: 'teacher',
    term_id: 'current',
  },
  { id: 'other', teacher_id: 'someone-else', term_id: 'current' },
  { id: 'old', teacher_id: 'teacher', term_id: 'previous' },
  { id: 'deleted', teacher_id: 'teacher', term_id: 'current', deleted_at: '2026-01-01' },
] as Course[];
const users = [
  { id: 'actual', full_name: 'ผู้ตรวจผลจริง' },
  { id: 'old-reviewer', full_name: 'ผู้ตรวจครั้งก่อน' },
] as User[];
function submission(id: string, course_id: string, status = 'REJECTED_REVISION'): PP5Submission {
  return {
    id,
    course_id,
    status,
    versions: [
      { version_number: 'V001', reviewed_by: 'old-reviewer', reviewer_notes: 'เหตุผลฉบับเก่า' },
      {
        version_number: 'V003',
        reviewed_by: 'actual',
        reviewer_notes: 'กรุณาตรวจเวลาเรียนหน้าที่ 7\nและแนบหน้าสรุป',
      },
      { version_number: 'V002', reviewed_by: 'old-reviewer', reviewer_notes: 'เหตุผลฉบับก่อน' },
    ],
  } as PP5Submission;
}
const notices = (submissions: PP5Submission[]) =>
  teacherRevisionNotices(submissions, courses, users, 'teacher', 'current');

test('teacher revision notices use each actual course, latest reviewed version and exact submission target', () => {
  const result = notices([submission('s-math', 'math'), submission('s-science', 'science')]);
  assert.deepEqual(
    result.map((n) => n.id),
    ['s-math', 's-science'],
  );
  assert.equal(result[0].title, 'วิชา ค14101 คณิตศาสตร์ 4 (ป.4/2) ถูกส่งกลับแก้ไข');
  assert.match(result[1].title, /ว15101 วิทยาศาสตร์ 5 \(ป.5\/1\)/);
  assert.equal(result[0].reviewerName, 'ผู้ตรวจผลจริง');
  assert.equal(result[0].notes, 'กรุณาตรวจเวลาเรียนหน้าที่ 7\nและแนบหน้าสรุป');
  const html = renderToStaticMarkup(
    React.createElement(RevisionNotices, { notices: result, onOpen() {} }),
  );
  assert.equal((html.match(/<button/g) || []).length, 2);
  assert.match(html, /ผู้ตรวจผลจริง/);
  assert.match(html, /กรุณาตรวจเวลาเรียนหน้าที่ 7/);
  for (const fake of ['ท13101', 'ครูกิตติศักดิ์', 'เหตุผลฉบับเก่า', 'อัปโหลด V002'])
    assert.ok(!html.includes(fake));
});

test('no rejected notice for another teacher, old term, removed course or resubmitted/approved work', () => {
  for (const status of ['PENDING_REVIEW', 'PENDING_DIRECTOR', 'FINAL_LOCKED']) {
    assert.deepEqual(
      notices([
        submission('other', 'other'),
        submission('old', 'old'),
        submission('deleted', 'deleted'),
        submission('missing', 'unknown'),
        submission('mine', 'math', status),
      ]),
      [],
    );
  }
  assert.equal(
    renderToStaticMarkup(React.createElement(RevisionNotices, { notices: [], onOpen() {} })),
    '',
  );
});

test('missing current review never reuses an old review or attributes teacher notes to a reviewer', () => {
  const s = submission('s', 'math');
  s.versions[1] = { version_number: 'V004', reviewer_notes: 'บันทึกของผู้ส่ง' } as any;
  const [notice] = notices([s]);
  assert.equal(notice.reviewerName, undefined);
  assert.equal(notice.notes, undefined);
  const html = renderToStaticMarkup(
    React.createElement(RevisionNotices, { notices: [notice], onOpen() {} }),
  );
  assert.match(html, /ไม่มีข้อความเหตุผลเพิ่มเติม/);
  assert.ok(!html.includes('บันทึกของผู้ส่ง'));
  assert.ok(!html.includes('ผู้ตรวจครั้งก่อน'));
});

test('unavailable reviewer names stay neutral while retaining saved feedback; text renders escaped', () => {
  const s = submission('s', 'math');
  s.versions[1].reviewed_by = 'unavailable';
  s.versions[1].reviewer_notes = '<script>alert(1)</script>';
  const result = notices([s]);
  assert.equal(result[0].reviewerName, undefined);
  assert.equal(result[0].notes, '<script>alert(1)</script>');
  const html = renderToStaticMarkup(
    React.createElement(RevisionNotices, { notices: result, onOpen() {} }),
  );
  assert.match(html, /ผลการตรวจที่บันทึกไว้/);
  assert.ok(!html.includes('<script>'));
});
