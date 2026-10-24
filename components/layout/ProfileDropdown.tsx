'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { User, Settings, ChevronDown, LogOut } from 'lucide-react';
import Link from 'next/link';

const ROLE_LABELS: Record<string, string> = {
  owner_sentralogis: 'Super Owner',
  tenant_superadmin: 'Tenant Admin',
  tenant_admin: 'Tenant Admin',
  hq_sales_staff: 'Sales Staff',
  hq_commercial_director: 'Commercial Director',
  hq_sales_manager: 'Sales Manager',
  hq_marketing_staff: 'Marketing Staff',
  hq_pricing_analyst: 'Pricing Analyst',
  hq_ops: 'Operations',
  hq_finance: 'Finance',
  hq_cs: 'Customer Service',
  hq_director_ops: 'Director',
  driver: 'Driver',
  warehouse_customer: 'Customer',
  ground_staff: 'Ground Staff',
};

function getRoleLabel(role: string | undefined): string {
  if (!role) return 'User';
  return ROLE_LABELS[role] || role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

interface ProfileDropdownProps {
  onSignOut?: () => Promise<void> | void;
}

export default function ProfileDropdown({ onSignOut }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const { profile } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setConfirmSignOut(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name?.substring(0, 2).toUpperCase() || 'US';
  };

  const handleAction = async () => {
    setIsOpen(false);
    if (onSignOut) {
      await onSignOut();
    } else if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) setConfirmSignOut(false);
        }}
        aria-label="User account menu"
        className="flex items-center gap-3 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-500/20">
          {getInitials(profile?.full_name || profile?.email || '')}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">{profile?.full_name || 'Administrator'}</p>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1 leading-none">{getRoleLabel(profile?.role)}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-900/10 py-2 z-[150] animate-in fade-in zoom-in-95 duration-200">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 mb-1">
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{profile?.full_name || 'Administrator'}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{profile?.email || 'user@example.com'}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-md">
                {getRoleLabel(profile?.role)}
              </span>
              {profile?.tenants?.name && (
                <span className="text-[10px] font-medium text-slate-400 truncate max-w-[110px]">
                  {profile.tenants.name}
                </span>
              )}
            </div>
          </div>
          
          {(profile?.role === 'tenant_superadmin' || profile?.role === 'tenant_admin') ? (
            <>
              <Link 
                href="/tenant/profile" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <User className="w-4 h-4 text-slate-400" /> My Profile
              </Link>
              <Link 
                href="/tenant/statement" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="w-4 h-4 text-slate-400" /> Activity
              </Link>
            </>
          ) : (
            <>
              <Link 
                href="/owner/profile" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <User className="w-4 h-4 text-slate-400" /> Profile
              </Link>
              <Link 
                href="/owner/settings" 
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="w-4 h-4 text-slate-400" /> Settings
              </Link>
            </>
          )}
          
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

          {confirmSignOut ? (
            <div className="p-3 mx-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-2">
              <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">
                Konfirmasi keluar dari akun?
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmSignOut(false)}
                  className="flex-1 px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAction}
                  className="flex-1 px-2.5 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
                >
                  Ya, Logout
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Logout</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
