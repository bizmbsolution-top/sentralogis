'use client';

import React from 'react';
import { CustomsDeclarationStatus, CustomsChannelType } from '@/lib/domain/customs/types';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

interface DeclarationStatusBadgeProps {
  status?: CustomsDeclarationStatus;
  channel?: CustomsChannelType | null;
  readiness?: 'READY' | 'READY_WITH_WARNINGS' | 'BLOCKED' | number;
  type?: 'status' | 'channel' | 'readiness';
  className?: string;
}

export function DeclarationStatusBadge({
  status,
  channel,
  readiness,
  type = 'status',
  className = ''
}: DeclarationStatusBadgeProps) {
  // 1. Channel Badge
  if (type === 'channel' || channel) {
    switch (channel) {
      case 'GREEN':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Jalur Hijau
          </span>
        );
      case 'YELLOW':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Jalur Kuning
          </span>
        );
      case 'RED':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Jalur Merah
          </span>
        );
      case 'MITA_NON_PRIORITY':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
            <ShieldCheck size={12} /> MITA
          </span>
        );
      case 'AEO_PRIORITY':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 ${className}`}>
            <ShieldCheck size={12} /> AEO Prioritas
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
            <Clock size={12} /> Pending Channel
          </span>
        );
    }
  }

  // 2. Readiness Badge
  if (type === 'readiness' && readiness !== undefined) {
    if (typeof readiness === 'number') {
      const isComplete = readiness === 100;
      const isLow = readiness < 50;
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            isComplete
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isLow
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          } ${className}`}
        >
          {isComplete ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
          {readiness}% Ready
        </span>
      );
    }

    switch (readiness) {
      case 'READY':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
            <CheckCircle2 size={12} /> CEISA Ready
          </span>
        );
      case 'READY_WITH_WARNINGS':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
            <AlertTriangle size={12} /> Review Warnings
          </span>
        );
      case 'BLOCKED':
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 ${className}`}>
            <XCircle size={12} /> Blocked
          </span>
        );
    }
  }

  // 3. Declaration Lifecycle Status
  switch (status) {
    case 'DRAFT':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
          <FileText size={12} /> DRAFT
        </span>
      );
    case 'DOCUMENTS_PENDING':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
          <Clock size={12} /> DOKUMEN PENDING
        </span>
      );
    case 'READY_FOR_CLASSIFICATION':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}>
          <HelpCircle size={12} /> PERLU KLASIFIKASI
        </span>
      );
    case 'CLASSIFIED':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 ${className}`}>
          <CheckCircle2 size={12} /> TERKLASIFIKASI
        </span>
      );
    case 'READY_FOR_SUBMISSION':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
          <CheckCircle2 size={12} /> SIAP AJU CEISA
        </span>
      );
    case 'SUBMITTED':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
          <Clock size={12} className="animate-spin" /> TERKIRIM
        </span>
      );
    case 'CHANNEL_ASSIGNED':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 ${className}`}>
          <ShieldAlert size={12} /> KANAL DITETAPKAN
        </span>
      );
    case 'INSPECTION_REQUIRED':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
          <ShieldAlert size={12} /> PEMERIKSAAN FISIK
        </span>
      );
    case 'RELEASED':
    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 ${className}`}>
          <CheckCircle2 size={12} /> SPPB TERBIT
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-200 ${className}`}>
          <XCircle size={12} /> REJECTED
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
          {status || 'UNKNOWN'}
        </span>
      );
  }
}
