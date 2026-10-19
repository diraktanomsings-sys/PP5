import React from 'react';
import { SubmissionStatus } from '../../types/schema';
import { Check, Clock, AlertTriangle, FileCheck, ShieldCheck, Lock } from 'lucide-react';

interface WorkflowStepperProps {
  status: SubmissionStatus;
  currentVersion?: number;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ status, currentVersion = 1 }) => {
  // 6 Steps:
  // 1. ครูส่ง (Upload Excel + PDF)
  // 2. ผู้ตรวจรับงาน (In Review Queue)
  // 3. ตรวจ/แก้ไข (Defects check)
  // 4. ผ่านการตรวจ (Passed Review)
  // 5. รออนุมัติ (Pending Director)
  // 6. ผู้บริหารอนุมัติ (Final Locked)

  const steps = [
    { id: 1, title: 'ครูส่งเอกสาร', desc: `ไฟล์คู่ V${String(currentVersion).padStart(3, '0')}`, icon: FileCheck },
    { id: 2, title: 'ผู้ตรวจรับงาน', desc: 'คิวตรวจสอบ', icon: Clock },
    { id: 3, title: 'ตรวจประเมิน 4 ด้าน', desc: 'เกณฑ์คะแนน/เวลาเรียน', icon: AlertTriangle },
    { id: 4, title: 'ผ่านการตรวจ', desc: 'รับรองความถูกต้อง', icon: Check },
    { id: 5, title: 'รออนุมัติ', desc: 'คิวลงนาม ผอ.', icon: ShieldCheck },
    { id: 6, title: 'อนุมัติล็อกเล่ม', desc: 'Digital Hash & Seal', icon: Lock },
  ];

  const getActiveStepIndex = () => {
    switch (status) {
      case 'DRAFT':
        return 0; // At step 1
      case 'PENDING_REVIEW':
        return 1; // At step 2
      case 'REJECTED_REVISION':
        return 2; // Stuck at step 3 (Rejected/Needs Revision)
      case 'PASSED_REVIEW':
        return 3; // Step 4 complete
      case 'PENDING_DIRECTOR':
        return 4; // At step 5
      case 'FINAL_LOCKED':
        return 6; // All 6 steps complete!
      default:
        return 1;
    }
  };

  const activeIndex = getActiveStepIndex();
  const isRejected = status === 'REJECTED_REVISION';

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <span>วงจรการส่งเอกสาร 6 ขั้นตอน (The 6-Step Workflow)</span>
          <span className="text-xs font-normal text-slate-500">
            สถานะปัจจุบัน: {status === 'FINAL_LOCKED' ? 'เสร็จสิ้นสมบูรณ์ 100%' : `ขั้นตอนที่ ${Math.min(activeIndex + 1, 6)}/6`}
          </span>
        </h4>
        {isRejected && (
          <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 flex items-center gap-1.5 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            ส่งกลับแก้ไขในขั้นตอนที่ 3
          </span>
        )}
      </div>

      <div className="relative">
        {/* Progress Bar Line */}
        <div className="hidden md:block absolute top-1/2 left-6 right-6 h-0.5 -translate-y-1/2 bg-slate-100 z-0" />
        <div
          className="hidden md:block absolute top-1/2 left-6 h-0.5 -translate-y-1/2 bg-blue-600 transition-all duration-500 z-0"
          style={{
            width:
              activeIndex === 6
                ? 'calc(100% - 3rem)'
                : `calc(${((activeIndex) / 5) * 100}% - 1rem)`,
          }}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 relative z-10">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = activeIndex > idx || activeIndex === 6;
            const isCurrent = activeIndex === idx && activeIndex !== 6;
            const isCurrentRejected = isCurrent && isRejected;

            return (
              <div
                key={step.id}
                className={`flex flex-col items-center text-center p-2 rounded-lg transition-all ${
                  isCurrent
                    ? isCurrentRejected
                      ? 'bg-rose-50/70 border border-rose-200'
                      : 'bg-blue-50/70 border border-blue-200'
                    : 'bg-white'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isCurrentRejected
                      ? 'bg-rose-600 text-white ring-4 ring-rose-100 animate-bounce'
                      : isCurrent
                      ? 'bg-blue-700 text-white ring-4 ring-blue-100'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : <Icon className="w-4 h-4" />}
                </div>

                <div className="mt-2 text-center">
                  <div
                    className={`text-xs font-semibold ${
                      isCurrentRejected
                        ? 'text-rose-700'
                        : isCurrent
                        ? 'text-blue-900 font-bold'
                        : isCompleted
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{step.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
