'use client';

import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import {
  FileText,
  AlertOctagon,
  AlertTriangle,
  FileQuestion,
  Layers,
  CheckCircle2,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react';

export interface CustomsKpiMetrics {
  totalActive: number;
  draftCount: number;
  classificationErrors: number;
  validationWarnings: number;
  missingDocumentsCount: number;
  waitingClassificationCount: number;
  readyForCeisaCount: number;
  releasedCount: number;
}

interface CustomsKpiGridProps {
  metrics: CustomsKpiMetrics;
  onKpiClick: (filterType: string, filterValue: string) => void;
  loading?: boolean;
}

export function CustomsKpiGrid({ metrics, onKpiClick, loading = false }: CustomsKpiGridProps) {
  const kpiItems = [
    {
      id: 'active',
      label: 'Active Declarations',
      count: metrics.totalActive,
      subtext: 'In pipeline',
      icon: Layers,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-200',
      filterType: 'status',
      filterValue: 'ALL'
    },
    {
      id: 'draft',
      label: 'Draft',
      count: metrics.draftCount,
      subtext: 'Preparation stage',
      icon: FileText,
      color: 'text-slate-700',
      bg: 'bg-slate-50 border-slate-200',
      filterType: 'status',
      filterValue: 'DRAFT'
    },
    {
      id: 'class_errors',
      label: 'Classification Errors',
      count: metrics.classificationErrors,
      subtext: 'Requires resolution',
      icon: AlertOctagon,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200',
      filterType: 'issue',
      filterValue: 'VALIDATION_ERROR',
      isCritical: metrics.classificationErrors > 0
    },
    {
      id: 'warnings',
      label: 'Validation Warnings',
      count: metrics.validationWarnings,
      subtext: 'Price & Lartas flags',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
      filterType: 'issue',
      filterValue: 'PRICE_ANOMALY',
      isWarning: metrics.validationWarnings > 0
    },
    {
      id: 'docs',
      label: 'Waiting Documents',
      count: metrics.missingDocumentsCount,
      subtext: 'Invoice / B/L pending',
      icon: FileQuestion,
      color: 'text-orange-600',
      bg: 'bg-orange-50 border-orange-200',
      filterType: 'issue',
      filterValue: 'MISSING_DOCUMENT'
    },
    {
      id: 'waiting_class',
      label: 'Waiting Classification',
      count: metrics.waitingClassificationCount,
      subtext: 'Unassigned HS codes',
      icon: FileQuestion,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200',
      filterType: 'issue',
      filterValue: 'MISSING_HS'
    },
    {
      id: 'ready',
      label: 'Ready for CEISA',
      count: metrics.readyForCeisaCount,
      subtext: 'Verified & cleared',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
      filterType: 'readiness',
      filterValue: 'READY'
    },
    {
      id: 'released',
      label: 'SPPB Released',
      count: metrics.releasedCount,
      subtext: 'Customs cleared',
      icon: ShieldCheck,
      color: 'text-teal-600',
      bg: 'bg-teal-50 border-teal-200',
      filterType: 'status',
      filterValue: 'RELEASED'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {kpiItems.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onKpiClick(item.filterType, item.filterValue)}
            disabled={loading}
            className="text-left group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-xl transition-transform active:scale-[0.98]"
          >
            <GlassCard
              className={`p-4 h-full border transition-all duration-200 hover:shadow-md hover:border-indigo-400/60 relative overflow-hidden ${
                item.isCritical ? 'bg-red-50/40 border-red-300' : item.isWarning ? 'bg-amber-50/30 border-amber-300' : 'bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold text-slate-500 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                  {item.label}
                </span>
                <div className={`p-1.5 rounded-lg border ${item.bg} ${item.color}`}>
                  <Icon size={16} />
                </div>
              </div>

              <div className="mt-2.5 flex items-baseline justify-between">
                <span className={`text-2xl font-black tracking-tight ${item.isCritical ? 'text-red-700' : 'text-slate-900'}`}>
                  {loading ? '—' : item.count}
                </span>
                <ArrowUpRight
                  size={14}
                  className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                />
              </div>

              <p className="text-[11px] text-slate-400 mt-1 font-medium truncate">
                {item.subtext}
              </p>
            </GlassCard>
          </button>
        );
      })}
    </div>
  );
}
