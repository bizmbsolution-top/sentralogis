'use client';

import React from 'react';
import { Menu, Search, Bell, LogOut } from 'lucide-react';
import { useNavigation, getNavigationSectionLabel } from './AppShell';
import { useAuth } from '@/lib/hooks/useAuth';
import ProfileDropdown from './ProfileDropdown';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { activeSection } = useNavigation();
  const { logout } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>

        {activeSection && (
          <div className="hidden md:block">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {getNavigationSectionLabel(activeSection)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-slate-600 dark:text-slate-300 placeholder-slate-400 outline-none w-48"
          />
        </div>

        <button className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <button
          onClick={logout}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>

        <div className="pl-3 border-l border-slate-200 dark:border-slate-700">
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}
