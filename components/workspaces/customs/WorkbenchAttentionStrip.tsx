'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ShieldAlert,
  AlertTriangle,
  FileQuestion,
  TrendingUp,
  FileText,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export interface WorkbenchIssueItem {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  count?: number;
  message: string;
  targetTab: string;
  targetFilter?: string;
}

interface WorkbenchAttentionStripProps {
  issues: WorkbenchIssueItem[];
  onNavigateTab: (tab: string, filter?: string) => void;
}

export function WorkbenchAttentionStrip({ issues, onNavigateTab }: WorkbenchAttentionStripProps) {
  if (issues.length === 0) {
    return null;
  }

  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
  const warningIssues = issues.filter(i => i.severity === 'WARNING');
  const infoIssues = issues.filter(i => i.severity === 'INFO');

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-rose-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Actionable Blocking Exceptions ({issues.length})
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">Click issue to inspect in workspace</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* CRITICAL ISSUES */}
        {criticalIssues.map(issue => (
          <Card
            key={issue.id}
            onClick={() => onNavigateTab(issue.targetTab, issue.targetFilter)}
            className="p-3.5 bg-red-50/50 border border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-600 text-white">
                  BLOCKING
                </span>
                {issue.count !== undefined && (
                  <span className="text-xs font-bold text-red-700 font-mono">
                    {issue.count} items
                  </span>
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 group-hover:text-red-700 transition-colors">
                <FileQuestion size={14} className="text-red-600 shrink-0" />
                {issue.title}
              </h4>
              <p className="text-[11px] text-slate-600 line-clamp-2">
                {issue.message}
              </p>
            </div>

            <div className="flex items-center justify-end text-[11px] font-bold text-red-700 group-hover:translate-x-0.5 transition-transform pt-1">
              <span>Resolve in {issue.targetTab.toUpperCase()}</span>
              <ArrowRight size={12} className="ml-1" />
            </div>
          </Card>
        ))}

        {/* WARNING ISSUES */}
        {warningIssues.map(issue => (
          <Card
            key={issue.id}
            onClick={() => onNavigateTab(issue.targetTab, issue.targetFilter)}
            className="p-3.5 bg-amber-50/40 border border-amber-200 rounded-xl hover:bg-amber-50 hover:border-amber-300 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500 text-white">
                  WARNING
                </span>
                {issue.count !== undefined && (
                  <span className="text-xs font-bold text-amber-800 font-mono">
                    {issue.count} items
                  </span>
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 group-hover:text-amber-800 transition-colors">
                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                {issue.title}
              </h4>
              <p className="text-[11px] text-slate-600 line-clamp-2">
                {issue.message}
              </p>
            </div>

            <div className="flex items-center justify-end text-[11px] font-bold text-amber-800 group-hover:translate-x-0.5 transition-transform pt-1">
              <span>Review in {issue.targetTab.toUpperCase()}</span>
              <ArrowRight size={12} className="ml-1" />
            </div>
          </Card>
        ))}

        {/* INFO ISSUES */}
        {infoIssues.map(issue => (
          <Card
            key={issue.id}
            onClick={() => onNavigateTab(issue.targetTab, issue.targetFilter)}
            className="p-3.5 bg-indigo-50/30 border border-indigo-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-600 text-white">
                  INTELLIGENCE
                </span>
                {issue.count !== undefined && (
                  <span className="text-xs font-bold text-indigo-700 font-mono">
                    {issue.count} matched
                  </span>
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 group-hover:text-indigo-700 transition-colors">
                <Sparkles size={14} className="text-indigo-600 shrink-0" />
                {issue.title}
              </h4>
              <p className="text-[11px] text-slate-600 line-clamp-2">
                {issue.message}
              </p>
            </div>

            <div className="flex items-center justify-end text-[11px] font-bold text-indigo-700 group-hover:translate-x-0.5 transition-transform pt-1">
              <span>Inspect {issue.targetTab.toUpperCase()}</span>
              <ArrowRight size={12} className="ml-1" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
