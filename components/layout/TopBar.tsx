'use client';

import React from 'react';
import { Menu, Search, Bell, User, ChevronDown } from 'lucide-react';
import { useWorkspace, WORKSPACES } from './AppShell';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { activeWorkspace, setActiveWorkspace } = useWorkspace();
  const currentWorkspace = WORKSPACES.find((w) => w.id === activeWorkspace);

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>

        <div className="hidden md:flex items-center gap-2">
          <select
            value={activeWorkspace}
            onChange={(e) => setActiveWorkspace(e.target.value as typeof activeWorkspace)}
            className="px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          >
            {WORKSPACES.map((w) => (
              <option key={w.id} value={w.id}>
                {w.icon} {w.label}
              </option>
            ))}
          </select>
        </div>
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

        <div className="flex items-center gap-2 pl-3 border-l border-slate-200 dark:border-slate-700">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">User</div>
            <div className="text-xs text-slate-400">{currentWorkspace?.label}</div>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </header>
  );
}
