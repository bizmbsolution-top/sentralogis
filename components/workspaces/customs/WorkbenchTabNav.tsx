'use client';

import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  HelpCircle,
  FileText,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  Send,
  History,
  AlertCircle
} from 'lucide-react';

export interface WorkbenchTabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badgeCount?: number;
  badgeType?: 'error' | 'warning' | 'info';
}

interface WorkbenchTabNavProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  badgeCounts?: Record<string, { count: number; type: 'error' | 'warning' | 'info' }>;
}

export function WorkbenchTabNav({ activeTab, onSelectTab, badgeCounts = {} }: WorkbenchTabNavProps) {
  const tabs: WorkbenchTabConfig[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard
    },
    {
      id: 'validation',
      label: 'Control & Exceptions',
      icon: ShieldCheck,
      badgeCount: badgeCounts['validation']?.count,
      badgeType: badgeCounts['validation']?.type
    },
    {
      id: 'items',
      label: 'Items & SKU',
      icon: Boxes,
      badgeCount: badgeCounts['items']?.count,
      badgeType: badgeCounts['items']?.type
    },
    {
      id: 'classification',
      label: 'Classification',
      icon: HelpCircle,
      badgeCount: badgeCounts['classification']?.count,
      badgeType: badgeCounts['classification']?.type
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      badgeCount: badgeCounts['documents']?.count,
      badgeType: badgeCounts['documents']?.type
    },
    {
      id: 'valuation',
      label: 'Valuation & Tax',
      icon: DollarSign,
      badgeCount: badgeCounts['valuation']?.count,
      badgeType: badgeCounts['valuation']?.type
    },
    {
      id: 'lartas',
      label: 'Lartas & Permits',
      icon: ShieldAlert,
      badgeCount: badgeCounts['lartas']?.count,
      badgeType: badgeCounts['lartas']?.type
    },
    {
      id: 'ceisa',
      label: 'CEISA Preparation',
      icon: Send
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: History
    }
  ];

  return (
    <div className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs">
      <div className="overflow-x-auto scrollbar-none flex items-center gap-1.5 px-4 md:px-6 py-2.5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{tab.label}</span>

              {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.badgeType === 'error'
                      ? 'bg-red-100 text-red-700'
                      : tab.badgeType === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {tab.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
