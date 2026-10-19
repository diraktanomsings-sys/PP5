import React from 'react';
import { SubmissionStatus } from '../../types/schema';

interface StatusBadgeProps {
  status: SubmissionStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'DRAFT':
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          border: 'border-slate-200',
          dot: 'bg-slate-400',
          label: 'ร่างเอกสาร (Draft)',
        };
      case 'PENDING_REVIEW':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          dot: 'bg-blue-600',
          label: 'รอตรวจสอบ (Pending Review)',
        };
      case 'REJECTED_REVISION':
        return {
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          dot: 'bg-rose-500',
          label: 'ส่งกลับแก้ไข (Needs Revision)',
        };
      case 'PASSED_REVIEW':
        return {
          bg: 'bg-cyan-50',
          text: 'text-cyan-800',
          border: 'border-cyan-200',
          dot: 'bg-cyan-600',
          label: 'ผ่านการตรวจ (Passed Review)',
        };
      case 'PENDING_DIRECTOR':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-800',
          border: 'border-amber-200',
          dot: 'bg-amber-600',
          label: 'รอผู้อำนวยการอนุมัติ (Pending Approval)',
        };
      case 'FINAL_LOCKED':
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-800',
          border: 'border-emerald-200',
          dot: 'bg-emerald-600',
          label: 'อนุมัติแล้ว (Final Locked)',
        };
      default:
        return {
          bg: 'bg-slate-100',
          text: 'text-slate-600',
          border: 'border-slate-200',
          dot: 'bg-slate-400',
          label: status,
        };
    }
  };

  const config = getStatusConfig();
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-sm font-medium'
      : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} whitespace-nowrap shrink-0`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};
