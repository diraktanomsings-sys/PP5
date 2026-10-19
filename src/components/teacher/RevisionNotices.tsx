import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { teacherRevisionNotices } from '../../lib/revision-notices';

export function RevisionNotices({
  notices,
  onOpen,
}: {
  notices: ReturnType<typeof teacherRevisionNotices>;
  onOpen: (id: string) => void;
}) {
  return (
    <>
      {notices.map((notice) => (
        <div
          key={notice.id}
          className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex flex-wrap items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-rose-900">{notice.title}</p>
              <p className="text-[11px] text-rose-700 mt-0.5 whitespace-pre-line break-words">
                {notice.reviewerName
                  ? `ผู้ตรวจ (${notice.reviewerName}) แจ้งว่า: `
                  : 'ผลการตรวจที่บันทึกไว้: '}
                {notice.notes ||
                  'ไม่มีข้อความเหตุผลเพิ่มเติม กรุณาเปิดดูรายละเอียดผลตรวจและไฟล์แนบ'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpen(notice.id)}
            aria-label={`ดูผลตรวจและส่งฉบับแก้ไข: ${notice.title}`}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            ดูผลตรวจและส่งฉบับแก้ไข
          </button>
        </div>
      ))}
    </>
  );
}
