'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { CustomsClassificationLine, CustomsAggregate } from '@/lib/domain/customs/types';
import { useVirtualGrid } from '@/lib/hooks/useVirtualGrid';
import { PpjkItemGridToolbar, ItemGridFilterKey } from './PpjkItemGridToolbar';
import { PpjkItemGridRow, EditableRowCell } from './PpjkItemGridRow';
import { PpjkItemDetailDrawer } from './PpjkItemDetailDrawer';
import { BulkImportDialog } from './BulkImportDialog';
import { ItemValidationBadge } from './ItemValidationBadge';
import { HsLookupPopover } from './HsLookupPopover';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Boxes,
  Layers,
  Search,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  FileSpreadsheet,
  Plus
} from 'lucide-react';

interface PpjkItemGridProps {
  declarationId: string;
  importerId: string;
  initialLines: CustomsClassificationLine[];
  onRefreshDeclaration: () => void;
  initialFilter?: string;
}

export function PpjkItemGrid({
  declarationId,
  importerId,
  initialLines = [],
  onRefreshDeclaration,
  initialFilter
}: PpjkItemGridProps) {
  // 1. Data & State Management
  const [lines, setLines] = useState<CustomsClassificationLine[]>(initialLines);
  const [dirtyMap, setDirtyMap] = useState<Map<string, Partial<CustomsClassificationLine>>>(new Map());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeCell, setActiveCell] = useState<EditableRowCell | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ItemGridFilterKey>(
    initialFilter === 'missing_hs' ? 'MISSING_HS' : 'ALL'
  );
  const [detailLine, setDetailLine] = useState<CustomsClassificationLine | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showGlobalHsLookup, setShowGlobalHsLookup] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync when initialLines prop changes
  useEffect(() => {
    setLines(initialLines);
  }, [initialLines]);

  // 2. Filter & Search Logic (Memoized)
  const filteredLines = useMemo(() => {
    let result = lines;

    // Filter by quick filter key
    if (activeFilter === 'ERRORS') {
      result = result.filter(l => !l.hs_code || !l.goods_description);
    } else if (activeFilter === 'WARNINGS') {
      result = result.filter(l => Boolean(l.lartas_flag || l.price_anomaly_flag));
    } else if (activeFilter === 'MISSING_HS') {
      result = result.filter(l => !l.hs_code);
    } else if (activeFilter === 'PRICE_ANOMALY') {
      result = result.filter(l => Boolean(l.price_anomaly_flag));
    } else if (activeFilter === 'LARTAS') {
      result = result.filter(l => Boolean(l.lartas_flag));
    } else if (activeFilter === 'DIRTY') {
      result = result.filter(l => dirtyMap.has(l.id));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        l =>
          (l.sku_code && l.sku_code.toLowerCase().includes(q)) ||
          (l.goods_description && l.goods_description.toLowerCase().includes(q)) ||
          (l.hs_code && l.hs_code.toLowerCase().includes(q)) ||
          (l.brand && l.brand.toLowerCase().includes(q))
      );
    }

    return result;
  }, [lines, activeFilter, searchQuery, dirtyMap]);

  // 3. Filter Counts
  const filterCounts = useMemo(() => {
    return {
      ALL: lines.length,
      ERRORS: lines.filter(l => !l.hs_code || !l.goods_description).length,
      WARNINGS: lines.filter(l => Boolean(l.lartas_flag || l.price_anomaly_flag)).length,
      MISSING_HS: lines.filter(l => !l.hs_code).length,
      PRICE_ANOMALY: lines.filter(l => Boolean(l.price_anomaly_flag)).length,
      LARTAS: lines.filter(l => Boolean(l.lartas_flag)).length,
      UNCLASSIFIED: lines.filter(l => !l.hs_code).length,
      DIRTY: dirtyMap.size
    };
  }, [lines, dirtyMap]);

  // 4. Virtualization Hook
  const {
    containerRef,
    onScroll,
    startIndex,
    endIndex,
    offsetY,
    totalHeight,
    scrollToIndex
  } = useVirtualGrid({
    itemCount: filteredLines.length,
    itemHeight: 48,
    overscan: 8
  });

  const visibleSlice = useMemo(() => {
    return filteredLines.slice(startIndex, endIndex);
  }, [filteredLines, startIndex, endIndex]);

  // 5. Inline Cell Modification
  const handleCellChange = useCallback((rowId: string, field: string, value: any) => {
    setLines(prev =>
      prev.map(l => (l.id === rowId ? { ...l, [field]: value } : l))
    );

    setDirtyMap(prev => {
      const next = new Map(prev);
      const existing = next.get(rowId) || {};
      next.set(rowId, { ...existing, [field]: value });
      return next;
    });
  }, []);

  const handleCellClick = useCallback((rowId: string, field: string) => {
    setActiveCell({ rowId, field });
  }, []);

  const handleCellCommit = useCallback(
    (rowId: string, field: string, moveNext = false) => {
      if (moveNext) {
        // Move to the same field in the next row
        const currentIndex = filteredLines.findIndex(l => l.id === rowId);
        if (currentIndex >= 0 && currentIndex < filteredLines.length - 1) {
          const nextRow = filteredLines[currentIndex + 1];
          setActiveCell({ rowId: nextRow.id, field });
          scrollToIndex(currentIndex + 1);
        } else {
          setActiveCell(null);
        }
      } else {
        // Move to next column horizontally
        const columns = ['sku_code', 'goods_description', 'hs_code', 'item_quantity', 'uom_code', 'unit_price_usd', 'country_of_origin', 'invoice_number'];
        const colIdx = columns.indexOf(field);
        if (colIdx >= 0 && colIdx < columns.length - 1) {
          setActiveCell({ rowId, field: columns[colIdx + 1] });
        } else {
          setActiveCell(null);
        }
      }
    },
    [filteredLines, scrollToIndex]
  );

  // 6. Selection Handling
  const handleSelectRow = useCallback((id: string, isMulti: boolean, isShift: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredLines.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLines.map(l => l.id)));
    }
  }, [selectedIds, filteredLines]);

  // 7. Bulk Operations
  const handleBulkSetField = useCallback((field: string, value: string) => {
    setLines(prev =>
      prev.map(l => {
        if (selectedIds.has(l.id)) {
          return { ...l, [field]: value };
        }
        return l;
      })
    );

    setDirtyMap(prev => {
      const next = new Map(prev);
      selectedIds.forEach(id => {
        const existing = next.get(id) || {};
        next.set(id, { ...existing, [field]: value });
      });
      return next;
    });
  }, [selectedIds]);

  const handleBulkDelete = useCallback(() => {
    setLines(prev => prev.filter(l => !selectedIds.has(l.id)));
    setDirtyMap(prev => {
      const next = new Map(prev);
      selectedIds.forEach(id => next.delete(id));
      return next;
    });
    setSelectedIds(new Set());
  }, [selectedIds]);

  const handleDeleteLine = useCallback((id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
    setDirtyMap(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleAddNewRow = useCallback(() => {
    const newId = `draft-${Date.now()}`;
    const newLine: CustomsClassificationLine = {
      id: newId,
      declaration_id: declarationId,
      tenant_id: '',
      item_sequence: lines.length + 1,
      sku_code: '',
      goods_description: '',
      hs_code: '',
      item_quantity: 1,
      uom_code: 'PCE',
      unit_price_usd: 0,
      cif_value_usd: 0,
      bm_rate_percent: 0,
      ppn_rate_percent: 11,
      pph_rate_percent: 2.5,
      calculated_bm_idr: 0,
      calculated_ppn_idr: 0,
      calculated_pph_idr: 0,
      country_of_origin: 'CN',
      created_at: new Date().toISOString()
    };

    setLines(prev => [newLine, ...prev]);
    setDirtyMap(prev => {
      const next = new Map(prev);
      next.set(newId, newLine);
      return next;
    });
    setActiveCell({ rowId: newId, field: 'sku_code' });
  }, [declarationId, lines.length]);

  // 8. Save & Discard Batch Mutations
  const handleSaveDirty = async () => {
    if (dirtyMap.size === 0) return;
    setSaving(true);
    try {
      const updates = Array.from(dirtyMap.entries()).map(([id, changes]) => ({
        id,
        ...changes
      }));

      // Call bulk update API
      const res = await fetch(`/api/v1/customs/declarations/${declarationId}/items/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'COMMIT',
          items: updates
        })
      });

      if (!res.ok) {
        throw new Error('Failed to persist item updates');
      }

      setDirtyMap(new Map());
      onRefreshDeclaration();
    } catch (err: any) {
      alert(err.message || 'Error saving items');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardDirty = () => {
    if (confirm('Discard all unsaved local changes?')) {
      setDirtyMap(new Map());
      setLines(initialLines);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* 1. OPERATIONAL TOOLBAR */}
      <PpjkItemGridToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        filterCounts={filterCounts}
        selectedCount={selectedIds.size}
        dirtyCount={dirtyMap.size}
        saving={saving}
        onSaveDirty={handleSaveDirty}
        onDiscardDirty={handleDiscardDirty}
        onOpenBulkImport={() => setShowBulkImport(true)}
        onAddNewRow={handleAddNewRow}
        onBulkSetField={handleBulkSetField}
        onBulkDelete={handleBulkDelete}
      />

      {/* 2. DESKTOP: VIRTUALIZED SPREADSHEET GRID */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header (Sticky) */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[1400px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 z-10 shadow-2xs">
              <tr className="h-10">
                <th className="w-10 px-3 text-center">
                  <input
                    type="checkbox"
                    checked={filteredLines.length > 0 && selectedIds.size === filteredLines.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="w-12 px-2 text-center">#</th>
                <th className="w-24 px-2 text-center">Status</th>
                <th className="w-36 px-2.5">SKU Code</th>
                <th className="w-56 px-2.5">Description</th>
                <th className="w-28 px-2">Brand</th>
                <th className="w-28 px-2">Model</th>
                <th className="w-36 px-2.5">HS Code (BTKI)</th>
                <th className="w-20 px-2 text-right">Qty</th>
                <th className="w-16 px-2">UOM</th>
                <th className="w-28 px-2 text-right">Price (USD)</th>
                <th className="w-28 px-2 text-right">Total CIF</th>
                <th className="w-20 px-2 text-center">Origin</th>
                <th className="w-28 px-2">Invoice No</th>
                <th className="w-20 px-2 text-center">Flags</th>
                <th className="w-16 px-2 text-center">Action</th>
              </tr>
            </thead>
          </table>
        </div>

        {/* Virtualized Scroll Viewport */}
        <div
          ref={containerRef}
          onScroll={onScroll}
          className="max-h-[600px] overflow-y-auto overflow-x-auto relative"
          style={{ minHeight: '300px' }}
        >
          {filteredLines.length > 0 ? (
            <div style={{ height: `${totalHeight}px`, position: 'relative', minWidth: '1400px' }}>
              <table
                className="w-full text-xs text-left border-collapse absolute top-0 left-0"
                style={{ transform: `translateY(${offsetY}px)` }}
              >
                <tbody>
                  {visibleSlice.map((line, idx) => (
                    <PpjkItemGridRow
                      key={line.id}
                      line={line}
                      index={startIndex + idx}
                      isSelected={selectedIds.has(line.id)}
                      isDirty={dirtyMap.has(line.id)}
                      activeCell={activeCell}
                      onSelectRow={handleSelectRow}
                      onCellClick={handleCellClick}
                      onCellChange={handleCellChange}
                      onCellCommit={handleCellCommit}
                      onOpenDetail={setDetailLine}
                      onDeleteLine={handleDeleteLine}
                      importerId={importerId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center space-y-3">
              <Boxes size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-700">Tidak ada item ditemukan</p>
              <p className="text-[11px] text-slate-400">
                Gunakan tombol &quot;Add Row&quot; atau &quot;Import / Paste&quot; untuk memasukkan data barang.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. MOBILE: OPERATIONAL CARDS VIEW */}
      <div className="lg:hidden space-y-3">
        {filteredLines.length > 0 ? (
          filteredLines.map((line, idx) => (
            <Card
              key={line.id}
              onClick={() => setDetailLine(line)}
              className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    #{line.item_sequence || idx + 1}
                  </span>
                  <h4 className="font-mono font-black text-slate-900 text-sm">{line.sku_code || 'UNTITLED'}</h4>
                  <p className="text-xs text-slate-600 line-clamp-1">{line.goods_description}</p>
                </div>
                <ItemValidationBadge
                  status={line.validation_status}
                  hasError={!line.hs_code || !line.goods_description}
                  hasWarning={Boolean(line.lartas_flag || line.price_anomaly_flag)}
                  isDirty={dirtyMap.has(line.id)}
                  lartas={line.lartas_flag}
                  priceAnomaly={line.price_anomaly_flag}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">HS Code (BTKI)</span>
                  <span className="font-bold text-indigo-700">{line.hs_code || 'MISSING HS'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Qty / UOM</span>
                  <span className="font-bold text-slate-800">{line.item_quantity || 1} {line.uom_code || 'PCE'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <span className="font-mono font-bold text-slate-900">
                  ${((line.item_quantity || 1) * (line.unit_price_usd || 0)).toLocaleString()} USD
                </span>
                <span className="text-indigo-600 font-bold flex items-center gap-1 text-[11px]">
                  Inspect Detail <ExternalLink size={12} />
                </span>
              </div>
            </Card>
          ))
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
            Tidak ada item.
          </div>
        )}
      </div>

      {/* 4. DETAIL DRAWER */}
      {detailLine && (
        <PpjkItemDetailDrawer
          line={detailLine}
          onClose={() => setDetailLine(null)}
          onApplyHsCode={hs => {
            handleCellChange(detailLine.id, 'hs_code', hs);
            setDetailLine(null);
          }}
          onOpenHsLookup={() => setShowGlobalHsLookup(true)}
        />
      )}

      {/* 5. BULK IMPORT WIZARD DIALOG */}
      <BulkImportDialog
        declarationId={declarationId}
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={() => {
          onRefreshDeclaration();
        }}
      />
    </div>
  );
}
