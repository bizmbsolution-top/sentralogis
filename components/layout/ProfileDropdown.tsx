'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { profile, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name?.substring(0, 2).toUpperCase() || 'US';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 hover:bg-slate-50 rounded-xl transition-all"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-500/20">
          {getInitials(profile?.full_name || profile?.email || '')}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold text-slate-900 leading-none">{profile?.full_name || 'Administrator'}</p>
          <p className="text-[10px] font-medium text-slate-500 mt-1 leading-none">{profile?.role?.toUpperCase() || 'USER'}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/5 py-2 z-[150] animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 border-b border-slate-50 mb-1">
            <p className="text-xs font-bold text-slate-900">{profile?.email || 'user@example.com'}</p>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">Authorized Identity</p>
          </div>
          
          {profile?.role?.toLowerCase().includes('tenant') ? (
            <>
              <Link 
                href="/tenant" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <User className="w-4 h-4" /> Node Profile
              </Link>
              <Link 
                href="/tenant/topup" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-4 h-4 rounded-full border border-blue-500 flex items-center justify-center text-[8px] font-bold text-blue-500">T</div> Energy Recharge
              </Link>
              <Link 
                href="/tenant/history" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[8px] font-bold text-slate-400">H</div> Activity Log
              </Link>
            </>
          ) : (
            <>
              <Link 
                href="/owner/profile" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <User className="w-4 h-4" /> Profile Details
              </Link>
              <Link 
                href="/owner/settings" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="w-4 h-4" /> Account Settings
              </Link>
            </>
          )}
          
          <div className="h-px bg-slate-100 my-1" />
          
          <button 
            onClick={() => { logout(); setIsOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Terminate Session
          </button>
        </div>
      )}
    </div>
  );
}
