'use client';

import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, ChevronDown, BookOpen, ShieldAlert, Check, RefreshCw, Layers } from 'lucide-react';
import { CustomsHsCodeMaster } from '@/lib/domain/customs/types';

interface BtkiChapterSummary {
  chapter: string;
  title_id: string;
  title_en?: string;
  total_headings: number;
  total_tariffs: number;
}

interface BtkiTreeExplorerProps {
  onSelectHsCode: (hsCode: string) => void;
  activeHsCode?: string;
}

export function BtkiTreeExplorer({
  onSelectHsCode,
  activeHsCode
}: BtkiTreeExplorerProps) {
  const [chapters, setChapters] = useState<BtkiChapterSummary[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('85');
  const [treeItems, setTreeItems] = useState<CustomsHsCodeMaster[]>([]);
  const [headings, setHeadings] = useState<Array<{ heading: string; sampleDescription: string; count: number }>>([]);
  const [expandedHeadings, setExpandedHeadings] = useState<Set<string>>(new Set(['8501', '8504']));
  const [selectedTariff, setSelectedTariff] = useState<CustomsHsCodeMaster | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CustomsHsCodeMaster[]>([]);
  const [searching, setSearching] = useState(false);

  // Load Chapters
  useEffect(() => {
    async function loadChapters() {
      try {
        const res = await fetch('/api/v1/customs/btki/chapters');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setChapters(json.data);
        }
      } catch (err) {
        console.error('Failed to load BTKI chapters', err);
      }
    }
    loadChapters();
  }, []);

  // Load Tree when chapter changes
  useEffect(() => {
    async function loadTree() {
      if (!selectedChapter) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/customs/btki/tree?chapter=${selectedChapter}`);
        const json = await res.json();
        if (json.success && json.data) {
          setTreeItems(json.data.items || []);
          setHeadings(json.data.headings || []);
          // Auto-expand first heading
          if (json.data.headings && json.data.headings.length > 0) {
            setExpandedHeadings(new Set([json.data.headings[0].heading]));
          }
        }
      } catch (err) {
        console.error('Failed to load BTKI tree', err);
      } finally {
        setLoading(false);
      }
    }
    loadTree();
  }, [selectedChapter]);

  // Global search across all BTKI
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/v1/customs/hs-lookup?q=${encodeURIComponent(searchQuery)}&pageSize=30`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSearchResults(json.data);
        }
      } catch (err) {
        console.error('BTKI search failed', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleHeading = (heading: string) => {
    const next = new Set(expandedHeadings);
    if (next.has(heading)) {
      next.delete(heading);
    } else {
      next.add(heading);
    }
    setExpandedHeadings(next);
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Header & Search */}
      <div className="p-3 border-b border-slate-100 space-y-2 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
            <BookOpen size={14} className="text-indigo-600" />
            BTKI 2026.1 Tariff Explorer
          </div>
          <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 text-[10px] font-bold rounded-full">
            Indonesian Customs
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search 8-digit code or description..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {searching && (
            <RefreshCw size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
          )}
        </div>

        {/* Chapter Selector (Hidden if searching) */}
        {!searchQuery && (
          <div className="flex items-center gap-2">
            <Layers size={13} className="text-slate-400 shrink-0" />
            <select
              value={selectedChapter}
              onChange={e => setSelectedChapter(e.target.value)}
              className="w-full py-1 px-2 bg-white border border-slate-200 rounded-md text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {chapters.map(ch => (
                <option key={ch.chapter} value={ch.chapter}>
                  Bab {ch.chapter}: {ch.title_id} ({ch.total_tariffs} codes)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-2">
        {searchQuery ? (
          // Global Search Results View
          <div className="space-y-1">
            <div className="px-2 py-1 text-[11px] font-bold text-slate-500 uppercase">
              Search Results ({searchResults.length})
            </div>
            {searchResults.length === 0 && !searching ? (
              <p className="p-6 text-center text-xs text-slate-400">No BTKI tariff matching "{searchQuery}"</p>
            ) : (
              searchResults.map(item => (
                <button
                  key={item.id || item.hs_code}
                  onClick={() => setSelectedTariff(item)}
                  className={`w-full text-left p-2 rounded-lg text-xs transition-colors border ${
                    selectedTariff?.hs_code === item.hs_code
                      ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono font-bold text-slate-900">
                    <span>{item.hs_code}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      BM: {item.bm_rate}% · PPN: {item.ppn_rate}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{item.description_id}</p>
                </button>
              ))
            )}
          </div>
        ) : loading ? (
          // Loading Skeleton
          <div className="p-6 text-center text-xs text-slate-400">
            <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-indigo-600" />
            Loading Chapter {selectedChapter} Tree...
          </div>
        ) : (
          // Hierarchical Heading Tree View
          <div className="space-y-1.5">
            {headings.map(h => {
              const isExpanded = expandedHeadings.has(h.heading);
              const headingItems = treeItems.filter(item => item.heading === h.heading);

              return (
                <div key={h.heading} className="border border-slate-100 rounded-lg overflow-hidden">
                  {/* Heading Toggle Bar */}
                  <button
                    onClick={() => toggleHeading(h.heading)}
                    className="w-full flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100/80 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span>Pos {h.heading}</span>
                    </div>
                    <span className="text-[10px] bg-slate-200/80 text-slate-700 font-bold px-1.5 py-0.5 rounded-full">
                      {h.count} tariffs
                    </span>
                  </button>

                  {/* 8-Digit Tariff Items Under Heading */}
                  {isExpanded && (
                    <div className="p-1 space-y-1 bg-white divide-y divide-slate-50">
                      {headingItems.map(item => {
                        const isSelected = selectedTariff?.hs_code === item.hs_code;
                        const isCurrentActive = activeHsCode === item.hs_code;

                        return (
                          <button
                            key={item.id || item.hs_code}
                            onClick={() => setSelectedTariff(item)}
                            className={`w-full text-left p-2 rounded-md transition-colors ${
                              isSelected
                                ? 'bg-indigo-50 border border-indigo-200'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-slate-900">
                                {item.hs_code}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                                <span>BM {item.bm_rate}%</span>
                                {item.lartas_flag && (
                                  <span className="text-purple-600" title="Lartas Permit Required">
                                    <ShieldAlert size={12} />
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                              {item.description_id}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Inspector & Apply Action */}
      {selectedTariff && (
        <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-mono text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                {selectedTariff.hs_code}
              </span>
              <p className="text-xs text-slate-800 font-medium mt-1 line-clamp-2">
                {selectedTariff.description_id}
              </p>
              {selectedTariff.description_en && (
                <p className="text-[11px] text-slate-500 italic line-clamp-1">
                  {selectedTariff.description_en}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
              <span>BM: {selectedTariff.bm_rate}%</span>
              <span>PPN: {selectedTariff.ppn_rate}%</span>
              <span>PPh: {selectedTariff.pph_rate}%</span>
              {selectedTariff.lartas_flag && (
                <span className="text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded text-[10px]">
                  {selectedTariff.lartas_permit_type || 'Lartas'}
                </span>
              )}
            </div>

            <button
              onClick={() => onSelectHsCode(selectedTariff.hs_code)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1"
            >
              <Check size={14} />
              Apply to Active Item
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
