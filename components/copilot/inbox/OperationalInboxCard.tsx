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

export interface InboxItem {
  id: string;
  category: 'delayed' | 'waiting_driver' | 'waiting_pod' | 'driver_sos' | 'missing_container' | 'whatsapp' | 'ai_suggestion' | string;
  title: string;
  subtitle: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;
  metadata: Record<string, string>;
  jobOrderId?: string;
  isRead?: boolean;
}

export interface OperationalInboxCardProps {
  item: InboxItem;
  isSelected: boolean;
  onClick: (item: InboxItem) => void;
}

const CATEGORY_CONFIG: Record<string, { icon: LucideIcon; color: string; borderColor: string }> = {
  delayed: { icon: Clock, color: 'text-amber-500', borderColor: 'border-l-amber-500' },
  waiting_driver: { icon: UserX, color: 'text-orange-500', borderColor: 'border-l-orange-500' },
  waiting_pod: { icon: FileCheck, color: 'text-rose-500', borderColor: 'border-l-rose-500' },
  driver_sos: { icon: AlertTriangle, color: 'text-red-500', borderColor: 'border-l-red-500' },
  missing_container: { icon: Package, color: 'text-slate-500', borderColor: 'border-l-slate-500' },
  whatsapp: { icon: MessageSquare, color: 'text-emerald-500', borderColor: 'border-l-emerald-500' },
  ai_suggestion: { icon: Sparkles, color: 'text-violet-500', borderColor: 'border-l-violet-500' },
};

const PRIORITY_COLORS = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-rose-100 text-rose-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-slate-100 text-slate-700',
};

export default function OperationalInboxCard({ item, isSelected, onClick }: OperationalInboxCardProps) {
  const config = CATEGORY_CONFIG[item.category] || { icon: Package, color: 'text-slate-500', borderColor: 'border-l-slate-300' };
  const Icon = config.icon;
  const isUnread = !item.isRead;
  
  return (
    <div
      onClick={() => onClick(item)}
      className={`relative cursor-pointer border-l-4 rounded-r-xl p-4 transition-all duration-200 hover:shadow-md 
        ${config.borderColor} 
        ${isSelected 
          ? 'bg-indigo-50 border-t border-r border-b border-t-indigo-200 border-r-indigo-200 border-b-indigo-200' 
          : 'bg-white border-y border-r border-slate-200 hover:bg-slate-50'
        }
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {isUnread && (
            <div className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />
          )}
          <Icon className={`h-4 w-4 ${config.color}`} />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.category.replace('_', ' ')}</span>
        </div>
        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{item.timestamp}</span>
      </div>
      
      <div className="mb-1">
        <h4 className={`text-sm ${isUnread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
          {item.title}
        </h4>
      </div>
      
      <div className="mb-3">
        <p className="text-xs text-slate-600 line-clamp-2">
          {item.subtitle}
        </p>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-auto">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLORS[item.priority]}`}>
          {item.priority}
        </span>
        {Object.entries(item.metadata).map(([key, value]) => (
          <span key={key} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium max-w-[120px] truncate">
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
