'use client';

import React from 'react';
import Link from 'next/link';
import { CustomsDeclaration } from '@/lib/domain/customs/types';
import { DeclarationStatusBadge } from './DeclarationStatusBadge';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileQuestion,
  TrendingUp,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export interface DeclarationDirectoryItem extends CustomsDeclaration {
  importer_name?: string;
  total_items_count?: number;
  total_cif_usd?: number;
  total_tax_idr?: number;
  readiness_percentage?: number;
  primary_issue?: 'MISSING_HS' | 'MISSING_DOC' | 'PRICE_ANOMALY' | 'LARTAS' | 'VALIDATION_ERROR' | 'READY' | 'RELEASED';
}

interface DeclarationDirectoryTableProps {
  declarations: DeclarationDirectoryItem[];
  loading?: boolean;
  onOpenWorkbench: (declarationId: string) => void;
}

export function DeclarationDirectoryTable({
  declarations,
  loading = false,
  onOpenWorkbench
}: DeclarationDirectoryTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-slate-100/70 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (declarations.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <FileText size={24} />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No Customs Declarations Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          No declarations match your active search or filter criteria. Try clearing filters or creating a new declaration.
        </p>
      </div>
    );
  }

  const getNextActionConfig = (item: DeclarationDirectoryItem) => {
    switch (item.primary_issue) {
      case 'MISSING_HS':
        return {
          label: 'Classify Items',
          icon: FileQuestion,
          color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
        };
      case 'MISSING_DOC':
        return {
          label: 'Attach Docs',
          icon: FileText,
          color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200'
        };
      case 'PRICE_ANOMALY':
        return {
          label: 'Review Price',
          icon: TrendingUp,
          color: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200'
        };
      case 'LARTAS':
        return {
          label: 'Verify Lartas',
          icon: AlertTriangle,
          color: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
        };
      case 'READY':
        return {
          label: 'Prepare CEISA',
          icon: CheckCircle2,
          color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
        };
      case 'RELEASED':
        return {
          label: 'View SPPB',
          icon: ShieldCheck,
          color: 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
        };
      default:
        return {
          label: 'Open Workbench',
          icon: ExternalLink,
          color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Nomor Pengajuan (AJU)</th>
              <th className="py-3 px-4">Importir / Entitas</th>
              <th className="py-3 px-3 text-center">Items</th>
              <th className="py-3 px-3 text-center">Kanal</th>
              <th className="py-3 px-4 text-right">Nilai CIF & Pungutan</th>
              <th className="py-3 px-3 text-center">Kesiapan</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-4 text-right">Next Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {declarations.map(dec => {
              const action = getNextActionConfig(dec);
              const ActionIcon = action.icon;
              const readiness = dec.readiness_percentage !== undefined ? dec.readiness_percentage : (dec.status === 'RELEASED' ? 100 : dec.status === 'READY_FOR_SUBMISSION' ? 100 : 75);

              return (
                <tr
                  key={dec.id}
                  className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                  onClick={() => onOpenWorkbench(dec.id)}
                >
                  {/* 1. AJU Number & Type */}
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span className="text-indigo-600 hover:underline">
                        {dec.declaration_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-sans text-[10px] font-bold">
                        {dec.declaration_type || 'PIB_IMPORT'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        KPPBC {dec.customs_office_code || '040300'}
                      </span>
                    </div>
                  </td>

                  {/* 2. Importer */}
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-800 line-clamp-1">
                      {dec.importer_name || dec.importer_id}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
                      {dec.service_request_id ? `SR: ${dec.service_request_id.slice(0, 8)}...` : 'Standalone Declaration'}
                    </span>
                  </td>

                  {/* 3. Items Count */}
                  <td className="py-3.5 px-3 text-center font-bold text-slate-700">
                    {dec.total_items_count !== undefined ? dec.total_items_count : 1}
                  </td>

                  {/* 4. Channel */}
                  <td className="py-3.5 px-3 text-center">
                    <DeclarationStatusBadge channel={dec.channel} type="channel" />
                  </td>

                  {/* 5. CIF & Tax */}
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-bold text-slate-900 block font-mono">
                      Rp {(dec.total_duty_and_tax || dec.total_tax_idr || 0).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      CIF: ${(dec.total_cif_usd || 0).toLocaleString()}
                    </span>
                  </td>

                  {/* 6. Readiness */}
                  <td className="py-3.5 px-3 text-center">
                    <DeclarationStatusBadge readiness={readiness} type="readiness" />
                  </td>

                  {/* 7. Lifecycle Status */}
                  <td className="py-3.5 px-3">
                    <DeclarationStatusBadge status={dec.status} type="status" />
                  </td>

                  {/* 8. Next Action Button */}
                  <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                    <Link href={`/sbu/clearance/declarations/${dec.id}`}>
                      <Button
                        size="sm"
                        variant="secondary"
                        className={`text-xs font-bold border ${action.color} shadow-xs`}
                      >
                        <ActionIcon size={13} className="mr-1" />
                        {action.label}
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
