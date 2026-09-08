import React from 'react';
import Link from 'next/link';
import { FileCheck, ArrowRight, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

interface CustomsSummaryProps {
  customsSummary?: {
    declaration_id?: string;
    nomor_pengajuan?: string;
    declaration_type?: string;
    customs_channel?: string;
    status?: string;
    total_tax_amount?: number;
    sppb_number?: string | null;
  } | null;
}

export const CustomsSummaryCard: React.FC<CustomsSummaryProps> = ({ customsSummary }) => {
  if (!customsSummary) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
          CUSTOMS CLEARANCE PROJECTION
        </div>
        <p className="text-xs text-slate-400 italic">No customs declaration linked to this shipment.</p>
      </div>
    );
  }

  const getChannelBadge = (channel?: string) => {
    switch (channel) {
      case 'RED':
        return 'bg-red-50 text-red-700 border-red-300';
      case 'YELLOW':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'GREEN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              PPJK / Customs Projection
            </span>
            <h4 className="text-sm font-bold text-slate-900 font-mono">
              {customsSummary.nomor_pengajuan || 'Draft Declaration'}
            </h4>
          </div>
        </div>

        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${getChannelBadge(customsSummary.customs_channel)}`}>
          Channel: {customsSummary.customs_channel || 'PENDING'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium">
        <div>Type: <span className="font-bold text-slate-800">{customsSummary.declaration_type || 'PIB'}</span></div>
        <div>Status: <span className="font-mono font-bold text-blue-700">{customsSummary.status || 'DRAFT'}</span></div>
        <div>Taxes: <span className="font-mono text-slate-800">Rp {(customsSummary.total_tax_amount || 0).toLocaleString('id-ID')}</span></div>
        <div>SPPB: <span className="font-mono text-emerald-700">{customsSummary.sppb_number || 'Pending Release'}</span></div>
      </div>

      <div className="pt-1">
        <Link
          href="/sbu/customs"
          className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-all shadow-xs"
        >
          <span>Open Full Customs Declaration</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
