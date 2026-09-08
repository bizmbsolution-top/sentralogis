'use client';

import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  PlayCircle, 
  Layers, 
  FileCheck,
  Truck
} from 'lucide-react';
import type { ControlTowerStatus, WorkspaceProgressMetrics } from '@/lib/control-tower/types';

interface ExecutionHealthBarProps {
  status: ControlTowerStatus;
  progress: WorkspaceProgressMetrics;
  className?: string;
}

const STATUS_CONFIG: Record<
  ControlTowerStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode; desc: string }
> = {
  COMMERCIAL: {
    label: 'Commercial Intent',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700',
    icon: <FileCheck className="w-4 h-4" />,
    desc: 'Sales Order is confirmed; awaiting fulfillment planning.',
  },
  PLANNING: {
    label: 'Fulfillment Planning',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: <Layers className="w-4 h-4" />,
    desc: 'Fulfillment plan is being drafted and capability allocations scoped.',
  },
  HANDOFF_PENDING: {
    label: 'Handoff Dispatched',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    icon: <Clock className="w-4 h-4" />,
    desc: 'Operational handoffs issued to SBUs; awaiting validation and acceptance.',
  },
  EXECUTING: {
    label: 'Operations In Transit',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    icon: <Truck className="w-4 h-4" />,
    desc: 'Sovereign SBU domain execution actively underway.',
  },
  PARTIALLY_FULFILLED: {
    label: 'Partially Fulfilled',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    icon: <PlayCircle className="w-4 h-4" />,
    desc: 'Partial delivery progress verified across operational allocations.',
  },
  AT_RISK: {
    label: 'At Risk (Exception Encountered)',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-800',
    icon: <AlertTriangle className="w-4 h-4" />,
    desc: 'Downstream operational exception detected; other allocations proceeding.',
  },
  BLOCKED: {
    label: 'Execution Blocked',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-800',
    icon: <XCircle className="w-4 h-4" />,
    desc: 'All operational handoffs failed or rejected; immediate replanning required.',
  },
  FULFILLED: {
    label: 'Execution Fulfilled',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: <CheckCircle2 className="w-4 h-4" />,
    desc: 'All allocated quantities successfully delivered by sovereign SBUs.',
  },
  CLOSED: {
    label: 'Order Closed',
    bg: 'bg-slate-100 dark:bg-slate-900',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-300 dark:border-slate-700',
    icon: <CheckCircle2 className="w-4 h-4" />,
    desc: 'Commercial commitment completed and formally archived.',
  },
};

const STAGES = [
  { id: 'COMMERCIAL', label: 'Commercial' },
  { id: 'PLANNING', label: 'Planning' },
  { id: 'HANDOFF_PENDING', label: 'Handoff' },
  { id: 'EXECUTING', label: 'Executing' },
  { id: 'FULFILLED', label: 'Delivered' },
];

export function ExecutionHealthBar({ status, progress, className = '' }: ExecutionHealthBarProps) {
  const currentConfig = STATUS_CONFIG[status] || STATUS_CONFIG.COMMERCIAL;

  // Determine active stage index for visual stepper
  const getStageIndex = (st: ControlTowerStatus) => {
    switch (st) {
      case 'COMMERCIAL':
        return 0;
      case 'PLANNING':
        return 1;
      case 'HANDOFF_PENDING':
        return 2;
      case 'EXECUTING':
      case 'PARTIALLY_FULFILLED':
      case 'AT_RISK':
      case 'BLOCKED':
        return 3;
      case 'FULFILLED':
      case 'CLOSED':
        return 4;
      default:
        return 0;
    }
  };

  const activeIndex = getStageIndex(status);

  return (
    <div className={`p-4 md:p-6 rounded-xl border bg-white dark:bg-slate-900 shadow-sm ${className}`}>
      {/* Header with Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Control Tower Execution Status
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${currentConfig.bg} ${currentConfig.text} ${currentConfig.border}`}
            >
              {currentConfig.icon}
              {currentConfig.label}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {currentConfig.desc}
          </p>
        </div>

        {/* Aggregate Progress Overview */}
        <div className="flex items-center gap-6 sm:text-right">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Delivery Progress</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {progress.completionPercentage}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Delivered / Planned</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {progress.totalDeliveredQuantity} / {progress.totalPlannedQuantity} units
            </div>
          </div>
        </div>
      </div>

      {/* Visual Lifecycle Stepper */}
      <div className="mt-6">
        <div className="grid grid-cols-5 gap-2 relative">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < activeIndex || (idx === 4 && activeIndex === 4);
            const isCurrent = idx === activeIndex && activeIndex !== 4;
            const isPending = idx > activeIndex;

            return (
              <div key={stage.id} className="flex flex-col items-center text-center group">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? status === 'BLOCKED'
                        ? 'bg-rose-500 text-white'
                        : status === 'AT_RISK'
                        ? 'bg-orange-500 text-white'
                        : 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/40'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent && status === 'BLOCKED' ? (
                    <XCircle className="w-4 h-4" />
                  ) : isCurrent && status === 'AT_RISK' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`text-[11px] md:text-xs mt-2 font-medium truncate w-full ${
                    isCurrent
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : isCompleted
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              status === 'BLOCKED'
                ? 'bg-rose-500'
                : status === 'AT_RISK'
                ? 'bg-orange-500'
                : 'bg-blue-600'
            }`}
            style={{ width: `${Math.max(5, progress.completionPercentage)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
