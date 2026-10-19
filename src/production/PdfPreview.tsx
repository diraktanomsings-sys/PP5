import { useEffect, useRef, useState } from 'react';
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
  type RenderTask,
} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;
export default function PdfPreview({ url }: { url: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setDoc(undefined);
    setError('');
    setLoading(true);
    setPage(1);
    const task = getDocument({
      url,
      withCredentials: true,
      enableXfa: false,
      maxImageSize: 16_000_000,
    });
    task.promise
      .then((pdf) => {
        if (active) setDoc(pdf);
      })
      .catch(() => {
        if (active) {
          setError('เปิด PDF ไม่สำเร็จ กรุณาดาวน์โหลดเพื่อตรวจในโปรแกรมอ่าน PDF');
          setLoading(false);
        }
      });
    return () => {
      active = false;
      void task.destroy();
    };
  }, [url]);
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
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      {loading && <p role="status">กำลังอ่านไฟล์ PDF…</p>}
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
