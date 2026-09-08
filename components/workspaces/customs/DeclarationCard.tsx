'use client';

import React from 'react';
import Link from 'next/link';
import { DeclarationDirectoryItem } from './DeclarationDirectoryTable';
import { DeclarationStatusBadge } from './DeclarationStatusBadge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileQuestion,
  TrendingUp,
  CheckCircle2,
  ExternalLink,
  Layers
} from 'lucide-react';

interface DeclarationCardProps {
  declaration: DeclarationDirectoryItem;
  onOpenWorkbench: (id: string) => void;
}

export function DeclarationCard({ declaration, onOpenWorkbench }: DeclarationCardProps) {
  const readiness =
    declaration.readiness_percentage !== undefined
      ? declaration.readiness_percentage
      : declaration.status === 'RELEASED'
      ? 100
      : declaration.status === 'READY_FOR_SUBMISSION'
      ? 100
      : 75;

  const getAction = () => {
    switch (declaration.primary_issue) {
      case 'MISSING_HS':
        return { label: 'Classify Items', icon: FileQuestion, color: 'bg-indigo-600 text-white hover:bg-indigo-700' };
      case 'MISSING_DOC':
        return { label: 'Attach Docs', icon: FileText, color: 'bg-orange-600 text-white hover:bg-orange-700' };
      case 'PRICE_ANOMALY':
        return { label: 'Review Price', icon: TrendingUp, color: 'bg-amber-600 text-white hover:bg-amber-700' };
      case 'LARTAS':
        return { label: 'Verify Lartas', icon: AlertTriangle, color: 'bg-rose-600 text-white hover:bg-rose-700' };
      case 'READY':
        return { label: 'Prepare CEISA', icon: CheckCircle2, color: 'bg-emerald-600 text-white hover:bg-emerald-700' };
      default:
        return { label: 'Open Workbench', icon: ExternalLink, color: 'bg-indigo-600 text-white hover:bg-indigo-700' };
    }
  };

  const action = getAction();
  const ActionIcon = action.icon;

  return (
    <Card
      onClick={() => onOpenWorkbench(declaration.id)}
      className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-400/60 transition-all space-y-3 cursor-pointer"
    >
      {/* Header: AJU & Type */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-mono font-bold text-indigo-700 block truncate">
            {declaration.declaration_number}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
              {declaration.declaration_type || 'PIB'}
            </span>
            <span className="text-[10px] text-slate-400">
              KPPBC {declaration.customs_office_code || '040300'}
            </span>
          </div>
        </div>

        <DeclarationStatusBadge channel={declaration.channel} type="channel" />
      </div>

      {/* Importer */}
      <div>
        <p className="text-xs font-semibold text-slate-800 line-clamp-1">
          {declaration.importer_name || declaration.importer_id}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
          <span className="flex items-center gap-1">
            <Layers size={11} />
            {declaration.total_items_count !== undefined ? declaration.total_items_count : 1} items
          </span>
          <span>•</span>
          <span className="font-mono">CIF ${(declaration.total_cif_usd || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Duty & Tax Summary */}
      <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
        <span className="text-[11px] text-slate-500 font-medium">Total Pungutan:</span>
        <span className="text-xs font-bold text-slate-900 font-mono">
          Rp {(declaration.total_duty_and_tax || declaration.total_tax_idr || 0).toLocaleString('id-ID')}
        </span>
      </div>

      {/* Footer: Readiness & CTA */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <DeclarationStatusBadge status={declaration.status} type="status" />
          <DeclarationStatusBadge readiness={readiness} type="readiness" />
        </div>

        <Link href={`/sbu/clearance/declarations/${declaration.id}`}>
          <Button size="sm" className={`text-xs font-bold ${action.color} shadow-xs`}>
            <ActionIcon size={12} className="mr-1" />
            {action.label}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
