'use client';

import React from 'react';
import { CustomsDeclaration, CustomsAggregate } from '@/lib/domain/customs/types';
import { DeclarationStatusBadge } from './DeclarationStatusBadge';
import { Card } from '@/components/ui/Card';
import {
  FileText,
  Boxes,
  Coins,
  ShieldAlert,
  Building2,
  Receipt,
  Layers,
  Scale
} from 'lucide-react';

interface DeclarationSummaryCardProps {
  aggregate: CustomsAggregate;
  importerName?: string;
  readinessPercentage?: number;
}

export function DeclarationSummaryCard({
  aggregate,
  importerName,
  readinessPercentage = 80
}: DeclarationSummaryCardProps) {
  const { declaration, summary } = aggregate;

  const totalTax =
    declaration.total_duty_and_tax ||
    summary?.total_tax_payable_idr ||
    (summary?.total_bm_idr || 0) + (summary?.total_ppn_idr || 0) + (summary?.total_pph_idr || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. IDENTITY BLOCK */}
      <Card className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-700">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
            <FileText size={15} />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Identity & Port</h3>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Nomor Pengajuan (AJU)</span>
            <span className="font-mono font-bold text-slate-900 line-clamp-1">
              {declaration.declaration_number}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Importir / Entitas</span>
            <span className="font-semibold text-slate-800 line-clamp-1">
              {importerName || declaration.importer_id}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-50">
            <div>
              <span className="text-[10px] text-slate-400 block">Tipe Dokumen</span>
              <span className="font-bold text-slate-700">{declaration.declaration_type || 'PIB_IMPORT'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">KPPBC Pengawas</span>
              <span className="font-bold text-slate-700">KPPBC {declaration.customs_office_code || '040300'}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. CARGO & ITEMS BLOCK */}
      <Card className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-700">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Boxes size={15} />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Cargo & Valuation</h3>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Total Item Lines:</span>
            <span className="font-black text-slate-900 text-base font-mono">
              {summary?.total_lines !== undefined ? summary.total_lines : aggregate.classification_lines?.length || 0}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Total Nilai CIF:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">
              ${(summary?.total_cif_usd || 0).toLocaleString()} USD
            </span>
          </div>

          <div className="p-2 bg-slate-50 rounded-xl space-y-1 text-[11px] border border-slate-100">
            <div className="flex justify-between text-slate-600">
              <span>Kurs Pajak (KMK):</span>
              <span className="font-mono font-semibold">Rp 16.000 / USD</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Nilai Pabean (IDR):</span>
              <span className="font-mono font-bold text-slate-800">
                Rp {((summary?.total_cif_usd || 0) * 16000).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 3. FINANCIAL & TAX BLOCK */}
      <Card className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-700">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Coins size={15} />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Pungutan Pabean</h3>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Bea Masuk (BM):</span>
            <span className="font-mono font-semibold">
              Rp {(summary?.total_bm_idr || 0).toLocaleString('id-ID')}
            </span>
          </div>

          <div className="flex justify-between text-slate-600">
            <span>PPN Impor (11%):</span>
            <span className="font-mono font-semibold">
              Rp {(summary?.total_ppn_idr || 0).toLocaleString('id-ID')}
            </span>
          </div>

          <div className="flex justify-between text-slate-600">
            <span>PPh Pasal 22:</span>
            <span className="font-mono font-semibold">
              Rp {(summary?.total_pph_idr || 0).toLocaleString('id-ID')}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
            <span className="text-xs font-bold text-slate-900">Total Tagihan:</span>
            <span className="text-sm font-black text-emerald-700 font-mono">
              Rp {totalTax.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </Card>

      {/* 4. STATUS & READINESS BLOCK */}
      <Card className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-700">
          <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
            <ShieldAlert size={15} />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Status & Kanal</h3>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Status Pengajuan:</span>
            <DeclarationStatusBadge status={declaration.status} type="status" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Kanal Pabean:</span>
            <DeclarationStatusBadge channel={declaration.channel} type="channel" />
          </div>

          <div className="pt-1.5 border-t border-slate-100">
            <div className="flex justify-between items-center mb-1 text-[11px]">
              <span className="font-medium text-slate-500">Kesiapan CEISA:</span>
              <span className="font-bold text-slate-800">{readinessPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  readinessPercentage === 100
                    ? 'bg-emerald-500'
                    : readinessPercentage >= 75
                    ? 'bg-indigo-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${readinessPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
