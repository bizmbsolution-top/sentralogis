'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CustomsClassificationLine } from '@/lib/domain/customs/types';
import { ItemValidationBadge } from './ItemValidationBadge';
import { HsLookupPopover } from './HsLookupPopover';
import { SkuIntelligenceSuggestion, SkuSuggestionData } from './SkuIntelligenceSuggestion';
import {
  Sparkles,
  Search,
  MoreHorizontal,
  Trash2,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';

export interface EditableRowCell {
  rowId: string;
  field: string;
}

interface PpjkItemGridRowProps {
  line: CustomsClassificationLine;
  index: number;
  isSelected: boolean;
  isDirty: boolean;
  activeCell: EditableRowCell | null;
  onSelectRow: (id: string, multi: boolean, shift: boolean) => void;
  onCellClick: (rowId: string, field: string) => void;
  onCellChange: (rowId: string, field: string, value: any) => void;
  onCellCommit: (rowId: string, field: string, moveNext?: boolean) => void;
  onOpenDetail: (line: CustomsClassificationLine) => void;
  onDeleteLine: (id: string) => void;
  importerId?: string;
}

export function PpjkItemGridRow({
  line,
  index,
  isSelected,
  isDirty,
  activeCell,
  onSelectRow,
  onCellClick,
  onCellChange,
  onCellCommit,
  onOpenDetail,
  onDeleteLine,
  importerId
}: PpjkItemGridRowProps) {
  const [showHsLookup, setShowHsLookup] = useState(false);
  const [skuSuggestion, setSkuSuggestion] = useState<SkuSuggestionData | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  const isEditingSku = activeCell?.rowId === line.id && activeCell?.field === 'sku_code';
  const isEditingDesc = activeCell?.rowId === line.id && activeCell?.field === 'goods_description';
  const isEditingHs = activeCell?.rowId === line.id && activeCell?.field === 'hs_code';
  const isEditingQty = activeCell?.rowId === line.id && activeCell?.field === 'item_quantity';
  const isEditingUom = activeCell?.rowId === line.id && activeCell?.field === 'uom_code';
  const isEditingPrice = activeCell?.rowId === line.id && activeCell?.field === 'unit_price_usd';
  const isEditingOrigin = activeCell?.rowId === line.id && activeCell?.field === 'country_of_origin';
  const isEditingInvoice = activeCell?.rowId === line.id && activeCell?.field === 'invoice_number';
  const isEditingBrand = activeCell?.rowId === line.id && activeCell?.field === 'brand';
  const isEditingModel = activeCell?.rowId === line.id && activeCell?.field === 'model';
  const isEditingMfg = activeCell?.rowId === line.id && activeCell?.field === 'manufacturer_name';
  const isEditingSupplier = activeCell?.rowId === line.id && activeCell?.field === 'supplier_name';

  // Trigger SKU Intelligence Lookup when SKU changes and has no HS code
  useEffect(() => {
    if (!line.sku_code || line.hs_code || suggestionDismissed) {
      setSkuSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const queryParams = new URLSearchParams({
          sku_code: line.sku_code || ''
        });
        if (importerId) queryParams.set('importer_id', importerId);

        const res = await fetch(`/api/v1/customs/sku-intelligence?${queryParams.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            const topMatch = json.data[0];
            setSkuSuggestion({
              skuCode: line.sku_code || '',
              suggestedHsCode: topMatch.hs_code,
              hsDescription: topMatch.goods_description,
              confidence: topMatch.confidence || 95,
              matchType: topMatch.match_type || 'EXACT_SKU',
              historicalDeclarationsCount: topMatch.historical_count || 5,
              averagePriceUsd: topMatch.unit_price_usd,
              countryOfOrigin: topMatch.country_of_origin,
              lartasFlag: topMatch.lartas_flag
            });
          }
        }
      } catch (err) {
        console.warn('SKU Intelligence fetch error:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [line.sku_code, line.hs_code, importerId, suggestionDismissed]);

  const handleApplySkuSuggestion = (s: SkuSuggestionData) => {
    onCellChange(line.id, 'hs_code', s.suggestedHsCode);
    if (s.countryOfOrigin && !line.country_of_origin) {
      onCellChange(line.id, 'country_of_origin', s.countryOfOrigin);
    }
    setSkuSuggestion(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCellCommit(line.id, field, true);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onCellCommit(line.id, field, false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowHsLookup(false);
      setSkuSuggestion(null);
    }
  };

  const totalCif = (line.item_quantity || 1) * (line.unit_price_usd || line.cif_value_usd || 0);

  return (
    <tr
      className={`h-12 text-xs border-b border-slate-100 transition-colors group ${
        isSelected
          ? 'bg-indigo-50/70 text-slate-900'
          : isDirty
          ? 'bg-amber-50/30 hover:bg-amber-50/50 text-slate-800'
          : 'hover:bg-slate-50/80 text-slate-700'
      }`}
    >
      {/* 1. Selection Checkbox */}
      <td className="w-10 px-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={e => onSelectRow(line.id, e.target.checked, false)}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
        />
      </td>

      {/* 2. Sequence # */}
      <td className="w-12 px-2 text-center font-mono text-slate-400 text-[11px] font-bold">
        {line.item_sequence !== undefined ? line.item_sequence : index + 1}
      </td>

      {/* 3. Status Badge */}
      <td className="w-24 px-2 text-center">
        <ItemValidationBadge
          status={line.validation_status}
          hasError={!line.hs_code || !line.goods_description}
          hasWarning={Boolean(line.lartas_flag || line.price_anomaly_flag)}
          isDirty={isDirty}
          lartas={line.lartas_flag}
          priceAnomaly={line.price_anomaly_flag}
        />
      </td>

      {/* 4. SKU Code (Editable + Sku Intelligence trigger) */}
      <td
        className="w-36 px-2.5 relative font-mono font-bold"
        onClick={() => onCellClick(line.id, 'sku_code')}
      >
        {isEditingSku ? (
          <input
            autoFocus
            type="text"
            value={line.sku_code || ''}
            onChange={e => onCellChange(line.id, 'sku_code', e.target.value)}
            onBlur={() => onCellCommit(line.id, 'sku_code')}
            onKeyDown={e => handleKeyDown(e, 'sku_code')}
            className="w-full px-1.5 py-1 bg-white border border-indigo-500 rounded text-xs font-mono font-bold text-slate-900 focus:outline-none ring-2 ring-indigo-200"
          />
        ) : (
          <div className="flex items-center justify-between group-hover:text-indigo-600 cursor-text">
            <span className="truncate">{line.sku_code || '—'}</span>
            {line.classification_source === 'SKU_MEMORY' && (
              <span title="Matched from SKU Intelligence Memory" className="inline-flex">
                <Sparkles size={12} className="text-indigo-500 shrink-0 ml-1" />
              </span>
            )}
          </div>
        )}

        {skuSuggestion && (
          <SkuIntelligenceSuggestion
            suggestion={skuSuggestion}
            onApply={handleApplySkuSuggestion}
            onDismiss={() => {
              setSkuSuggestion(null);
              setSuggestionDismissed(true);
            }}
          />
        )}
      </td>

      {/* 5. Goods Description (Editable) */}
      <td
        className="w-56 px-2.5"
        onClick={() => onCellClick(line.id, 'goods_description')}
      >
        {isEditingDesc ? (
          <input
            autoFocus
            type="text"
            value={line.goods_description || ''}
            onChange={e => onCellChange(line.id, 'goods_description', e.target.value)}
            onBlur={() => onCellCommit(line.id, 'goods_description')}
            onKeyDown={e => handleKeyDown(e, 'goods_description')}
            className="w-full px-1.5 py-1 bg-white border border-indigo-500 rounded text-xs text-slate-900 focus:outline-none ring-2 ring-indigo-200"
          />
        ) : (
          <span className="truncate block max-w-[220px] font-medium text-slate-800" title={line.goods_description}>
            {line.goods_description || <span className="text-red-400 italic">Missing description</span>}
          </span>
        )}
      </td>

      {/* 6. Brand (Editable) */}
      <td className="w-28 px-2" onClick={() => onCellClick(line.id, 'brand')}>
        {isEditingBrand ? (
          <input
            autoFocus
            type="text"
            value={line.brand || ''}
            onChange={e => onCellChange(line.id, 'brand', e.target.value)}
            onBlur={() => onCellCommit(line.id, 'brand')}
            onKeyDown={e => handleKeyDown(e, 'brand')}
            className="w-full px-1.5 py-1 bg-white border border-indigo-500 rounded text-xs text-slate-900 focus:outline-none"
          />
        ) : (
          <span className="truncate block text-slate-600">{line.brand || '—'}</span>
        )}
      </td>

      {/* 7. Model (Editable) */}
      <td className="w-28 px-2" onClick={() => onCellClick(line.id, 'model')}>
        {isEditingModel ? (
          <input
            autoFocus
            type="text"
            value={line.model || ''}
            onChange={e => onCellChange(line.id, 'model', e.target.value)}
            onBlur={() => onCellCommit(line.id, 'model')}
            onKeyDown={e => handleKeyDown(e, 'model')}
            className="w-full px-1.5 py-1 bg-white border border-indigo-500 rounded text-xs text-slate-900 focus:outline-none"
          />
        ) : (
          <span className="truncate block text-slate-600">{line.model || '—'}</span>
        )}
      </td>

      {/* 8. HS Code (Editable with BTKI Lookup) */}
      <td
        className="w-36 px-2.5 relative font-mono"
        onClick={() => onCellClick(line.id, 'hs_code')}
      >
        {isEditingHs ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="text"
              value={line.hs_code || ''}
              onChange={e => onCellChange(line.id, 'hs_code', e.target.value)}
              onBlur={() => onCellCommit(line.id, 'hs_code')}
              onKeyDown={e => handleKeyDown(e, 'hs_code')}
              placeholder="8-digit HS"
              className="w-full px-1.5 py-1 bg-white border border-indigo-500 rounded text-xs font-mono font-bold text-indigo-900 focus:outline-none ring-2 ring-indigo-200"
            />
            <button
              onClick={() => setShowHsLookup(true)}
              className="p-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
              title="BTKI HS Lookup"
            >
              <Search size={13} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span
              className={`font-mono font-bold ${
                line.hs_code ? 'text-indigo-700' : 'text-red-500 italic'
              }`}
            >
              {line.hs_code || 'MISSING HS'}
            </span>
            <button
              onClick={e => {
                e.stopPropagation();
                setShowHsLookup(true);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-opacity"
              title="Cari pos tarif BTKI"
            >
              <Search size={12} />
            </button>
          </div>
        )}

        {showHsLookup && (
          <HsLookupPopover
            initialQuery={line.hs_code || line.goods_description || ''}
            onSelect={(hsCode, hsMaster) => {
              onCellChange(line.id, 'hs_code', hsCode);
              if (hsMaster) {
                onCellChange(line.id, 'bm_rate_percent', hsMaster.bm_rate);
                onCellChange(line.id, 'ppn_rate_percent', hsMaster.ppn_rate);
                onCellChange(line.id, 'pph_rate_percent', hsMaster.pph_rate);
                onCellChange(line.id, 'lartas_flag', hsMaster.lartas_flag);
              }
              setShowHsLookup(false);
            }}
            onClose={() => setShowHsLookup(false)}
          />
        )}
      </td>

      {/* 9. Qty (Editable) */}
      <td
        className="w-20 px-2 text-right font-mono font-bold"
        onClick={() => onCellClick(line.id, 'item_quantity')}
      >
        {isEditingQty ? (
          <input
            autoFocus
            type="number"
            value={line.item_quantity || ''}
            onChange={e => onCellChange(line.id, 'item_quantity', parseFloat(e.target.value) || 0)}
            onBlur={() => onCellCommit(line.id, 'item_quantity')}
            onKeyDown={e => handleKeyDown(e, 'item_quantity')}
            className="w-full px-1.5 py-1 bg-white border border-indigo-500 rounded text-xs text-right font-mono text-slate-900 focus:outline-none"
          />
        ) : (
          <span>{line.item_quantity || 1}</span>
        )}
      </td>

      {/* 10. UOM (Editable) */}
      <td
        className="w-16 px-2 font-mono text-slate-600 uppercase"
        onClick={() => onCellClick(line.id, 'uom_code')}
      >
        {isEditingUom ? (
          <input
            autoFocus
            type="text"
            value={line.uom_code || ''}
            onChange={e => onCellChange(line.id, 'uom_code', e.target.value.toUpperCase())}
            onBlur={() => onCellCommit(line.id, 'uom_code')}
            onKeyDown={e => handleKeyDown(e, 'uom_code')}
            className="w-full px-1.5 py-1 bg-white border border-indigo-500 rounded text-xs font-mono uppercase text-slate-900 focus:outline-none"
          />
        ) : (
          <span>{line.uom_code || 'PCE'}</span>
        )}
      </td>

      {/* 11. Unit Price USD (Editable) */}
      <td
        className="w-28 px-2 text-right font-mono font-bold text-slate-900"
        onClick={() => onCellClick(line.id, 'unit_price_usd')}
      >
        {isEditingPrice ? (
          <input
            autoFocus
            type="number"
            value={line.unit_price_usd || ''}
            onChange={e => onCellChange(line.id, 'unit_price_usd', parseFloat(e.target.value) || 0)}
            onBlur={() => onCellCommit(line.id, 'unit_price_usd')}
            onKeyDown={e => handleKeyDown(e, 'unit_price_usd')}
            className="w-full px-1.5 py-1 bg-white border border-indigo-500 rounded text-xs text-right font-mono text-slate-900 focus:outline-none"
          />
        ) : (
          <span>${(line.unit_price_usd || 0).toLocaleString()}</span>
        )}
      </td>

      {/* 12. Total CIF USD (Calculated) */}
      <td className="w-28 px-2 text-right font-mono font-bold text-indigo-900 bg-indigo-50/20">
        ${totalCif.toLocaleString()}
      </td>

      {/* 13. Country of Origin (Editable) */}
      <td
        className="w-20 px-2 text-center font-mono font-bold text-slate-700"
        onClick={() => onCellClick(line.id, 'country_of_origin')}
      >
        {isEditingOrigin ? (
          <input
            autoFocus
            type="text"
            value={line.country_of_origin || ''}
            onChange={e => onCellChange(line.id, 'country_of_origin', e.target.value.toUpperCase())}
            onBlur={() => onCellCommit(line.id, 'country_of_origin')}
            onKeyDown={e => handleKeyDown(e, 'country_of_origin')}
            maxLength={2}
            className="w-full px-1.5 py-1 bg-white border border-indigo-500 rounded text-xs text-center font-mono uppercase text-slate-900 focus:outline-none"
          />
        ) : (
          <span>{line.country_of_origin || 'CN'}</span>
        )}
      </td>

      {/* 14. Invoice No (Editable) */}
      <td
        className="w-28 px-2 font-mono text-slate-600"
        onClick={() => onCellClick(line.id, 'invoice_number')}
      >
        {isEditingInvoice ? (
          <input
            autoFocus
            type="text"
            value={line.invoice_number || ''}
            onChange={e => onCellChange(line.id, 'invoice_number', e.target.value)}
            onBlur={() => onCellCommit(line.id, 'invoice_number')}
            onKeyDown={e => handleKeyDown(e, 'invoice_number')}
            className="w-full px-1.5 py-1 bg-white border border-indigo-500 rounded text-xs text-slate-900 focus:outline-none"
          />
        ) : (
          <span className="truncate block">{line.invoice_number || '—'}</span>
        )}
      </td>

      {/* 15. Flags (Lartas & Price Anomaly) */}
      <td className="w-20 px-2 text-center">
        <div className="flex items-center justify-center gap-1">
          {line.lartas_flag && (
            <span className="p-1 rounded bg-rose-100 text-rose-700" title="Lartas: Izin Impor Diperlukan">
              <ShieldAlert size={12} />
            </span>
          )}
          {line.price_anomaly_flag && (
            <span className="p-1 rounded bg-amber-100 text-amber-700" title="Price Anomaly: Variasi harga > 50%">
              <AlertTriangle size={12} />
            </span>
          )}
        </div>
      </td>

      {/* 16. Action Trigger (Detail Drawer & Delete) */}
      <td className="w-16 px-2 text-center">
        <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onOpenDetail(line)}
            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
            title="Inspect Item Detail Drawer"
          >
            <ExternalLink size={13} />
          </button>
          <button
            onClick={() => onDeleteLine(line.id)}
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete Line"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}
