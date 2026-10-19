import { useEffect, useRef, useState } from 'react';
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask,
  type PDFDocumentLoadingTask,
} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
GlobalWorkerOptions.workerSrc = workerUrl;
export default function PdfPreview({
  url,
  readDocument,
}: {
  url: string;
  readDocument?: (url: string) => Promise<Uint8Array>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setDoc(undefined);
    setError('');
    setLoading(true);
    setPage(1);
    let task: PDFDocumentLoadingTask | undefined;
    const open = async () => {
      const bytes = readDocument ? await readDocument(url) : undefined;
      if (!active) return;
      task = getDocument({
        ...(bytes ? { data: bytes } : { url, withCredentials: true }),
        enableXfa: false,
        maxImageSize: 16_000_000,
      });
      return task.promise;
    };
    void open()
      .then((pdf) => {
        if (active && pdf) setDoc(pdf);
      })
      .catch(() => {
        if (active) {
          setError('เปิด PDF ไม่สำเร็จ กรุณาดาวน์โหลดเพื่อตรวจในโปรแกรมอ่าน PDF');
          setLoading(false);
        }
      });
    return () => {
      active = false;
      void task?.destroy();
    };
  }, [url, readDocument, attempt]);
  useEffect(() => {
    if (!doc) return;
    let active = true;
    let render: RenderTask | undefined;
    setLoading(true);
    doc
      .getPage(page)
      .then(async (pdfPage) => {
        if (!active || !canvas.current) return;
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        const target = canvas.current;
        target.width = viewport.width;
        target.height = viewport.height;
        render = pdfPage.render({
          canvas: target,
          canvasContext: target.getContext('2d')!,
          viewport,
        });
        await render.promise;
        if (active) setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError('แสดงหน้า PDF ไม่สำเร็จ กรุณาดาวน์โหลดไฟล์ต้นฉบับ');
          setLoading(false);
        }
      });
    return () => {
      active = false;
      render?.cancel();
    };
  }, [doc, page]);
  return (
    <div className="pdf-reader">
      {error && (
        <div
          role="alert"
          className="text-sm text-red-800 p-3 rounded-xl bg-red-50 border border-red-200"
        >
          <p>{error}</p>
          <button
            onClick={() => setAttempt((n) => n + 1)}
            className="mt-2 px-3 py-2 bg-white border rounded-lg font-semibold"
          >
            ลองเปิด PDF อีกครั้ง
          </button>
        </div>
      )}
      {loading && <LoadingOverlay inline message="กำลังอ่านไฟล์ PDF…" />}
      <div className="actions">
        <button disabled={!doc || page === 1 || loading} onClick={() => setPage((p) => p - 1)}>
          หน้าก่อน
        </button>
        <span>
          หน้า {page} / {doc?.numPages || '…'}
        </span>
        <button
          disabled={!doc || page === doc.numPages || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          หน้าถัดไป
        </button>
      </div>
      <canvas aria-label={`เอกสาร PDF หน้า ${page}`} ref={canvas} />
    </div>
  );
}
