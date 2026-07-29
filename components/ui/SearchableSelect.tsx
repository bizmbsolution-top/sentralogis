'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className = ''
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.description && opt.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className={`relative w-full ${className}`} ref={wrapperRef}>
      <div
        className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 flex justify-between items-center transition-all ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100'
            : 'cursor-pointer hover:border-blue-400 focus:border-blue-500 shadow-sm'
        }`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearch('');
          }
        }}
      >
        <span className={selectedOption ? 'text-slate-800' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className="text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-[100] top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-slate-100 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400 italic">
                No results found
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
                    opt.disabled
                      ? 'opacity-50 cursor-not-allowed bg-slate-50'
                      : opt.value === value
                      ? 'bg-blue-50 text-blue-700 font-bold cursor-pointer'
                      : 'text-slate-700 hover:bg-slate-50 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!opt.disabled) {
                      onChange(opt.value);
                      setIsOpen(false);
                    }
                  }}
                >
                  <div>
                    <div>{opt.label}</div>
                    {opt.description && (
                      <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                        {opt.description}
                      </div>
                    )}
                  </div>
                  {opt.value === value && <Check size={14} className="text-blue-600" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
