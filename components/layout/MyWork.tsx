'use client';

import React from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  Truck,
  Ship,
  FileText,
  DollarSign,
  Bell,
  ChevronRight,
} from 'lucide-react';

export interface WorkItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  count?: number;
  urgency: 'high' | 'medium' | 'low';
  href?: string;
}

const TODAY_ITEMS: WorkItem[] = [
  { id: 'pending-approvals', label: 'Pending Approvals', description: '3 overrides awaiting review', icon: <AlertTriangle className="w-4 h-4" />, count: 3, urgency: 'high', href: '/pricing/overrides' },
  { id: 'active-shipments', label: 'Active Shipments', description: '12 in transit', icon: <Ship className="w-4 h-4" />, count: 12, urgency: 'medium', href: '/operations/forwarding' },
  { id: 'assigned-jobs', label: 'Assigned Jobs', description: '5 jobs today', icon: <Truck className="w-4 h-4" />, count: 5, urgency: 'medium', href: '/operations/trucking' },
];

const ATTENTION_ITEMS: WorkItem[] = [
  { id: 'overdue-invoice', label: 'Overdue Invoice', description: 'INV-2026-00042', icon: <FileText className="w-4 h-4" />, urgency: 'high', href: '/financial/invoices' },
  { id: 'delayed-shipment', label: 'Delayed Shipment', description: 'SHP-2026-00125', icon: <Package className="w-4 h-4" />, urgency: 'high', href: '/operations/forwarding' },
  { id: 'customs-hold', label: 'Customs Hold', description: 'Declaration DECL-001', icon: <AlertTriangle className="w-4 h-4" />, urgency: 'high', href: '/operations/customs' },
];

export default function MyWork() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">My Work</h3>
        <Bell className="w-4 h-4 text-slate-400" />
      </div>

      <div>
        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Today</div>
        <div className="space-y-1">
          {TODAY_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className="text-slate-500">{item.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.label}</div>
                <div className="text-xs text-slate-400 truncate">{item.description}</div>
              </div>
              {item.count && (
                <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-full">{item.count}</span>
              )}
            </a>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Needs Attention</div>
        <div className="space-y-1">
          {ATTENTION_ITEMS.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            >
              <div className={item.urgency === 'high' ? 'text-red-500' : 'text-amber-500'}>{item.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.label}</div>
                <div className="text-xs text-slate-400 truncate">{item.description}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
