import { useEffect, useRef } from 'react';
import { LoaderCircle } from 'lucide-react';

export function LoadingOverlay({ message = 'กำลังโหลดข้อมูล…' }: { message?: string }) {
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    status.current?.focus({ preventScroll: true });
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        status.current?.focus();
      }
    };
    document.addEventListener('keydown', keepFocus);
    return () => {
      document.removeEventListener('keydown', keepFocus);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/45 backdrop-blur-xs p-4 cursor-wait">
      <div
        ref={status}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="w-full max-w-sm rounded-2xl border border-blue-100 bg-white p-7 text-center shadow-2xl font-sans outline-none"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#00236f]">
          <LoaderCircle
            aria-hidden="true"
            className="h-8 w-8 animate-spin motion-reduce:animate-none"
          />
        </div>
        <p className="text-base font-bold text-[#00236f]">{message}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          กรุณารอสักครู่ ระบบกำลังดำเนินการ
        </p>
      </div>
    </div>
  );
}
