'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ShieldAlert,
  AlertTriangle,
  FileQuestion,
  HelpCircle,
  TrendingUp,
  FileText,
  CheckCircle2,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export interface AttentionItem {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  count: number;
  description: string;
  category: 'MISSING_HS' | 'PRICE_ANOMALY' | 'LARTAS' | 'MISSING_DOC' | 'READY_CEISA' | 'REUSED_SKU';
  filterKey: string;
  filterValue: string;
}

interface CustomsAttentionPanelProps {
  items: AttentionItem[];
  onActionClick: (filterKey: string, filterValue: string) => void;
  loading?: boolean;
}

export function CustomsAttentionPanel({ items, onActionClick, loading = false }: CustomsAttentionPanelProps) {
  const criticalItems = items.filter(i => i.severity === 'CRITICAL' && i.count > 0);
  const warningItems = items.filter(i => i.severity === 'WARNING' && i.count > 0);
  const infoItems = items.filter(i => i.severity === 'INFO' && i.count > 0);

  if (items.length === 0 || (criticalItems.length === 0 && warningItems.length === 0 && infoItems.length === 0)) {
    return (
      <Card className="p-6 bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-200/60 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Attention Queue: All Clear</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              No outstanding customs classification errors, price anomalies, or missing documents require immediate action.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">PPJK Attention Queue</h2>
            <p className="text-xs text-slate-500">
              Prioritized actionable exceptions requiring licensed specialist review
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {criticalItems.length + warningItems.length} Issues Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
        {/* 1. CRITICAL ITEMS */}
        {criticalItems.map(item => (
          <div
            key={item.id}
            className="p-4 rounded-xl border border-red-200 bg-red-50/40 hover:bg-red-50/70 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-red-600 text-white">
                  CRITICAL
                </span>
                <span className="text-xs font-bold text-red-700">{item.count} Items</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <HelpCircle size={14} className="text-red-600 shrink-0" />
                {item.title}
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                {item.description}
              </p>
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => onActionClick(item.filterKey, item.filterValue)}
              className="w-full text-xs font-bold bg-white text-red-700 border-red-300 hover:bg-red-600 hover:text-white transition-colors"
            >
              Resolve in Directory <ArrowRight size={13} className="ml-1" />
            </Button>
          </div>
        ))}

        {/* 2. WARNING ITEMS */}
        {warningItems.map(item => (
          <div
            key={item.id}
            className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 hover:bg-amber-50/60 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-amber-500 text-white">
                  WARNING
                </span>
                <span className="text-xs font-bold text-amber-700">{item.count} Items</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                {item.category === 'PRICE_ANOMALY' ? (
                  <TrendingUp size={14} className="text-amber-600 shrink-0" />
                ) : (
                  <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                )}
                {item.title}
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                {item.description}
              </p>
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => onActionClick(item.filterKey, item.filterValue)}
              className="w-full text-xs font-bold bg-white text-amber-800 border-amber-300 hover:bg-amber-500 hover:text-white transition-colors"
            >
              Review Exception <ArrowRight size={13} className="ml-1" />
            </Button>
          </div>
        ))}

        {/* 3. INFO ITEMS */}
        {infoItems.map(item => (
          <div
            key={item.id}
            className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/60 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-emerald-600 text-white">
                  READY
                </span>
                <span className="text-xs font-bold text-emerald-700">{item.count} Decs</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                {item.title}
              </h3>
              <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                {item.description}
              </p>
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => onActionClick(item.filterKey, item.filterValue)}
              className="w-full text-xs font-bold bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-600 hover:text-white transition-colors"
            >
              Prepare CEISA <ExternalLink size={13} className="ml-1" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
