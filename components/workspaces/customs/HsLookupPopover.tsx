'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ShieldAlert, Check, X, Loader2, BookOpen } from 'lucide-react';
import { CustomsHsCodeMaster } from '@/lib/domain/customs/types';

interface HsLookupPopoverProps {
  initialQuery?: string;
  onSelect: (hsCode: string, hsMaster?: CustomsHsCodeMaster) => void;
  onClose: () => void;
}

export function HsLookupPopover({ initialQuery = '', onSelect, onClose }: HsLookupPopoverProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<CustomsHsCodeMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/customs/hs-lookup?q=${encodeURIComponent(query.trim())}&limit=10`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setResults(json.data);
            setSelectedIndex(0);
          }
        }
      } catch (err) {
        console.error('HS lookup error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelect(results[selectedIndex].hs_code, results[selectedIndex]);
      } else if (query.trim()) {
        onSelect(query.trim());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="absolute top-full left-0 mt-1 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      onKeyDown={handleKeyDown}
    >
      {/* Search Input Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        <Search size={15} className="text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari pos tarif / deskripsi BTKI..."
          className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none placeholder:text-slate-400"
        />
        {loading && <Loader2 size={14} className="animate-spin text-indigo-600 shrink-0" />}
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
        >
          <X size={14} />
        </button>
      </div>

      {/* Results List */}
      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
        {results.length > 0 ? (
          results.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={item.id || item.hs_code}
                onClick={() => onSelect(item.hs_code, item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left p-3 text-xs transition-colors flex flex-col gap-1 ${
                  isSelected ? 'bg-indigo-50/80 text-indigo-950' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded text-[11px]">
                      {item.hs_code}
                    </span>
                    {item.lartas_flag && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200">
                        <ShieldAlert size={10} /> LARTAS
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                    <span>BM: {item.bm_rate}%</span>
                    <span>•</span>
                    <span>PPN: {item.ppn_rate}%</span>
                  </div>
                </div>

                <p className="text-[11px] font-medium text-slate-800 line-clamp-2">
                  {item.description_id}
                </p>
                {item.description_en && (
                  <p className="text-[10px] text-slate-400 italic line-clamp-1">
                    {item.description_en}
                  </p>
                )}
              </button>
            );
          })
        ) : query.length >= 2 && !loading ? (
          <div className="p-6 text-center text-xs text-slate-400 space-y-1.5">
            <BookOpen size={20} className="mx-auto text-slate-300" />
            <p>Tidak ditemukan pos tarif BTKI yang cocok.</p>
            <button
              onClick={() => onSelect(query.trim())}
              className="text-[11px] font-bold text-indigo-600 hover:underline"
            >
              Gunakan &quot;{query.trim()}&quot; sebagai kode manual
            </button>
          </div>
        ) : (
          <div className="p-4 text-center text-[11px] text-slate-400">
            Ketik minimal 2 karakter nomor pos tarif atau nama komoditas.
          </div>
        )}
      </div>
    </div>
  );
}
