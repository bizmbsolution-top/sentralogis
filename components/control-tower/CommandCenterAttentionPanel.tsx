'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  FileCheck,
  Package,
  TrendingUp,
  Users,
} from 'lucide-react';

interface AttentionItem {
  id: string;
  label: string;
  count: number;
  severity: 'critical' | 'warning' | 'info';
  href?: string;
  icon: React.ReactNode;
  subText?: string;
}

interface CommandCenterAttentionPanelProps {
  salesOrders: Array<{
    id: string;
    soNumber: string;
    status: string;
    engagementId?: string;
    orderDate?: string;
    totalAgreedRevenue?: number;
    currency?: string;
  }>;
}

export function CommandCenterAttentionPanel({ salesOrders }: CommandCenterAttentionPanelProps) {
  const attentionItems = buildAttentionItems(salesOrders);
  const pulseMetrics = buildPulseMetrics(salesOrders);

  const criticalItems = attentionItems.filter((i) => i.severity === 'critical');
  const warningItems = attentionItems.filter((i) => i.severity === 'warning');
  const infoItems = attentionItems.filter((i) => i.severity === 'info');

  return (
    <div className="space-y-4 mb-6">
      {/* Critical Attention */}
      {criticalItems.length > 0 && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
              Critical Attention ({criticalItems.length})
            </h3>
          </div>
          <div className="space-y-2">
            {criticalItems.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-white dark:bg-slate-900/40 border border-rose-100 dark:border-rose-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span className="text-xs font-medium text-rose-800 dark:text-rose-200">{item.label}</span>
                  </div>
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300">{item.count}</span>
                </div>
                {item.subText && <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1">{item.subText}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Needs Action */}
      {warningItems.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Needs Action ({warningItems.length})
            </h3>
          </div>
          <div className="space-y-2">
            {warningItems.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-white dark:bg-slate-900/40 border border-amber-100 dark:border-amber-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span className="text-xs font-medium text-amber-800 dark:text-amber-200">{item.label}</span>
                  </div>
                  {item.href && (
                    <Link
                      href={item.href}
                      className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
                    >
                      View
                    </Link>
                  )}
                  {!item.href && <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{item.count}</span>}
                </div>
                {item.subText && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">{item.subText}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operational Pulse */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {pulseMetrics.map((metric) => (
          <div
            key={metric.id}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1 text-slate-600 dark:text-slate-400">
              {metric.icon}
              <span className="text-xs font-medium">{metric.label}</span>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{metric.value}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">{metric.subText}</p>
          </div>
        ))}
      </div>

      {/* All Clear — when no attention items */}
      {criticalItems.length === 0 && warningItems.length === 0 && infoItems.length === 0 && (
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/60">
              <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                All Clear
              </h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                No critical or actionable items at this time.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildAttentionItems(orders: any[]): AttentionItem[] {
  const items: AttentionItem[] = [];

  const draft = orders.filter((o) => o.status === 'DRAFT');
  if (draft.length > 0) {
    items.push({
      id: 'draft-orders',
      label: 'Orders in draft',
      count: draft.length,
      severity: 'warning',
      href: '/commercial/pipeline',
      icon: <FileCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      subText: 'Awaiting confirmation from commercial team',
    });
  }

  const confirmed = orders.filter((o) => o.status === 'CONFIRMED');
  if (confirmed.length > 0) {
    items.push({
      id: 'confirmed-orders',
      label: 'Confirmed orders awaiting fulfillment',
      count: confirmed.length,
      severity: 'warning',
      href: '/commercial/sales-orders',
      icon: <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      subText: 'Ready for fulfillment composition',
    });
  }

  const atRisk = orders.filter((o) => o.status === 'CONFIRMED');
  if (atRisk.length > 10) {
    items.push({
      id: 'fulfillment-backlog',
      label: 'High fulfillment backlog',
      count: atRisk.length,
      severity: 'critical',
      href: '/commercial/sales-orders',
      icon: <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      subText: 'More than 10 confirmed orders pending action',
    });
  }

  return items;
}

function buildPulseMetrics(orders: any[]): Array<{
  id: string;
  label: string;
  value: string | number;
  subText: string;
  icon: React.ReactNode;
}> {
  const total = orders.length;
  const confirmed = orders.filter((o) => o.status === 'CONFIRMED').length;
  const fulfilled = orders.filter((o) => o.status === 'FULFILLED').length;
  const cancelled = orders.filter((o) => o.status === 'CANCELLED').length;
  const inProgress = confirmed + orders.filter((o) => o.status === 'PLANNING').length;

  return [
    {
      id: 'total-orders',
      label: 'Total Orders',
      value: total,
      subText: 'All time in view',
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: 'in-progress',
      label: 'In Progress',
      value: inProgress,
      subText: 'Confirmed + Planning',
      icon: <TrendingUp className="w-4 h-4 text-blue-600" />,
    },
    {
      id: 'fulfilled',
      label: 'Fulfilled',
      value: fulfilled,
      subText: 'Completed orders',
      icon: <FileCheck className="w-4 h-4 text-emerald-600" />,
    },
    {
      id: 'at-risk',
      label: 'At Risk',
      value: cancelled,
      subText: 'Cancelled',
      icon: <AlertTriangle className="w-4 h-4 text-slate-400" />,
    },
  ];
}
