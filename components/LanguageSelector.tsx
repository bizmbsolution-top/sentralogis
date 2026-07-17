'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Locale } from '@/lib/i18n/translations';

export default function LanguageSelector({ align = 'right' }: { align?: 'left' | 'right' }) {
  const { locale, setLocale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  
  const locales = [
    { code: 'id', name: 'Indonesia', flag: '🇮🇩' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' }
  ];

  const currentLocale = locale;
  
  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen) {
        // Check if click is outside the component
        const target = event.target as HTMLElement;
        if (!target.closest('.relative.inline-block')) {
          closeDropdown();
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleDropdown();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-[#131d33]/60 border border-slate-800/60 text-slate-300 hover:text-white hover:bg-white/10 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          {locales.find(l => l.code === currentLocale)?.flag || '🌍'}
          <span className="ml-1">{locales.find(l => l.code === currentLocale)?.name || 'Language'}</span>
          <ChevronRight size={12} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {/* Dropdown menu */}
      {isOpen && (
        <div className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2 w-56 bg-slate-900/90 backdrop-blur-md border border-slate-800/60 rounded-xl shadow-lg z-[50]`}>
          <div className="space-y-1 px-3 pt-2 pb-3">
            {locales.map(l => (
              <button
                key={l.code}
                onClick={(e) => {
                  e.stopPropagation();
                  setLocale(l.code as Locale);
                  closeDropdown();
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                  l.code === currentLocale ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                {l.flag} <span className="ml-2">{l.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}