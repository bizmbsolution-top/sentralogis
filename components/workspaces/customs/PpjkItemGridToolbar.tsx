'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import GradientButton from '@/components/ui/GradientButton';
import {
  Search,
  Filter,
  Save,
  RotateCcw,
  Upload,
  Clipboard,
  Layers,
  Trash2,
  Globe2,
  FileText,
  Boxes,
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Plus
} from 'lucide-react';

export type ItemGridFilterKey =
  | 'ALL'
  | 'ERRORS'
  | 'WARNINGS'
  | 'MISSING_HS'
  | 'PRICE_ANOMALY'
  | 'LARTAS'
  | 'UNCLASSIFIED'
  | 'DIRTY';

interface PpjkItemGridToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFilter: ItemGridFilterKey;
  onFilterChange: (filter: ItemGridFilterKey) => void;
  filterCounts: Record<ItemGridFilterKey, number>;
  selectedCount: number;
  dirtyCount: number;
  saving?: boolean;
  onSaveDirty: () => void;
  onDiscardDirty: () => void;
  onOpenBulkImport: () => void;
  onAddNewRow: () => void;
  onBulkSetField: (field: string, value: string) => void;
  onBulkDelete: () => void;
}

export function PpjkItemGridToolbar({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  filterCounts,
  selectedCount,
  dirtyCount,
  saving = false,
  onSaveDirty,
  onDiscardDirty,
  onOpenBulkImport,
  onAddNewRow,
  onBulkSetField,
  onBulkDelete
}: PpjkItemGridToolbarProps) {
  const [showBulkMenu, setShowBulkMenu] = useState(false);

  const filters: Array<{ key: ItemGridFilterKey; label: string; icon?: React.ComponentType<{ size?: number; className?: string }>; color?: string }> = [
    { key: 'ALL', label: 'All Items' },
    { key: 'ERRORS', label: 'Errors', icon: AlertOctagon, color: 'text-red-600' },
    { key: 'WARNINGS', label: 'Warnings', icon: AlertTriangle, color: 'text-amber-600' },
    { key: 'MISSING_HS', label: 'Missing HS', icon: HelpCircle, color: 'text-rose-600' },
    { key: 'PRICE_ANOMALY', label: 'Price Anomaly', icon: AlertTriangle, color: 'text-orange-600' },
    { key: 'LARTAS', label: 'Lartas', icon: ShieldAlert, color: 'text-purple-600' },
    { key: 'DIRTY', label: 'Unsaved', icon: Sparkles, color: 'text-indigo-600' }
  ];

  return (
    <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
      {/* Top Row: Search, Actions, and Dirty Persistence Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Cari SKU, deskripsi, atau pos tarif..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {dirtyCount > 0 && (
            <div className="flex items-center gap-1.5 p-1 bg-amber-50 border border-amber-200 rounded-xl px-2.5">
              <span className="text-xs font-bold text-amber-800 font-mono">
                {dirtyCount} unsaved
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={onSaveDirty}
                disabled={saving}
                className="h-7 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 shadow-sm"
              >
                <Save size={12} className="mr-1" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDiscardDirty}
                className="h-7 text-xs text-slate-500 hover:text-slate-700 px-2"
              >
                <RotateCcw size={12} />
              </Button>
            </div>
          )}

          {selectedCount > 0 && (
            <div className="flex items-center gap-1.5 p-1 bg-indigo-50 border border-indigo-200 rounded-xl px-2.5">
              <span className="text-xs font-bold text-indigo-900 font-mono">
                {selectedCount} selected
              </span>

              <div className="relative">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowBulkMenu(!showBulkMenu)}
                  className="h-7 text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                >
                  <Layers size={12} className="mr-1" /> Bulk Actions
                </Button>

                {showBulkMenu && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 text-xs space-y-1">
                    <button
                      onClick={() => {
                        const val = prompt('Enter UOM Code (e.g. PCE, KGM, SET):');
                        if (val) onBulkSetField('uom_code', val.toUpperCase());
                        setShowBulkMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 font-semibold text-slate-700 flex items-center gap-2"
                    >
                      <Boxes size={13} /> Bulk Set UOM
                    </button>
                    <button
                      onClick={() => {
                        const val = prompt('Enter Country of Origin 2-digit code (e.g. CN, JP, US):');
                        if (val) onBulkSetField('country_of_origin', val.toUpperCase());
                        setShowBulkMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 font-semibold text-slate-700 flex items-center gap-2"
                    >
                      <Globe2 size={13} /> Bulk Set Origin
                    </button>
                    <button
                      onClick={() => {
                        const val = prompt('Enter Invoice Number:');
                        if (val) onBulkSetField('invoice_number', val);
                        setShowBulkMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 font-semibold text-slate-700 flex items-center gap-2"
                    >
                      <FileText size={13} /> Bulk Set Invoice
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${selectedCount} selected items?`)) onBulkDelete();
                        setShowBulkMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-50 font-bold text-red-600 flex items-center gap-2"
                    >
                      <Trash2 size={13} /> Delete Selected
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={onOpenBulkImport}
            className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Upload size={13} className="mr-1 text-indigo-600" />
            Import / Paste
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={onAddNewRow}
            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Plus size={13} className="mr-1" />
            Add Row
          </Button>
        </div>
      </div>

      {/* Bottom Row: Quick Exception Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-2 border-t border-slate-100">
        {filters.map(f => {
          const count = filterCounts[f.key] || 0;
          const isActive = activeFilter === f.key;
          const Icon = f.icon;

          return (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus:outline-none ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
              }`}
            >
              {Icon && <Icon size={12} className={isActive ? 'text-white' : f.color} />}
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : count > 0 && f.key !== 'ALL'
                    ? 'bg-slate-200 text-slate-800'
                    : 'bg-slate-200/50 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
