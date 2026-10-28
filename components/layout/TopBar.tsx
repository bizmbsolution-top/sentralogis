'use client';

import React from 'react';
import { Menu, Search, Bot } from 'lucide-react';
import { useNavigation, getNavigationSectionLabel } from './AppShell';
import { useAuth } from '@/lib/hooks/useAuth';
import { useOptionalCopilotV2 } from '@/components/copilot/v2/CopilotV2Provider';
import ProfileDropdown from './ProfileDropdown';
import NotificationBell from './NotificationBell';

interface TopBarProps {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { activeSection } = useNavigation();
  const { profile, logout } = useAuth();
  const copilot = useOptionalCopilotV2();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>

        {activeSection && (
          <div className="hidden md:block">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {getNavigationSectionLabel(activeSection)}
            </span>
          </div>
        )}

        {/* Tenant branding badge */}
        {profile?.tenants?.name && (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            {profile.tenants.logo_url ? (
              <img
                src={profile.tenants.logo_url}
                alt={profile.tenants.name}
                className="w-5 h-5 rounded object-contain bg-white/20 shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-5 h-5 rounded bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                {profile.tenants.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px] sm:max-w-[180px]">
              {profile.tenants.name}
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

        {copilot && (
          <button
            type="button"
            onClick={copilot.toggleRecents}
            aria-label="Open Copilot Recents"
            title="Copilot Recents & Histori Percakapan"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800 text-xs font-semibold transition-colors"
          >
            <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline max-w-[140px] truncate">
              {copilot.conversationTitle || 'Copilot Recents'}
            </span>
            {copilot.recentConversations.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                {copilot.recentConversations.length}
              </span>
            )}
          </button>
        )}

        <NotificationBell />

        <div className="pl-2 border-l border-slate-200 dark:border-slate-700 flex items-center gap-2">
          {/* User profile dropdown containing Profile links and Logout */}
          <ProfileDropdown onSignOut={logout} />
        </div>
      </div>
    </header>
  );
}
