'use client';

import React from 'react';
import { 
  Clock, 
  UserX, 
  FileCheck, 
  AlertTriangle, 
  Package, 
  MessageSquare, 
  Sparkles,
  LucideIcon
} from 'lucide-react';
import { motion } from 'framer-motion';

export interface InboxCategoryTabsProps {
  categories: { key: string; label: string; count: number }[];
  activeCategory: string;
  onSelect: (category: string) => void;
}

const CATEGORY_ICONS: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  delayed: { icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-100' },
  waiting_driver: { icon: UserX, color: 'text-orange-500', bgColor: 'bg-orange-100' },
  waiting_pod: { icon: FileCheck, color: 'text-rose-500', bgColor: 'bg-rose-100' },
  driver_sos: { icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-100' },
  missing_container: { icon: Package, color: 'text-slate-500', bgColor: 'bg-slate-100' },
  whatsapp: { icon: MessageSquare, color: 'text-emerald-500', bgColor: 'bg-emerald-100' },
  ai_suggestion: { icon: Sparkles, color: 'text-violet-500', bgColor: 'bg-violet-100' },
};

export default function InboxCategoryTabs({ categories, activeCategory, onSelect }: InboxCategoryTabsProps) {
  return (
    <div className="flex w-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="flex space-x-1 px-4">
        {categories.map((category) => {
          const isActive = activeCategory === category.key;
          const config = CATEGORY_ICONS[category.key] || { icon: Package, color: 'text-slate-500', bgColor: 'bg-slate-100' };
          const Icon = config.icon;
          
          return (
            <button
              key={category.key}
              onClick={() => onSelect(category.key)}
              className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'text-indigo-700 bg-indigo-50/50' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {category.key !== 'all' && (
                <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : config.color}`} />
              )}
              <span>{category.label}</span>
              
              {category.count > 0 && (
                <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isActive ? 'bg-indigo-100 text-indigo-700' : (category.key === 'all' ? 'bg-slate-200 text-slate-700' : `${config.bgColor} ${config.color}`)
                }`}>
                  {category.count}
                </span>
              )}
              
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
