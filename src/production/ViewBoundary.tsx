import { Component, type ReactNode } from 'react';

export class ViewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <section role="alert" className="p-6 bg-white border rounded-2xl text-blue-950">
          <p>โหลดหน้านี้ไม่สำเร็จ กรุณารีเฟรชเพื่อเปิดรุ่นล่าสุด</p>
          <button
            className="mt-3 px-4 py-2 rounded-lg bg-blue-900 text-white"
            onClick={() => window.location.reload()}
          >
            รีเฟรชหน้าเว็บ
          </button>
        </section>
      );
    return this.props.children;
  }
}
