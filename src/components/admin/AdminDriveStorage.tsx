import { useState } from 'react';
import { useApp } from '../../context/AppContext';

export function AdminDriveStorage() {
  const { driveStorage, mutate, busy, organizeDrive, cleanupDriveCopies } = useApp();
  const [url, setUrl] = useState(driveStorage?.url || '');
  const [folderId, setFolderId] = useState(
    driveStorage?.folderId || '1_9hk4918HBD1wmy2vK92W83jzYsPbrh4',
  );
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState('');
  const [showCleanup, setShowCleanup] = useState(false);
  const retainedBytes = (driveStorage?.retained || []).reduce((n, f) => n + f.size, 0);
  return (
    <section className="bg-white rounded-2xl border border-blue-200 p-5 space-y-4">
      <h3 className="font-bold text-blue-950">พื้นที่เก็บไฟล์ Google Drive ของโรงเรียน</h3>
      <p className="text-sm text-slate-600">
        {driveStorage?.enabled
          ? `เชื่อมต่อแล้ว: ${driveStorage.folderName} · ไฟล์ใหม่จะบันทึกเข้า Drive ก่อนยืนยันการส่ง`
          : 'ยังไม่ได้เชื่อมต่อ ไฟล์ยังเก็บในพื้นที่ส่วนตัวของ PP5'}
      </p>
      {driveStorage?.enabled && (
        <p className="text-xs text-slate-500">
          บัญชีตัวรับไฟล์: {driveStorage.ownerEmail} · ไฟล์ที่ส่งแล้วใน Drive{' '}
          {driveStorage.stored || 0} ไฟล์
        </p>
      )}
      {driveStorage?.enabled && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2 text-xs text-emerald-950">
          <p className="font-bold">
            Drive เป็นที่เก็บไฟล์หลัก · ระบบเก็บข้อมูลบัญชี รายวิชา และหลักฐานการอนุมัติไว้
          </p>
          <p>
            Excel, PDF ทุกเวอร์ชัน และไฟล์แนบผลตรวจอยู่ใน Drive
            ไฟล์ใหม่คืนพื้นที่ชั่วคราวอัตโนมัติหลังยืนยันบันทึกสำเร็จ
          </p>
          <p>
            สำเนาที่รอตรวจเพื่อคืนพื้นที่: {driveStorage.retained?.length || 0} ไฟล์ ·{' '}
            {(retainedBytes / (1024 * 1024)).toLocaleString('th-TH', { maximumFractionDigits: 2 })}{' '}
            MB
          </p>
          {!!driveStorage.retained?.length && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowCleanup(true)}
              className="rounded-lg bg-emerald-800 px-3 py-2 font-bold text-white"
            >
              ตรวจไฟล์ใน Drive และคืนพื้นที่ระบบ
            </button>
          )}
        </div>
      )}
      {showCleanup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="drive-cleanup-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4 shadow-2xl"
          >
            <h4 id="drive-cleanup-title" className="font-bold text-blue-950">
              คืนพื้นที่สำเนาชั่วคราว
            </h4>
            <p className="text-sm text-slate-600">
              ตรวจไฟล์ใน Drive เทียบต้นฉบับก่อนลบสำเนาชั่วคราว {driveStorage?.retained?.length || 0}{' '}
              ไฟล์ ไฟล์ใน Drive ทุกเวอร์ชัน บัญชี ประวัติ และหลักฐานอนุมัติจะยังอยู่ครบ
              หากตรวจไฟล์ไม่ผ่านจะเก็บสำเนานั้นไว้
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                disabled={busy}
                onClick={() => setShowCleanup(false)}
                className="rounded-lg border px-4 py-2 text-sm text-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-bold text-white"
                onClick={async () => {
                  if (await cleanupDriveCopies()) {
                    setShowCleanup(false);
                    setNotice('ตรวจไฟล์ Drive และคืนพื้นที่สำเนาชั่วคราวสำเร็จ');
                  }
                }}
              >
                ยืนยันคืนพื้นที่
              </button>
            </div>
          </div>
        </div>
      )}
      {driveStorage?.enabled && (
        <div className="rounded-lg bg-blue-50 p-3 space-y-2 text-xs text-blue-950">
          <p>จัดเก็บตาม ปีการศึกษา / ภาคเรียน → ชั้นเรียน → วิชา ไฟล์ใหม่จะเข้าโฟลเดอร์อัตโนมัติ</p>
          {!!driveStorage.unorganized?.length && (
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-blue-900 px-3 py-2 text-white font-bold"
              onClick={async () => {
                if (await organizeDrive())
                  setNotice('จัดโฟลเดอร์ไฟล์เดิมเรียบร้อย ลิงก์ไฟล์เดิมยังใช้งานได้');
              }}
            >
              จัดโฟลเดอร์ไฟล์เดิม ({driveStorage.unorganized.length} ไฟล์)
            </button>
          )}
        </div>
      )}
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setNotice('');
          if (await mutate('drive-config', { url, folderId, confirmed }))
            setNotice('ตรวจสิทธิ์ ทดลองสร้างและอ่านไฟล์สำเร็จ เปิดเก็บไฟล์ใหม่บน Drive แล้ว');
        }}
      >
        <label className="block text-xs text-slate-700">
          URL ตัวรับไฟล์ของโรงเรียน (Apps Script /exec)
          <input
            required
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="block mt-1 p-2 border rounded-lg w-full"
            placeholder="https://script.google.com/macros/s/.../exec"
          />
        </label>
        <label className="block text-xs text-slate-700">
          รหัสโฟลเดอร์โรงเรียน
          <input
            required
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="block mt-1 p-2 border rounded-lg w-full font-mono"
          />
        </label>
        <label className="flex gap-2 items-start text-xs text-slate-600">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          ยืนยันใช้โฟลเดอร์นี้เป็นพื้นที่เก็บเอกสารของโรงเรียน โฟลเดอร์ต้องจำกัดสิทธิ์
          และเจ้าของบัญชีต้องอนุญาตตัวรับไฟล์แล้ว
        </label>
        <button
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-blue-900 text-white text-xs font-bold"
        >
          ตรวจการเชื่อมต่อและเปิดใช้ Drive
        </button>
      </form>
      {notice && (
        <p role="status" className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-lg">
          {notice}
        </p>
      )}
      {!!driveStorage?.remaining?.length && (
        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-bold">
            ไฟล์ที่ส่งไว้ก่อนเชื่อม Drive: {driveStorage.remaining.length} ไฟล์
          </p>
          <p className="text-xs text-slate-500">
            คัดลอกเข้า Drive ทีละไฟล์ พร้อมตรวจแฮช โดยเก็บต้นฉบับเดิมไว้
          </p>
          {driveStorage.remaining.map((f) => (
            <div
              key={f.id}
              className="flex gap-3 justify-between items-center text-xs border rounded-lg p-2"
            >
              <span className="break-all">{f.name}</span>
              <button
                disabled={busy}
                className="shrink-0 text-blue-900 underline"
                onClick={() => void mutate('drive-migrate', { id: f.id })}
              >
                คัดลอกเข้า Drive
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">
        Excel/PDF ที่ส่งและไฟล์แนบผลตรวจจะเก็บใน Drive ส่วนบัญชี รายวิชา
        และประวัติยังอยู่ในฐานข้อมูล PP5 ไฟล์ใหม่ผ่านพื้นที่ชั่วคราวก่อนตรวจสอบและส่งเข้า Drive
        แล้วจึงคืนพื้นที่ชั่วคราว
      </p>
    </section>
  );
}
