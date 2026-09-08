'use client';

import React, { useState, useMemo } from 'react';
import { CustomsClassificationLine } from '@/lib/domain/customs/types';
import { Search, AlertOctagon, AlertTriangle, ShieldAlert, CheckCircle2, HelpCircle } from 'lucide-react';

export type QueueFilterKey = 'ALL' | 'MISSING_HS' | 'LOW_CONFIDENCE' | 'LARTAS' | 'PRICE_ANOMALY' | 'APPROVED';

interface PrioritySkuQueueProps {
  lines: CustomsClassificationLine[];
  selectedLineId: string | null;
  onSelectLine: (lineId: string) => void;
}

export function PrioritySkuQueue({
  lines,
  selectedLineId,
  onSelectLine
}: PrioritySkuQueueProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<QueueFilterKey>('ALL');

  const filteredLines = useMemo(() => {
    return lines.filter(l => {
      // Filter condition
      if (filter === 'MISSING_HS' && (l.hs_code && l.hs_code.trim() !== '')) return false;
      if (filter === 'LOW_CONFIDENCE' && ((l.classification_confidence || 1.0) >= 0.85 || !l.hs_code)) return false;
      if (filter === 'LARTAS' && !l.lartas_flag) return false;
      if (filter === 'PRICE_ANOMALY' && !l.price_anomaly_flag) return false;
      if (filter === 'APPROVED' && (l.classification_source !== 'PPJK_APPROVED' && l.classification_source !== 'SKU_MEMORY')) return false;

      // Search condition
      if (search.trim()) {
        const q = search.toLowerCase();
        const sku = (l.sku_code || '').toLowerCase();
        const desc = (l.goods_description || '').toLowerCase();
        const hs = (l.hs_code || '').toLowerCase();
        return sku.includes(q) || desc.includes(q) || hs.includes(q);
      }
      return true;
    });
  }, [lines, filter, search]);

  const counts = useMemo(() => {
    return {
      ALL: lines.length,
      MISSING_HS: lines.filter(l => !l.hs_code || l.hs_code.trim() === '').length,
      LOW_CONFIDENCE: lines.filter(l => l.hs_code && (l.classification_confidence || 1.0) < 0.85).length,
      LARTAS: lines.filter(l => Boolean(l.lartas_flag)).length,
      PRICE_ANOMALY: lines.filter(l => Boolean(l.price_anomaly_flag)).length,
      APPROVED: lines.filter(l => l.classification_source === 'PPJK_APPROVED' || l.classification_source === 'SKU_MEMORY').length
    };
  }, [lines]);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Header & Search */}
      <div className="p-3 border-b border-slate-100 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Priority SKU Queue ({filteredLines.length})
          </span>
          {counts.MISSING_HS > 0 && (
            <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded-full border border-red-200 animate-pulse">
              {counts.MISSING_HS} Unclassified
            </span>
          )}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter SKU, description, HS..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
              filter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({counts.ALL})
          </button>
          <button
            onClick={() => setFilter('MISSING_HS')}
            className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
              filter === 'MISSING_HS' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Missing HS ({counts.MISSING_HS})
          </button>
          <button
            onClick={() => setFilter('LARTAS')}
            className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
              filter === 'LARTAS' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            Lartas ({counts.LARTAS})
          </button>
          <button
            onClick={() => setFilter('PRICE_ANOMALY')}
            className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
              filter === 'PRICE_ANOMALY' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
            }`}
          >
            Price ({counts.PRICE_ANOMALY})
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-2 py-1 rounded-md font-semibold whitespace-nowrap transition-colors ${
              filter === 'APPROVED' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Approved ({counts.APPROVED})
          </button>
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredLines.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <HelpCircle size={24} className="mx-auto mb-1 text-slate-300" />
            <p className="text-xs">No items match current filter</p>
          </div>
        ) : (
          filteredLines.map(line => {
            const isSelected = line.id === selectedLineId;
            const isMissing = !line.hs_code || line.hs_code.trim() === '';
            const isApproved = line.classification_source === 'PPJK_APPROVED' || line.classification_source === 'SKU_MEMORY';

            return (
              <button
                key={line.id}
                onClick={() => onSelectLine(line.id)}
                className={`w-full text-left p-2.5 transition-all flex flex-col gap-1 border-l-3 ${
                  isSelected
                    ? 'bg-indigo-50/70 border-l-indigo-600 shadow-xs'
                    : 'border-l-transparent hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-mono text-xs font-bold text-slate-900 truncate">
                    #{line.item_sequence} {line.sku_code || 'NO-SKU'}
                  </span>
                  {isMissing ? (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[9px] font-bold rounded">
                      NO HS
                    </span>
                  ) : isApproved ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded">
                      <CheckCircle2 size={10} />
                      APPROVED
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-bold rounded font-mono">
                      {line.hs_code}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 line-clamp-1">
                  {line.goods_description || 'No description'}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>
                    {line.item_quantity} {line.uom_code} · ${(line.unit_price_usd || 0).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1">
                    {line.lartas_flag && (
                      <span title="Lartas Permit Required" className="text-purple-600">
                        <ShieldAlert size={12} />
                      </span>
                    )}
                    {line.price_anomaly_flag && (
                      <span title="Price Anomaly Flag" className="text-orange-500">
                        <AlertTriangle size={12} />
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
