'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';
import { CustomsValidationStatus } from '@/lib/domain/customs/types';

interface ItemValidationBadgeProps {
  status?: CustomsValidationStatus | string;
  hasError?: boolean;
  hasWarning?: boolean;
  isDirty?: boolean;
  lartas?: boolean;
  priceAnomaly?: boolean;
  className?: string;
}

export function ItemValidationBadge({
  status,
  hasError = false,
  hasWarning = false,
  isDirty = false,
  lartas = false,
  priceAnomaly = false,
  className = ''
}: ItemValidationBadgeProps) {
  if (hasError || status === 'ERROR' || status === 'BLOCKED') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 ${className}`}
        title="Critical Validation Error"
      >
        <AlertOctagon size={11} className="text-red-600" />
        ERROR
      </span>
    );
  }

  if (hasWarning || status === 'WARNING' || lartas || priceAnomaly) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 ${className}`}
        title={lartas ? 'Lartas Restriction' : priceAnomaly ? 'Price Anomaly' : 'Validation Warning'}
      >
        <AlertTriangle size={11} className="text-amber-600" />
        WARN
      </span>
    );
  }

  if (isDirty) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200 ${className}`}
        title="Unsaved Local Changes"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
        DRAFT
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}
      title="Valid Line"
    >
      <CheckCircle2 size={11} className="text-emerald-600" />
      VALID
    </span>
  );
}
