'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Info,
  Layers,
  Calculator,
  Building,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsValuationSummary,
  LineValuationItem
} from '@/lib/domain/customs/types';

interface ValuationWorkspaceProps {
  declaration: CustomsDeclaration;
  lines: CustomsClassificationLine[];
  onNavigateTab?: (tabId: string, filter?: string) => void;
}

export function ValuationWorkspace({
  declaration,
  lines,
  onNavigateTab
}: ValuationWorkspaceProps) {
  const [valuation, setValuation] = useState<CustomsValuationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(16000);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'DEVIATIONS' | 'ARITHMETIC_ERRORS'>('ALL');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const fetchValuationData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/customs/declarations/${declaration.id}/valuation?rate=${exchangeRate}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setValuation(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load valuation data:', err);
    } finally {
      setLoading(false);
    }
  }, [declaration.id, exchangeRate]);

  useEffect(() => {
    fetchValuationData();
  }, [fetchValuationData]);

  // Format currency helpers
  const fmtUsd = (val?: number | null) =>
    val !== undefined && val !== null
      ? `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '-';

  const fmtIdr = (val?: number | null) =>
    val !== undefined && val !== null
      ? `Rp ${Math.round(val).toLocaleString('id-ID')}`
      : '-';

  // Filtered lines
  const displayLines = (valuation?.lines || []).filter(item => {
    const matchesSearch =
      (item.sku_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hs_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.goods_description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === 'DEVIATIONS') return item.has_price_deviation;
    if (filterMode === 'ARITHMETIC_ERRORS') return !item.is_arithmetic_valid;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. TOP VALUATION COCKPIT METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total CIF USD */}
        <Card className="p-4 bg-slate-50/70 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Customs CIF Value</span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
              USD Total
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{fmtUsd(valuation?.total_cif_usd)}</span>
            <span className="text-xs font-semibold text-slate-500">CIF Total</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-200/80 pt-1.5 font-medium">
            <span>FOB: {fmtUsd(valuation?.total_fob_usd)}</span>
            <span>Frt: {fmtUsd(valuation?.total_freight_usd)}</span>
            <span>Ins: {fmtUsd(valuation?.total_insurance_usd)}</span>
          </div>
        </Card>

        {/* Nilai Pabean IDR */}
        <Card className="p-4 bg-slate-50/70 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nilai Pabean (Tax Base)</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              KMK Kurs
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-black text-slate-900">{fmtIdr(valuation?.total_nilai_pabean_idr)}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/80 pt-1.5 flex items-center justify-between font-medium">
            <span>KMK Kurs: Rp {exchangeRate.toLocaleString('id-ID')}</span>
            <span className="text-[10px] text-emerald-600 font-bold">PMK 144/2022</span>
          </div>
        </Card>

        {/* Total Duty and Taxes */}
        <Card className="p-4 bg-slate-50/70 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Duty & Import Taxes</span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
              BM + PPN + PPh
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-black text-blue-900">{fmtIdr(valuation?.total_duty_and_tax_idr)}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/80 pt-1.5 flex items-center justify-between font-medium">
            <span>BM (0-10%) + PPN (11%) + PPh (2.5%)</span>
          </div>
        </Card>

        {/* Price Intelligence & Anomaly Status */}
        <Card className="p-4 bg-slate-50/70 border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Price Intelligence</span>
              {valuation?.price_deviations_count === 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={12} /> BENCHMARK OK
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  <AlertTriangle size={12} /> {valuation?.price_deviations_count} DEVIATIONS
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{valuation?.price_deviations_count || 0}</span>
              <span className="text-xs font-semibold text-slate-500">SKUs &gt; 50% variance</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateTab?.('validation', 'VAL-001')}
              className="w-full text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Inspect in Control Plane <ArrowRight size={12} className="ml-1" />
            </Button>
          </div>
        </Card>
      </div>

      {/* 2. RECONCILIATION BANNER & KURS SIMULATOR */}
      <Card className="p-4 border-slate-200 shadow-xs bg-linear-to-r from-slate-50 via-indigo-50/30 to-slate-50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Calculator size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Commercial Valuation Integrity & Reconciliation
                </h3>
                {valuation?.is_cif_reconciled && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    <CheckCircle2 size={11} /> Balanced (MTH-001 Pass)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evaluates item-level FOB + Freight + Insurance against declared header CIF under PMK No. 144/PMK.04/2022.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-1.5">
              <span className="text-xs font-bold text-slate-600 pl-1">KMK Rate:</span>
              <input
                type="number"
                value={exchangeRate}
                onChange={e => setExchangeRate(Number(e.target.value))}
                className="w-24 text-xs font-mono font-bold text-slate-900 border-0 focus:ring-0 p-0 text-right"
              />
              <span className="text-xs font-semibold text-slate-400 pr-1">IDR/USD</span>
            </div>
            <Button
              size="sm"
              onClick={fetchValuationData}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
            >
              <RefreshCw size={12} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Recalculate
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. ITEM-LEVEL VALUATION TABLE */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Item Valuation & Price Benchmark Table ({displayLines.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU, HS, description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500 w-52"
              />
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white text-xs">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  filterMode === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Lines
              </button>
              <button
                onClick={() => setFilterMode('DEVIATIONS')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  filterMode === 'DEVIATIONS' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Price Deviations ({valuation?.price_deviations_count || 0})
              </button>
              <button
                onClick={() => setFilterMode('ARITHMETIC_ERRORS')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  filterMode === 'ARITHMETIC_ERRORS' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Arithmetic Check
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Commodity / SKU</th>
                <th className="py-2.5 px-4">HS Code</th>
                <th className="py-2.5 px-4 text-right">Qty & UOM</th>
                <th className="py-2.5 px-4 text-right">Unit Price (USD)</th>
                <th className="py-2.5 px-4 text-right">Line CIF (USD)</th>
                <th className="py-2.5 px-4 text-center">Historical Bench</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {displayLines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    No commodity lines match the selected valuation filters.
                  </td>
                </tr>
              ) : (
                displayLines.map(line => {
                  const isExpanded = expandedRow === line.item_sequence;
                  return (
                    <React.Fragment key={line.item_sequence}>
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : line.item_sequence)}
                        className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                          line.has_price_deviation ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center font-bold text-slate-400">
                          {line.item_sequence}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 line-clamp-1">{line.goods_description}</div>
                          {line.sku_code && (
                            <span className="text-[10px] font-mono text-indigo-600 font-bold">
                              {line.sku_code}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                          {line.hs_code || <span className="text-rose-500 font-bold">MISSING</span>}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                          {line.item_quantity.toLocaleString()} {line.uom_code}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {fmtUsd(line.unit_price_usd)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                          {fmtUsd(line.cif_value_usd)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {line.historical_average_price ? (
                            <div className="flex flex-col items-center">
                              <span className="font-mono text-[11px] font-semibold text-slate-700">
                                {fmtUsd(line.historical_average_price)}
                              </span>
                              {line.price_variance_percent !== null && line.price_variance_percent !== undefined && (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${
                                    line.has_price_deviation
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {line.price_variance_percent > 0 ? '+' : ''}
                                  {line.price_variance_percent}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No Benchmark</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {line.has_price_deviation && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <AlertTriangle size={10} /> DEVIATION
                            </span>
                          )}
                          {!line.has_price_deviation && line.is_arithmetic_valid && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 size={10} /> VALID
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Breakdown Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={8} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">FOB Breakdown</span>
                                <p className="font-mono font-bold text-slate-800 mt-0.5">{fmtUsd(line.fob_value_usd)}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Freight Component</span>
                                <p className="font-mono font-bold text-slate-800 mt-0.5">{fmtUsd(line.freight_usd)}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Insurance Component</span>
                                <p className="font-mono font-bold text-slate-800 mt-0.5">{fmtUsd(line.insurance_usd)}</p>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Arithmetic Check</span>
                                <p className={`font-bold mt-0.5 ${line.is_arithmetic_valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {line.is_arithmetic_valid ? '✓ Qty × Price = FOB' : '✕ Arithmetic Mismatch'}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
