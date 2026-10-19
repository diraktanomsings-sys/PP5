import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, Stamp } from 'lucide-react';

interface SignatureCanvasProps {
  onConfirm: (signatureData: string) => void;
  signerName: string;
  signerPosition: string;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onConfirm,
  signerName,
  signerPosition,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [useDefaultSignature, setUseDefaultSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#00236f'; // Deep royal blue ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setUseDefaultSignature(false);

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo((x * canvas.width) / rect.width, (y * canvas.height) / rect.height);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo((x * canvas.width) / rect.width, (y * canvas.height) / rect.height);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setUseDefaultSignature(false);
  };

  const handleUsePresetSignature = () => {};

  const handleConfirmSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    onConfirm(dataUrl);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PenTool className="w-4 h-4 text-blue-700" />
          <h4 className="text-sm font-bold text-slate-800">ลงนามอนุมัติเอกสาร</h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearCanvas}
            className="text-xs text-slate-600 hover:text-slate-800 font-medium px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            ล้าง
          </button>
        </div>
      </div>

      <div className="relative bg-white border-2 border-dashed border-slate-300 rounded-lg overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          width={400}
          height={140}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-36 cursor-crosshair block"
        />

        {!hasDrawn && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs font-medium">
            ลากเมาส์หรือใช้นิ้วสัมผัสเพื่อเซ็นชื่อในกรอบนี้
          </div>
        )}

        {/* Official seal preview badge */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-rose-50/90 border border-rose-200 px-2 py-1 rounded text-[11px] text-rose-800 pointer-events-none">
          <Stamp className="w-3.5 h-3.5 text-rose-600" />
          <span>บันทึกลายมือชื่อพร้อมเวอร์ชันเอกสาร</span>
        </div>
      </div>

      <div className="mt-3 text-center border-t border-slate-200 pt-2 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">({signerName})</p>
        <p className="text-[11px] text-slate-500">{signerPosition}</p>
        <p className="text-[10px] text-slate-400 mt-1 font-mono">
          วันที่และเวลาประทับรับรอง: {new Date().toLocaleDateString('th-TH')}
        </p>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleConfirmSignature}
          disabled={!hasDrawn}
          className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs ${
            hasDrawn
              ? 'bg-blue-800 hover:bg-blue-900 text-white cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Check className="w-4 h-4" />
          ยืนยันการลงนาม e-Signature & ล็อกเล่ม ปพ.5
        </button>
      </div>
    </div>
  );
};
