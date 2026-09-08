'use client';

import React from 'react';
import { CustomsAggregate, CustomsDeclarationDocument } from '@/lib/domain/customs/types';
import { DeclarationStatusBadge } from './DeclarationStatusBadge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Boxes,
  Coins,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Layers,
  FileQuestion,
  HelpCircle
} from 'lucide-react';

interface OverviewTabWorkspaceProps {
  aggregate: CustomsAggregate;
  importerName?: string;
  readinessPercentage?: number;
  documents?: CustomsDeclarationDocument[];
  onNavigateTab: (tab: string, filter?: string) => void;
}

export function OverviewTabWorkspace({
  aggregate,
  importerName,
  readinessPercentage = 80,
  documents = [],
  onNavigateTab
}: OverviewTabWorkspaceProps) {
  const { declaration, classification_lines = [], summary } = aggregate;

  const totalLines = summary?.total_lines !== undefined ? summary.total_lines : classification_lines.length;
  const classifiedLines = classification_lines.filter(l => Boolean(l.hs_code)).length;
  const verifiedDocs = documents.filter(d => d.verification_status === 'VERIFIED').length;
  const lartasLines = classification_lines.filter(l => Boolean(l.lartas_flag)).length;
  const priceAnomalies = classification_lines.filter(l => Boolean(l.price_anomaly_flag)).length;

  const totalDuty =
    declaration.total_duty_and_tax ||
    summary?.total_tax_payable_idr ||
    (summary?.total_bm_idr || 0) + (summary?.total_ppn_idr || 0) + (summary?.total_pph_idr || 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. TOP OPERATIONAL HEALTH SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Declaration Health */}
        <Card className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Declaration Health</h3>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <ShieldCheck size={16} />
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5">
                <Boxes size={13} className="text-slate-400" />
                Classification Progress:
              </span>
              <span className="font-bold font-mono">
                {classifiedLines} / {totalLines} items
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5">
                <FileText size={13} className="text-slate-400" />
                Documents Verified:
              </span>
              <span className="font-bold font-mono">
                {verifiedDocs} / {documents.length || 2} verified
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5">
                <ShieldAlert size={13} className="text-amber-500" />
                Lartas Restrictions:
              </span>
              <span className={`font-bold font-mono ${lartasLines > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                {lartasLines} flagged
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-orange-500" />
                Price Anomalies:
              </span>
              <span className={`font-bold font-mono ${priceAnomalies > 0 ? 'text-orange-700' : 'text-slate-700'}`}>
                {priceAnomalies} flagged
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigateTab('items')}
            className="w-full text-xs font-bold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
          >
            Open Item Grid <ArrowRight size={13} className="ml-1" />
          </Button>
        </Card>

        {/* Card 2: Valuation & Tax Summary */}
        <Card className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Valuation & Tax</h3>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Coins size={16} />
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-700">
              <span>Total CIF Value:</span>
              <span className="font-bold font-mono">${(summary?.total_cif_usd || 0).toLocaleString()} USD</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Bea Masuk (BM):</span>
              <span className="font-mono">Rp {(summary?.total_bm_idr || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>PPN Impor (11%):</span>
              <span className="font-mono">Rp {(summary?.total_ppn_idr || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>PPh Pasal 22:</span>
              <span className="font-mono">Rp {(summary?.total_pph_idr || 0).toLocaleString('id-ID')}</span>
            </div>
            <div className="pt-1.5 border-t border-slate-100 flex justify-between font-bold text-slate-900">
              <span>Total Pungutan:</span>
              <span className="font-mono text-emerald-700">Rp {totalDuty.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigateTab('valuation')}
            className="w-full text-xs font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          >
            Review Tax Breakdown <ArrowRight size={13} className="ml-1" />
          </Button>
        </Card>

        {/* Card 3: CEISA 4.0 Preparation Readiness */}
        <Card className="p-5 bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm space-y-3 border border-indigo-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={16} className="text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">CEISA 4.0 Engine</h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {readinessPercentage}% READY
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Data preparation for XML declaration schema CEISA 4.0. Automatic tax verification and Lartas diagnostics active.
          </p>

          <div className="p-3 bg-white/10 rounded-xl space-y-1 text-xs border border-white/10">
            <div className="flex justify-between text-slate-300 text-[11px]">
              <span>Human Review:</span>
              <span className="text-emerald-400 font-bold">Specialist In-the-loop</span>
            </div>
            <div className="flex justify-between text-slate-300 text-[11px]">
              <span>Automation:</span>
              <span className="text-indigo-300 font-mono">Zero Scraping / Bot</span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => onNavigateTab('ceisa')}
            className="w-full text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            Generate CEISA Preview <ExternalLink size={13} className="ml-1" />
          </Button>
        </Card>
      </div>

      {/* 2. RECENT ACTIVITY & AUDIT TRAIL PREVIEW */}
      <Card className="p-6 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Recent Operational Decisions & Audit</h3>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigateTab('audit')}
            className="text-xs text-slate-600"
          >
            View Full Audit Trail <ArrowRight size={13} className="ml-1" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl text-xs">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5">
              <CheckCircle2 size={14} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Declaration Created & Initialized</span>
                <span className="text-[11px] text-slate-400">
                  {new Date(declaration.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Nomor Pengajuan {declaration.declaration_number} registered under tenant {declaration.tenant_id}.
              </p>
            </div>
          </div>

          {classifiedLines > 0 && (
            <div className="flex items-start gap-3 p-3 bg-indigo-50/50 rounded-xl text-xs">
              <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 mt-0.5">
                <Sparkles size={14} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">SKU Intelligence Matched</span>
                  <span className="text-[11px] text-slate-400">Auto-Applied</span>
                </div>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Applied historical HS codes and BTKI tariff definitions from SKU memory catalog.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
