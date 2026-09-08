'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import GradientButton from '@/components/ui/GradientButton';
import {
  ShieldCheck,
  Plus,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  Clock
} from 'lucide-react';

interface CustomsControlHeaderProps {
  tenantName?: string;
  totalDeclarations?: number;
  loading?: boolean;
  onRefresh?: () => void;
  onNewDeclaration?: () => void;
  onImportBatch?: () => void;
}

export function CustomsControlHeader({
  tenantName = 'Sentralogis Logistics',
  totalDeclarations = 0,
  loading = false,
  onRefresh,
  onNewDeclaration,
  onImportBatch
}: CustomsControlHeaderProps) {
  const currentDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl shadow-xl border border-indigo-900/40 text-white">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl shadow-inner text-indigo-400">
            <ShieldCheck size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">Customs Control Center</h1>
              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                PPJK v1.0
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              PPJK Operational Intelligence Cockpit • <span className="text-indigo-300 font-medium">{tenantName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
          <span className="flex items-center gap-1">
            <Clock size={13} className="text-slate-500" />
            {currentDate}
          </span>
          <span>•</span>
          <span className="text-slate-300 font-semibold">{totalDeclarations} Active Declarations</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          variant="secondary"
          onClick={onRefresh}
          disabled={loading}
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold backdrop-blur-md transition-all duration-200"
        >
          <RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        <Link href="/sbu/clearance/declarations">
          <Button
            variant="secondary"
            className="bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-200 border-indigo-500/40 text-xs font-semibold backdrop-blur-md"
          >
            <Layers size={14} className="mr-1.5 text-indigo-400" />
            Directory
          </Button>
        </Link>

        <Button
          variant="secondary"
          onClick={onImportBatch}
          className="bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 border-emerald-500/40 text-xs font-semibold backdrop-blur-md"
        >
          <FileSpreadsheet size={14} className="mr-1.5 text-emerald-400" />
          Import Batch
        </Button>

        <GradientButton
          onClick={onNewDeclaration}
          className="text-xs font-bold shadow-lg shadow-indigo-500/20"
        >
          <Plus size={15} className="mr-1" />
          New Declaration
        </GradientButton>
      </div>
    </div>
  );
}
