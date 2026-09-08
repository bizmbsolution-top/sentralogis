'use client';

import React from 'react';
import Link from 'next/link';
import { CustomsDeclaration } from '@/lib/domain/customs/types';
import { DeclarationStatusBadge } from './DeclarationStatusBadge';
import { Button } from '@/components/ui/Button';
import GradientButton from '@/components/ui/GradientButton';
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  Copy,
  Check,
  RefreshCw,
  FileCheck2,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

interface WorkbenchHeaderProps {
  declaration: CustomsDeclaration;
  importerName?: string;
  loading?: boolean;
  validating?: boolean;
  onRefresh: () => void;
  onValidate: () => void;
  onNavigateTab: (tab: string) => void;
}

export function WorkbenchHeader({
  declaration,
  importerName,
  loading = false,
  validating = false,
  onRefresh,
  onValidate,
  onNavigateTab
}: WorkbenchHeaderProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyAju = () => {
    if (declaration?.declaration_number) {
      navigator.clipboard.writeText(declaration.declaration_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getContextualAction = () => {
    switch (declaration.status) {
      case 'DRAFT':
      case 'READY_FOR_CLASSIFICATION':
        return {
          label: 'Continue Classification',
          icon: ArrowRight,
          onClick: () => onNavigateTab('items'),
          variant: 'primary' as const
        };
      case 'CLASSIFIED':
      case 'DOCUMENTS_PENDING':
        return {
          label: validating ? 'Validating...' : 'Validate Compliance',
          icon: FileCheck2,
          onClick: onValidate,
          variant: 'primary' as const
        };
      case 'READY_FOR_SUBMISSION':
        return {
          label: 'Prepare CEISA 4.0',
          icon: ExternalLink,
          onClick: () => onNavigateTab('ceisa'),
          variant: 'success' as const
        };
      case 'RELEASED':
      case 'COMPLETED':
        return {
          label: 'View SPPB Release',
          icon: ShieldCheck,
          onClick: () => onNavigateTab('overview'),
          variant: 'secondary' as const
        };
      default:
        return {
          label: 'Validate Declaration',
          icon: FileCheck2,
          onClick: onValidate,
          variant: 'primary' as const
        };
    }
  };

  const action = getContextualAction();
  const ActionIcon = action.icon;

  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(declaration.created_at || Date.now()));

  return (
    <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl shadow-xl border border-indigo-900/40 text-white space-y-4">
      {/* Top Navigation & Identifiers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Link
              href="/sbu/clearance/declarations"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Back to Declaration Directory"
            >
              <ArrowLeft size={16} />
            </Link>

            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
              {declaration.declaration_type || 'PIB_IMPORT'}
            </span>

            <span className="text-xs text-slate-400 font-mono">
              KPPBC {declaration.customs_office_code || '040300'}
            </span>
          </div>

          {/* AJU Number Header */}
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black font-mono tracking-tight text-white">
              {declaration.declaration_number}
            </h1>
            <button
              onClick={handleCopyAju}
              className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-indigo-300 transition-colors"
              title="Copy AJU Number"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
          </div>

          {/* Importer and Metadata Subtitle */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-slate-200 font-semibold">
              <Building2 size={13} className="text-indigo-400" />
              {importerName || `Importir ID: ${declaration.importer_id}`}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar size={13} className="text-slate-500" />
              Created {formattedDate}
            </span>
            {declaration.sppb_number && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
                  <ShieldCheck size={13} />
                  SPPB: {declaration.sppb_number}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls & Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 mr-2">
            <DeclarationStatusBadge channel={declaration.channel} type="channel" />
            <DeclarationStatusBadge status={declaration.status} type="status" />
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold backdrop-blur-md"
          >
            <RefreshCw size={13} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {action.variant === 'primary' ? (
            <GradientButton
              onClick={action.onClick}
              disabled={validating}
              className="text-xs font-bold shadow-lg shadow-indigo-500/20"
            >
              <ActionIcon size={14} className="mr-1" />
              {action.label}
            </GradientButton>
          ) : (
            <Button
              size="sm"
              variant={action.variant}
              onClick={action.onClick}
              className="text-xs font-bold shadow-sm"
            >
              <ActionIcon size={14} className="mr-1" />
              {action.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
