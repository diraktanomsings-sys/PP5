import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import defaultSchoolLogo from '../../assets/schoolLogo';

interface AdminSchoolLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSchoolLogoModal: React.FC<AdminSchoolLogoModalProps> = ({ isOpen, onClose }) => {
  const { schoolLogoUrl, hasCustomLogo, uploadSchoolLogo, removeSchoolLogo } = useApp();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Validate type
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setErrorMessage('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (.png, .jpg, .jpeg, .webp)');
      return;
    }

    // Validate size (max 150 KB)
    if (file.size > 150000) {
      setErrorMessage('ไฟล์มีขนาดใหญ่เกินไป (กรุณาใช้ไฟล์ขนาดไม่เกิน 150 KB)');
      return;
    }

    setSelectedFileName(file.name);
    setSelectedFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.onerror = () => {
      setErrorMessage('เกิดข้อผิดพลาดในการอ่านไฟล์รูปภาพ');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNewLogo = async () => {
    if (!previewUrl) return;
    setIsProcessing(true);
    const ok = await uploadSchoolLogo(previewUrl);
    setIsProcessing(false);
    if (ok) onClose();
  };

  const handleResetToDefault = async () => {
    setIsProcessing(true);
    const ok = await removeSchoolLogo();
    setIsProcessing(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#08122d] to-[#12285e] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/80 text-white flex items-center justify-center shadow-xs">
              <ImageIcon className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>จัดการตราสัญลักษณ์ประจำโรงเรียน</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-mono border border-blue-400/30">
                  Admin Only
                </span>
              </h3>
              <p className="text-xs text-blue-200/80">
                แอดมินสามารถเพิ่มภาพตราโรงเรียนใหม่ หรือลบเพื่อคืนค่ามาตรฐานได้ด้วยตนเอง
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-blue-200 hover:text-white hover:bg-blue-800/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Current Active Crest Display */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5">
            <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
              <img
                src={previewUrl || schoolLogoUrl}
                alt="ตราโรงเรียนบ้านคูเมือง"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="space-y-1.5 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {previewUrl ? 'ตัวอย่างภาพที่กำลังจะบันทึก' : 'ตราสัญลักษณ์ที่ใช้งานอยู่ในระบบ'}
                </span>
                {previewUrl ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                    พรีวิวก่อนบันทึก
                  </span>
                ) : hasCustomLogo ? (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
                    ตราที่แอดมินอัปโหลดเอง (Custom)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                    ตรามาตรฐานของระบบ (Default)
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                โรงเรียนบ้านคูเมือง · สพป.สิงห์บุรี (จะปรากฏในหน้าหลัก, สมุด ปพ.5, ใบล็อกเล่ม
                และลายน้ำเอกสารดิจิทัล)
              </p>

              {previewUrl && selectedFileName && (
                <div className="text-[11px] font-mono text-blue-900 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 inline-block">
                  ไฟล์ที่เลือก: {selectedFileName} ({selectedFileSize})
                </div>
              )}
            </div>
          </div>

          {/* File Upload Zone */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              อัปโหลดภาพตราโรงเรียนใหม่ (PNG, JPG, SVG)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className="border-2 border-dashed border-blue-300 hover:border-blue-600 rounded-2xl p-6 text-center bg-blue-50/40 hover:bg-blue-50/80 transition-colors cursor-pointer space-y-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                คลิกเพื่อเลือกไฟล์ภาพ หรือลากไฟล์มาวางที่นี่
              </div>
              <p className="text-[11px] text-slate-500">
                รองรับไฟล์ PNG (แนะนำแบบพื้นหลังโปร่งใส), JPG, SVG ขนาดไม่เกิน 150 KB
              </p>
            </div>
          </div>

          {/* Reset button when custom logo is active */}
          {hasCustomLogo && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-amber-950">ต้องการลบและคืนค่าเป็นตรามาตรฐาน?</span>
                <p className="text-[11px] text-amber-800">
                  ระบบจะลบตราสัญลักษณ์ที่คุณอัปโหลดไว้และนำภาพตราโรงเรียนมาตรฐานกลับมาใช้ทันที
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>คืนค่าเริ่มต้น</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/80 rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>

          <div className="flex items-center gap-2">
            {previewUrl && (
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null);
                  setSelectedFileName(null);
                  setSelectedFileSize(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิกภาพที่เลือก
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveNewLogo}
              disabled={!previewUrl || isProcessing}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                previewUrl && !isProcessing
                  ? 'bg-[#00236f] hover:bg-blue-900 text-white shadow-md'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isProcessing ? 'กำลังบันทึก...' : 'บันทึกตราสัญลักษณ์ใหม่'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
