'use client';

import { Card } from '@/components/ui/Card';
import { ShieldAlert, Construction } from 'lucide-react';

export default function ClearanceDashboardPage() {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customs Clearance</h1>
        <p className="text-slate-500 text-sm mt-1">PPJK & Customs Operations Dashboard</p>
      </div>

      <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <ShieldAlert size={36} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
            Clearance Module in Development
          </h2>
          <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
            The operational dashboard for SBU Clearance is currently under construction. 
            This module will handle PIB/PEB drafting, Red/Green channel tracking, and SPPB issuance.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <span className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-xl flex items-center gap-2">
              <Construction size={14} /> Coming Soon
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
