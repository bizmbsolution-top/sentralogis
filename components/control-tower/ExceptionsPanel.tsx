'use client';

import React from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  XCircle, 
  HelpCircle, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import type { WorkspaceException } from '@/lib/control-tower/types';

interface ExceptionsPanelProps {
  exceptions: WorkspaceException[];
  className?: string;
}

export function ExceptionsPanel({ exceptions, className = '' }: ExceptionsPanelProps) {
  if (exceptions.length === 0) {
    return (
      <div className={`p-4 md:p-6 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm ${className}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              No Operational Exceptions
            </h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              All active operational handoffs and allocations are operating within standard tolerance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-100 dark:bg-rose-900/60',
          text: 'text-rose-800 dark:text-rose-200',
          border: 'border-rose-300 dark:border-rose-800',
          icon: <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
        };
      case 'BLOCKING':
        return {
          bg: 'bg-purple-100 dark:bg-purple-900/60',
          text: 'text-purple-800 dark:text-purple-200',
          border: 'border-purple-300 dark:border-purple-800',
          icon: <AlertCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
        };
      case 'WARNING':
      default:
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/60',
          text: 'text-amber-800 dark:text-amber-200',
          border: 'border-amber-300 dark:border-amber-800',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        };
    }
  };

  return (
    <div className={`p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Actionable Exceptions ({exceptions.length})
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          Commercial commitment remains UNCHANGED
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {exceptions.map((exc) => {
          const badge = getSeverityBadge(exc.severity);

          return (
            <div
              key={exc.exceptionId}
              className={`p-4 rounded-xl border ${badge.border} ${badge.bg} space-y-2.5`}
            >
              {/* Exception Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {badge.icon}
                  <span className={`text-xs font-bold uppercase tracking-wider ${badge.text}`}>
                    {exc.severity} · {exc.category}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Domain: {exc.affectedDomain}
                </span>
              </div>

              {/* Message */}
              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                {exc.message}
              </p>

              {/* Recommended Action */}
              <div className="p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Recommended Action:
                </span>{' '}
                {exc.recommendedAction}
              </div>

              {/* Metadata footer */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                {exc.failureCode && (
                  <span className="font-mono">Code: {exc.failureCode}</span>
                )}
                <span>Occurred: {new Date(exc.occurredAt).toLocaleTimeString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
