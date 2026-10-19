import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { api, fileUrl, uploadFile, RequestError } from './api';
import {
  roleNames,
  statusNames,
  type Role,
  type Snapshot,
  type Submission,
  type Course,
} from './types';
import schoolLogo from '../assets/schoolLogo';
import './app.css';
const PdfPreview = React.lazy(() => import('./PdfPreview'));
const date = (value: string) =>
  new Date(value).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
type Run = (action: () => Promise<void>, message?: string) => Promise<void>;
const values = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  return Object.fromEntries(new FormData(event.currentTarget));
};
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
function Badge({ status }: { status: Submission['status'] }) {
  return <span className={`badge ${status.toLowerCase()}`}>{statusNames[status]}</span>;
}
export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [health, setHealth] = useState<{ ready: boolean; initialized: boolean }>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState('work');
  const [selected, setSelected] = useState('');
  const requestSequence = useRef(0);
  const load = useCallback(async (role?: Role) => {
    const sequence = ++requestSequence.current;
    try {
      const ready = await api('health');
      if (sequence !== requestSequence.current) return;
      setHealth(ready);
      if (!ready.initialized) return;
      const next = await api<Snapshot>('state', undefined, role);
      if (sequence === requestSequence.current) setSnapshot(next);
    } catch (e) {
      if (sequence !== requestSequence.current) return;
      if (e instanceof RequestError && e.status === 401) {
        setSnapshot(undefined);
        setSelected('');
      } else {
        setError(e instanceof Error ? e.message : 'ติดต่อระบบไม่สำเร็จ');
        if (e instanceof RequestError && e.status === 503)
          setHealth({ ready: false, initialized: false });
      }
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const run: Run = async (action, message) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (message) setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ดำเนินการไม่สำเร็จ');
      if (e instanceof RequestError && e.status === 401) {
        setSnapshot(undefined);
        setSelected('');
      }
    } finally {
      setBusy(false);
    }
  };
  const save = async (action: string, body: unknown) => {
    await api(action, body, snapshot?.role);
    await load(snapshot?.role);
  };
  const logout = () =>
    run(async () => {
      await api('logout', {});
      ++requestSequence.current;
      setSnapshot(undefined);
      setSelected('');
      setPage('work');
    }, 'ออกจากระบบแล้ว');
  if (!snapshot)
    return (
      <main className="entry">
        <div className="entry-card">
          <img src={schoolLogo} alt="ตราโรงเรียนบ้านคูเมือง" className="crest" />
          <h1>ระบบ ปพ.5 ออนไลน์</h1>
          <p className="muted">โรงเรียนบ้านคูเมือง · สพป.สิงห์บุรี</p>
          {error && (
            <div role="alert" className="alert error">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              {notice}
            </div>
          )}
          {!health ? (
            <p>กำลังตรวจสอบระบบ…</p>
          ) : !health.ready ? (
            <>
              <p>ระบบกำลังเตรียมเปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ</p>
              <button onClick={() => void load()}>ลองอีกครั้ง</button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                const body = values(e);
                void run(async () => {
                  await api(health.initialized ? 'login' : 'setup', body);
                  await load();
                  setPage('work');
                });
              }}
            >
              <fieldset disabled={busy}>
                {!health.initialized ? (
                  <>
                    <h2>เปิดใช้งานครั้งแรก</h2>
                    <p className="muted">สำหรับผู้ดูแลที่ได้รับรหัสเปิดใช้งาน</p>
                    <Field label="รหัสเปิดใช้งาน">
                      <input
                        name="token"
                        type="password"
                        autoComplete="off"
                        required
                        minLength={32}
                      />
                    </Field>
                    <Field label="ชื่อผู้ดูแลระบบ">
                      <input name="name" required maxLength={200} autoComplete="name" />
                    </Field>
                    <Field label="อีเมลผู้ดูแล">
                      <input name="email" type="email" required autoComplete="email" />
                    </Field>
                  </>
                ) : (
                  <Field label="อีเมลหรือรหัสบุคลากร">
                    <input name="identifier" required maxLength={200} autoComplete="username" />
                  </Field>
                )}
                <Field
                  label={health.initialized ? 'รหัสผ่าน' : 'ตั้งรหัสผ่าน (อย่างน้อย 12 ตัวอักษร)'}
                >
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={health.initialized ? 1 : 12}
                    maxLength={128}
                    autoComplete={health.initialized ? 'current-password' : 'new-password'}
                  />
                </Field>
                <button className="primary full" type="submit">
                  {busy
                    ? 'กำลังดำเนินการ…'
                    : health.initialized
                      ? 'เข้าสู่ระบบ'
                      : 'สร้างบัญชีผู้ดูแลและเปิดใช้งาน'}
                </button>
              </fieldset>
            </form>
          )}
        </div>
      </main>
    );
  const s = snapshot;
  const current = s.submissions.find((sub) => sub.id === selected);
  return (
    <div className="application">
      <header className="app-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setSelected('');
            setPage('work');
          }}
        >
          <img src={schoolLogo} alt="ตราโรงเรียน" />
          <div>
            <strong>ปพ.5 ออนไลน์</strong>
            <span>โรงเรียนบ้านคูเมือง</span>
          </div>
        </a>
        <div className="identity">
          <span>{s.user.name}</span>
          <select
            aria-label="บทบาทที่ใช้งาน"
            value={s.role}
            disabled={busy}
            onChange={(e) => {
              setSelected('');
              setPage('work');
              void run(() => load(e.target.value as Role));
            }}
          >
            {s.user.roles.map((r) => (
              <option key={r} value={r}>
                {roleNames[r]}
              </option>
            ))}
          </select>
          <button disabled={busy} onClick={() => void logout()}>
            ออกจากระบบ
          </button>
        </div>
      </header>
      <div className="layout">
        <aside className="navigation">
          <span className="eyebrow">{roleNames[s.role]}</span>
          {[
            ['work', s.role === 'ADMIN' ? 'ภาพรวมและรายวิชา' : 'รายการเอกสาร'],
            ['archive', 'คลังเอกสารที่อนุมัติ'],
            ...(s.role === 'ADMIN'
              ? [
                  ['settings', 'ตั้งค่าระบบและผู้ใช้'],
                  ['audit', 'ประวัติการทำรายการ'],
                ]
              : []),
            ['password', 'เปลี่ยนรหัสผ่าน'],
          ].map(([key, title]) => (
            <button
              className={page === key ? 'active' : ''}
              key={key}
              disabled={busy}
              onClick={() => {
                setPage(key);
                setSelected('');
                setNotice('');
              }}
            >
              {title}
            </button>
          ))}
          <p className="muted">ข้อมูลและไฟล์บันทึกบนเซิร์ฟเวอร์</p>
        </aside>
        <main className="workspace" aria-busy={busy}>
          {error && (
            <div role="alert" className="alert error">
              {error}
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              {notice}
            </div>
          )}
          {busy && (
            <div role="status" className="alert">
              กำลังบันทึก / อัปโหลดข้อมูล… กรุณารอ
            </div>
          )}
          <fieldset disabled={busy}>
            {page === 'password' ? (
              <Panel title="เปลี่ยนรหัสผ่าน">
                <form
                  className="narrow"
                  onSubmit={(e) => {
                    const body = values(e);
                    if (body.password !== body.confirm) {
                      setError('รหัสผ่านใหม่ไม่ตรงกัน');
                      return;
                    }
                    void run(async () => {
                      await api('password', body);
                      ++requestSequence.current;
                      setSnapshot(undefined);
                    }, 'เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่');
                  }}
                >
                  <Field label="รหัสผ่านเดิม">
                    <input
                      name="current"
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </Field>
                  <Field label="รหัสผ่านใหม่">
                    <input
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={128}
                      required
                    />
                  </Field>
                  <Field label="ยืนยันรหัสผ่านใหม่">
                    <input
                      name="confirm"
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      required
                    />
                  </Field>
                  <button className="primary">บันทึกและออกจากระบบทุกอุปกรณ์</button>
                </form>
              </Panel>
            ) : page === 'settings' ? (
              <AdminSettings snapshot={s} save={save} run={run} />
            ) : page === 'audit' ? (
              <Panel title="ประวัติการทำรายการ">
                <p className="muted">200 รายการล่าสุด</p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>เวลา</th>
                        <th>ผู้ดำเนินการ</th>
                        <th>รายการ</th>
                        <th>อ้างอิง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.audit.map((log) => (
                        <tr key={log.id}>
                          <td>{date(log.at)}</td>
                          <td>{log.actorName}</td>
                          <td>{log.action}</td>
                          <td className="mono">{log.target}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            ) : current ? (
              <DocumentDetail
                key={current.id}
                snapshot={s}
                submission={current}
                back={() => setSelected('')}
                save={save}
                run={run}
              />
            ) : (
              <>
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">ระบบรับส่งเอกสาร ปพ.5</span>
                    <h1>
                      {page === 'archive'
                        ? 'คลังเอกสารที่อนุมัติแล้ว'
                        : s.role === 'TEACHER'
                          ? 'รายวิชาที่รับผิดชอบ'
                          : s.role === 'REVIEWER'
                            ? 'เอกสารที่ได้รับมอบหมายให้ตรวจ'
                            : 'รายการเอกสารและรายวิชา'}
                    </h1>
                  </div>
                  <button onClick={() => void run(() => load(s.role))}>รีเฟรชข้อมูล</button>
                </div>
                {page === 'archive' && (
                  <a className="button" href={`/api/pp5?action=archive&role=${s.role}`}>
                    ดาวน์โหลด ZIP รวม (ไม่เกิน 50 MB)
                  </a>
                )}
                <div className="stats">
                  {Object.entries(statusNames).map(([status, name]) => (
                    <div key={status}>
                      <strong>{s.submissions.filter((sub) => sub.status === status).length}</strong>
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
                <CourseList
                  key={`${page}:${s.role}`}
                  snapshot={s}
                  archive={page === 'archive'}
                  open={setSelected}
                  run={run}
                  reload={() => load(s.role)}
                />
                {s.role === 'ADMIN' && page === 'work' && (
                  <p className="empty">
                    เพิ่มผู้ใช้ ปี/ภาคเรียน และรายวิชาได้ที่ “ตั้งค่าระบบและผู้ใช้”
                    ผู้ตรวจต้องเป็นคนละคนกับครูผู้สอน
                  </p>
                )}
              </>
            )}
          </fieldset>
          <footer>ระบบ ปพ.5 ออนไลน์ · โรงเรียนบ้านคูเมือง</footer>
        </main>
      </div>
    </div>
  );
}
function CourseList({
  snapshot: s,
  archive,
  open,
  run,
  reload,
}: {
  snapshot: Snapshot;
  archive: boolean;
  open: (id: string) => void;
  run: Run;
  reload: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState('');
  const [term, setTerm] = useState(s.terms.find((t) => t.active)?.id || '');
  const courses = s.courses.filter(
    (c) =>
      (!term || c.termId === term) &&
      (!archive ||
        s.submissions.some((sub) => sub.courseId === c.id && sub.status === 'FINAL_LOCKED')),
  );
  const course = s.courses.find((c) => c.id === submitting);
  if (course)
    return (
      <SubmitForm
        course={course}
        snapshot={s}
        back={() => setSubmitting('')}
        run={run}
        reload={async () => {
          await reload();
          setSubmitting('');
        }}
      />
    );
  return (
    <Panel title={archive ? 'เอกสารในคลัง' : 'รายการรายวิชา'}>
      <Field label="ปีการศึกษา / ภาคเรียน">
        <select value={term} onChange={(e) => setTerm(e.target.value)}>
          <option value="">ทุกปี/ภาคเรียน</option>
          {s.terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.year} / {t.semester}
              {t.active ? ' (ปัจจุบัน)' : ''}
            </option>
          ))}
        </select>
      </Field>
      {!courses.length ? (
        <p className="empty">
          ยังไม่มีรายการในรอบนี้ กรุณาติดต่อผู้ดูแลเพื่อเพิ่มรายวิชาหรือมอบหมายผู้ตรวจ
        </p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>รายวิชา / ห้อง</th>
                <th>ครู / ผู้ตรวจ</th>
                <th>สถานะ</th>
                <th>ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const sub = s.submissions.find((sub) => sub.courseId === c.id);
                const t = s.terms.find((t) => t.id === c.termId);
                const canSubmit =
                  s.role === 'TEACHER' &&
                  c.teacherId === s.user.id &&
                  (!sub || sub.status === 'REJECTED_REVISION');
                return (
                  <tr key={c.id}>
                    <td>
                      <strong>
                        {c.code} {c.name}
                      </strong>
                      <small>
                        {c.grade} · กำหนดส่ง {t ? date(t.deadline) : '—'}
                      </small>
                    </td>
                    <td>
                      {s.people.find((p) => p.id === c.teacherId)?.name}
                      <small>
                        ผู้ตรวจ: {s.people.find((p) => p.id === c.reviewerId)?.name || '—'}
                      </small>
                    </td>
                    <td>
                      {sub ? (
                        <>
                          <Badge status={sub.status} />
                          <small>V{String(sub.versions.length).padStart(3, '0')}</small>
                        </>
                      ) : (
                        <span className="badge">ยังไม่ส่ง</span>
                      )}
                    </td>
                    <td>
                      <div className="actions">
                        {sub && <button onClick={() => open(sub.id)}>เปิดเอกสาร</button>}
                        {canSubmit && (
                          <button
                            className="primary"
                            disabled={!c.open || !t?.active || Date.parse(t.deadline) < Date.now()}
                            onClick={() => setSubmitting(c.id)}
                          >
                            {sub ? 'ส่งฉบับแก้ไข' : 'ส่ง ปพ.5'}
                          </button>
                        )}
                        {s.role === 'ADMIN' && (
                          <button
                            onClick={() =>
                              void run(async () => {
                                await api('course-open', { id: c.id, open: !c.open }, s.role);
                                await reload();
                              })
                            }
                          >
                            {c.open ? 'ปิดรับส่ง' : 'เปิดรับส่ง'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
function SubmitForm({
  course,
  snapshot: s,
  back,
  run,
  reload,
}: {
  course: Course;
  snapshot: Snapshot;
  back: () => void;
  run: Run;
  reload: () => Promise<void>;
}) {
  const [excel, setExcel] = useState<File>();
  const [pdf, setPdf] = useState<File>();
  const [confirmed, setConfirmed] = useState(false);
  const previous = s.submissions.find((sub) => sub.courseId === course.id);
  return (
    <Panel title={`ส่ง ${course.code} ${course.name} · ${course.grade}`}>
      <p>
        ฉบับ V{String((previous?.versions.length || 0) + 1).padStart(3, '0')} ·
        แนบไฟล์จริงทั้งสองประเภท สูงสุดไฟล์ละ 25 MB
      </p>
      <form
        onSubmit={(e) => {
          const data = values(e);
          void run(async () => {
            if (!excel || !pdf || !confirmed)
              throw new Error('กรุณาเลือกไฟล์ทั้งสองประเภทและยืนยันความถูกต้อง');
            for (const f of [excel, pdf])
              if (!f.size || f.size > 25 * 1024 * 1024)
                throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 25 MB');
            const x = await uploadFile(excel, 'excel', course.id, s);
            const p = await uploadFile(pdf, 'pdf', course.id, s);
            await api(
              'submit',
              {
                courseId: course.id,
                excelId: x.id,
                pdfId: p.id,
                confirmed,
                expectedRevision: previous?.revision || 0,
                notes: data.notes,
              },
              s.role,
            );
            await reload();
          }, 'ส่งเอกสารและบันทึกไฟล์สำเร็จ');
        }}
      >
        <div className="form-grid">
          <Field label="ไฟล์ Excel (.xlsx)">
            <input
              aria-label="ไฟล์ Excel"
              type="file"
              accept=".xlsx"
              required
              onChange={(e) => setExcel(e.target.files?.[0])}
            />
          </Field>
          <Field label="ไฟล์ PDF (.pdf)">
            <input
              aria-label="ไฟล์ PDF"
              type="file"
              accept=".pdf"
              required
              onChange={(e) => setPdf(e.target.files?.[0])}
            />
          </Field>
        </div>
        <Field label="หมายเหตุถึงผู้ตรวจ">
          <textarea name="notes" maxLength={4000} rows={3} />
        </Field>
        <label className="check">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          ยืนยันว่า Excel และ PDF เป็นฉบับเดียวกันและตรวจสอบข้อมูลแล้ว
        </label>
        <div className="actions">
          <button type="button" onClick={back}>
            ยกเลิก
          </button>
          <button className="primary" disabled={!excel || !pdf || !confirmed}>
            อัปโหลดและส่งให้ผู้ตรวจ
          </button>
        </div>
      </form>
    </Panel>
  );
}
function DocumentDetail({
  snapshot: s,
  submission: sub,
  back,
  save,
  run,
}: {
  snapshot: Snapshot;
  submission: Submission;
  back: () => void;
  save: (action: string, body: unknown) => Promise<void>;
  run: Run;
}) {
  const [versionNumber, setVersionNumber] = useState(sub.versions.length);
  const [preview, setPreview] = useState(false);
  const [checks, setChecks] = useState([false, false, false, false]);
  const [notes, setNotes] = useState('');
  const v = sub.versions.find((v) => v.number === versionNumber) || sub.versions.at(-1)!;
  const c = s.courses.find((c) => c.id === sub.courseId)!;
  return (
    <>
      <button onClick={back}>← กลับรายการ</button>
      <Panel title={`${c.code} ${c.name} · ${c.grade}`}>
        <Badge status={sub.status} />
        <Field label="เวอร์ชันเอกสาร">
          <select
            value={v.number}
            onChange={(e) => {
              setVersionNumber(Number(e.target.value));
              setPreview(false);
            }}
          >
            {[...sub.versions].reverse().map((v) => (
              <option key={v.number} value={v.number}>
                V{String(v.number).padStart(3, '0')} · {date(v.submittedAt)}
              </option>
            ))}
          </select>
        </Field>
        <p>
          ส่งโดย {s.people.find((p) => p.id === v.submittedBy)?.name || v.submittedBy} ·{' '}
          {date(v.submittedAt)}
        </p>
        {v.notes && <p className="note">หมายเหตุ: {v.notes}</p>}
        <div className="file-grid">
          {[v.excel, v.pdf].map((f) => (
            <div className="file-card" key={f.id}>
              <strong>{f.kind === 'pdf' ? 'PDF' : 'Excel'}</strong>
              <span>{f.name}</span>
              <small>{(f.size / 1024 / 1024).toFixed(2)} MB</small>
              <a className="button" href={fileUrl(f.id, s.role)}>
                ดาวน์โหลด {f.kind === 'pdf' ? 'PDF' : 'Excel'}
              </a>
              <details>
                <summary>ค่า SHA-256 ของไฟล์</summary>
                <code>{f.sha256}</code>
              </details>
            </div>
          ))}
        </div>
        <button onClick={() => setPreview(!preview)}>
          {preview ? 'ปิดตัวอย่าง PDF' : 'เปิดไฟล์ PDF ที่ส่งจริง'}
        </button>
        {preview && (
          <React.Suspense fallback={<p>กำลังเปิดตัวอ่านเอกสาร…</p>}>
            <PdfPreview url={fileUrl(v.pdf.id, s.role, true)} />
          </React.Suspense>
        )}
        {v.review && (
          <div className="note">
            <strong>{v.review.pass ? 'ผลตรวจ: ผ่าน' : 'ผลตรวจ: ส่งกลับแก้ไข'}</strong>
            <p>{v.review.notes}</p>
            <small>
              {s.people.find((p) => p.id === v.review!.by)?.name || v.review.by} ·{' '}
              {date(v.review.at)}
            </small>
          </div>
        )}
      </Panel>
      {s.role === 'REVIEWER' && sub.status === 'PENDING_REVIEW' && (
        <Panel title="บันทึกผลตรวจฉบับล่าสุด">
          <p>เปิดไฟล์ล่าสุดตรวจให้ครบก่อนรับรอง</p>
          {[
            'คะแนนและสูตรคำนวณถูกต้อง',
            'เวลาเรียนครบตามเกณฑ์',
            'คุณลักษณะอันพึงประสงค์ครบถ้วน',
            'การอ่าน คิดวิเคราะห์ และเขียนครบถ้วน',
          ].map((name, i) => (
            <label className="check" key={name}>
              <input
                type="checkbox"
                checked={checks[i]}
                onChange={(e) => setChecks(checks.map((v, j) => (i === j ? e.target.checked : v)))}
              />
              {name}
            </label>
          ))}
          <Field label="ผลตรวจ / ข้อเสนอแนะ (จำเป็น)">
            <textarea
              value={notes}
              maxLength={4000}
              rows={4}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <div className="actions">
            <button
              disabled={!notes.trim()}
              onClick={() =>
                void run(
                  () =>
                    save('review', {
                      id: sub.id,
                      expectedRevision: sub.revision,
                      pass: false,
                      checks,
                      notes,
                    }),
                  'ส่งกลับให้ครูแก้ไขแล้ว',
                )
              }
            >
              ส่งกลับแก้ไข
            </button>
            <button
              className="primary"
              disabled={!notes.trim() || !checks.every(Boolean)}
              onClick={() =>
                void run(
                  () =>
                    save('review', {
                      id: sub.id,
                      expectedRevision: sub.revision,
                      pass: true,
                      checks,
                      notes,
                    }),
                  'รับรองและส่งต่อผู้บริหารแล้ว',
                )
              }
            >
              รับรองและส่งผู้บริหาร
            </button>
          </div>
        </Panel>
      )}
      {s.role === 'EXECUTIVE' && sub.status === 'PENDING_DIRECTOR' && (
        <Panel title="บันทึกการอนุมัติเอกสาร">
          <p>การอนุมัติจะผูกกับเวอร์ชันไฟล์ ผู้อนุมัติ เวลา และลายมือชื่อที่วาดด้านล่าง</p>
          <Signature
            onConfirm={(signature) =>
              void run(
                () =>
                  save('approve', {
                    id: sub.id,
                    expectedRevision: sub.revision,
                    signature,
                    confirmed: true,
                  }),
                'อนุมัติและล็อกเวอร์ชันเอกสารแล้ว',
              )
            }
          />
        </Panel>
      )}
      {sub.approval && (
        <Panel title="หลักฐานการอนุมัติ">
          <p>
            ผู้อนุมัติ: {s.people.find((p) => p.id === sub.approval!.by)?.name || sub.approval.by} ·{' '}
            {date(sub.approval.at)}
          </p>
          <img
            className="signature-proof"
            src={sub.approval.signature}
            alt="ลายมือชื่อที่บันทึกการอนุมัติ"
          />
          <p>ค่า SHA-256 ของบันทึกการอนุมัติ</p>
          <code>{sub.approval.manifestHash}</code>
          <p className="muted">ลายมือชื่อและบันทึกอนุมัติผูกกับไฟล์ต้นฉบับและเวอร์ชันนี้</p>
        </Panel>
      )}
    </>
  );
}
function Signature({ onConfirm }: { onConfirm: (data: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const points = useRef(0);
  const [ready, setReady] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) * 640) / rect.width,
      ((e.clientY - rect.top) * 160) / rect.height,
    ] as const;
  };
  return (
    <>
      <canvas
        className="signature-pad"
        width={640}
        height={160}
        aria-label="พื้นที่วาดลายมือชื่อ"
        ref={canvas}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          points.current = 0;
          const ctx = e.currentTarget.getContext('2d')!;
          ctx.strokeStyle = '#00236f';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(...point(e));
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = e.currentTarget.getContext('2d')!;
          ctx.lineTo(...point(e));
          ctx.stroke();
          points.current++;
          if (points.current > 5) setReady(true);
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />
      <label className="check">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        ยืนยันตรวจเอกสารล่าสุดและอนุมัติการล็อกเวอร์ชันนี้
      </label>
      <div className="actions">
        <button
          onClick={() => {
            canvas.current!.getContext('2d')!.clearRect(0, 0, 640, 160);
            setReady(false);
            points.current = 0;
          }}
        >
          ล้างลายมือชื่อ
        </button>
        <button
          className="primary"
          disabled={!ready || !confirmed}
          onClick={() => onConfirm(canvas.current!.toDataURL('image/png'))}
        >
          ยืนยันอนุมัติและล็อกเอกสาร
        </button>
      </div>
    </>
  );
}
function AdminSettings({
  snapshot: s,
  save,
  run,
}: {
  snapshot: Snapshot;
  save: (action: string, body: unknown) => Promise<void>;
  run: Run;
}) {
  const [roles, setRoles] = useState<Role[]>(['TEACHER']);
  return (
    <div className="settings">
      <Panel title="เพิ่มบัญชีผู้ใช้">
        <form
          onSubmit={(e) => {
            const body = values(e);
            const form = e.currentTarget;
            void run(async () => {
              await save('user', { ...body, roles });
              form.reset();
            }, 'เพิ่มบัญชีผู้ใช้แล้ว');
          }}
        >
          <div className="form-grid">
            <Field label="ชื่อบุคลากร">
              <input name="name" required maxLength={200} />
            </Field>
            <Field label="รหัสบุคลากร">
              <input name="teacherId" required maxLength={50} />
            </Field>
            <Field label="อีเมล">
              <input name="email" type="email" required />
            </Field>
            <Field label="รหัสผ่านเริ่มต้น (อย่างน้อย 12 ตัวอักษร)">
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="actions">
            {(Object.keys(roleNames) as Role[]).map((role) => (
              <label className="check" key={role}>
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={(e) =>
                    setRoles(e.target.checked ? [...roles, role] : roles.filter((r) => r !== role))
                  }
                />
                {roleNames[role]}
              </label>
            ))}
          </div>
          <button className="primary" disabled={!roles.length}>
            เพิ่มบัญชี
          </button>
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ชื่อ / รหัส</th>
                <th>อีเมล / บทบาท</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {s.people.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.name}
                    <small>{p.teacherId}</small>
                  </td>
                  <td>
                    {p.email}
                    <small>{p.roles.map((r) => roleNames[r]).join(', ')}</small>
                  </td>
                  <td>
                    {p.id === s.user.id ? (
                      'บัญชีปัจจุบัน'
                    ) : (
                      <button
                        onClick={() =>
                          void run(() => save('user-active', { id: p.id, active: !p.active }))
                        }
                      >
                        {p.active ? 'ระงับบัญชี' : 'เปิดบัญชีอีกครั้ง'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="เปิดรอบปีการศึกษา / ภาคเรียน">
        <form
          onSubmit={(e) => {
            const body = values(e);
            void run(
              () =>
                save('term', {
                  ...body,
                  year: Number(body.year),
                  semester: Number(body.semester),
                  deadline: new Date(String(body.deadline) + '+07:00').toISOString(),
                }),
              'เปิดรอบภาคเรียนแล้ว',
            );
          }}
        >
          <div className="form-grid">
            <Field label="ปีการศึกษา (พ.ศ.)">
              <input name="year" type="number" min={2500} max={2700} required />
            </Field>
            <Field label="ภาคเรียน">
              <select name="semester">
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </Field>
            <Field label="กำหนดส่งเอกสาร (เวลาไทย)">
              <input name="deadline" type="datetime-local" required />
            </Field>
          </div>
          <p className="muted">
            การเปิดรอบใหม่จะปิดรอบส่งของภาคเรียนก่อนหน้า เอกสารเดิมยังอยู่ในคลัง
          </p>
          <button className="primary">บันทึกและเปิดรอบใหม่</button>
        </form>
        {s.terms.map((t) => (
          <form
            className="inline-form"
            key={t.id}
            onSubmit={(e) => {
              const body = values(e);
              void run(
                () =>
                  save('deadline', {
                    id: t.id,
                    reason: body.reason,
                    deadline: new Date(String(body.deadline) + '+07:00').toISOString(),
                  }),
                'ปรับกำหนดส่งแล้ว',
              );
            }}
          >
            <strong>
              {t.year}/{t.semester} {t.active ? 'ปัจจุบัน' : ''}
            </strong>
            <span>{date(t.deadline)}</span>
            <input
              aria-label={`กำหนดส่งใหม่ ${t.year}/${t.semester}`}
              type="datetime-local"
              name="deadline"
              required
            />
            <input
              aria-label="เหตุผลการเปลี่ยนกำหนดส่ง"
              name="reason"
              placeholder="เหตุผล"
              required
            />
            <button>ปรับกำหนดส่ง</button>
          </form>
        ))}
      </Panel>
      <Panel title="เพิ่มรายวิชาและมอบหมายผู้ตรวจ">
        <form
          onSubmit={(e) => {
            const body = values(e);
            const form = e.currentTarget;
            void run(async () => {
              await save('course', body);
              form.reset();
            }, 'บันทึกรายวิชาและผู้ตรวจแล้ว');
          }}
        >
          <div className="form-grid">
            <Field label="ปี/ภาคเรียน">
              <select name="termId" required>
                {s.terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.year}/{t.semester}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="รหัสวิชา">
              <input name="code" required maxLength={50} />
            </Field>
            <Field label="ชื่อวิชา">
              <input name="name" required maxLength={200} />
            </Field>
            <Field label="ชั้น/ห้อง">
              <input name="grade" required maxLength={50} placeholder="เช่น ป.3/1" />
            </Field>
            <Field label="ครูผู้สอน">
              <select name="teacherId" required>
                <option value="">เลือกครูผู้สอน</option>
                {s.people
                  .filter((p) => p.active && p.roles.includes('TEACHER'))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="ผู้ตรวจ (ต้องเป็นคนละคน)">
              <select name="reviewerId" required>
                <option value="">เลือกผู้ตรวจ</option>
                {s.people
                  .filter((p) => p.active && p.roles.includes('REVIEWER'))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
          <button className="primary" disabled={!s.terms.length}>
            บันทึกรายวิชา
          </button>
        </form>
      </Panel>
    </div>
  );
}
