'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Layers,
  DollarSign,
  FileText,
  Globe2,
  Receipt,
  ShieldAlert,
  Truck,
  Building2,
  ArrowRight
} from 'lucide-react';

export interface ReadinessCategoryStatus {
  key: string;
  label: string;
  status: 'READY' | 'WARNING' | 'BLOCKED';
  issueCount?: number;
  tabTarget: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface ReadinessCommandBarProps {
  overallStatus: 'READY' | 'READY_WITH_WARNINGS' | 'BLOCKED';
  readinessPercentage: number;
  categories: ReadinessCategoryStatus[];
  onCategoryClick: (tabKey: string) => void;
}

export function ReadinessCommandBar({
  overallStatus,
  readinessPercentage,
  categories,
  onCategoryClick
}: ReadinessCommandBarProps) {
  const getOverallBadge = () => {
    switch (overallStatus) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 size={14} /> READY FOR CEISA 4.0
          </span>
        );
      case 'READY_WITH_WARNINGS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle size={14} /> READY WITH WARNINGS
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300 animate-pulse">
            <XCircle size={14} /> SUBMISSION BLOCKED
          </span>
        );
    }
  };

  return (
    <Card className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-4">
      {/* Header & Overall Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Customs Declaration Readiness
            </h2>
            {getOverallBadge()}
          </div>
          <p className="text-xs text-slate-500">
            Pre-submission compliance diagnostics across 8 mandatory customs pillars
          </p>
        </div>

        {/* Readiness Meter */}
        <div className="flex items-center gap-3 w-full md:w-64">
          <div className="flex-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
              <span>Overall Score</span>
              <span>{readinessPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  overallStatus === 'READY'
                    ? 'bg-emerald-500'
                    : overallStatus === 'READY_WITH_WARNINGS'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${readinessPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 8-Category Interactive Readiness Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {categories.map(cat => {
          const Icon = cat.icon;
          const isReady = cat.status === 'READY';
          const isWarning = cat.status === 'WARNING';
          const isBlocked = cat.status === 'BLOCKED';

          return (
            <button
              key={cat.key}
              onClick={() => onCategoryClick(cat.tabTarget)}
              className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between space-y-2 group focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isBlocked
                  ? 'bg-red-50/60 border-red-200 hover:bg-red-50'
                  : isWarning
                  ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-50'
                  : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Icon
                  size={14}
                  className={`${
                    isBlocked ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-slate-500'
                  }`}
                />
                {isReady ? (
                  <CheckCircle2 size={13} className="text-emerald-600" />
                ) : isWarning ? (
                  <AlertTriangle size={13} className="text-amber-600" />
                ) : (
                  <XCircle size={13} className="text-red-600" />
                )}
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                  {cat.label}
                </span>
                <span
                  className={`text-[10px] font-semibold block mt-0.5 ${
                    isBlocked
                      ? 'text-red-700'
                      : isWarning
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {isReady ? 'Passed' : cat.issueCount ? `${cat.issueCount} issue` : cat.status}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
