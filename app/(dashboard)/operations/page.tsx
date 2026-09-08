'use client';

import React from 'react';
import {
  Package,
  Truck,
  Ship,
  Shield,
  Warehouse,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus
} from 'lucide-react';
import Link from 'next/link';

interface WorkItem {
  id: string;
  label: string;
  description: string;
  count: number;
  icon: React.ReactNode;
  href: string;
  color: string;
}

interface Exception {
  id: string;
  label: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
  href: string;
}

const WORK_ITEMS: WorkItem[] = [
  { id: 'forwarding', label: 'Forwarding', description: 'Shipments & Consolidations', count: 12, icon: <Ship className="w-5 h-5" />, href: '/operations/forwarding', color: 'text-cyan-500' },
  { id: 'trucking', label: 'Trucking', description: 'Work Orders & Assignments', count: 8, icon: <Truck className="w-5 h-5" />, href: '/operations/trucking', color: 'text-orange-500' },
  { id: 'customs', label: 'Customs', description: 'Declarations & Clearance', count: 3, icon: <Shield className="w-5 h-5" />, href: '/operations/customs', color: 'text-red-500' },
  { id: 'warehouse', label: 'Warehouse', description: 'Inbound & Outbound', count: 5, icon: <Warehouse className="w-5 h-5" />, href: '/operations/warehouse', color: 'text-indigo-500' },
];

const EXCEPTIONS: Exception[] = [
  { id: '1', label: 'Delayed Shipment', description: 'SHP-2026-00125 — ETA exceeded by 2 days', urgency: 'high', href: '/operations/forwarding/shipments/shp-2026-00125' },
  { id: '2', label: 'Customs Hold', description: 'DECL-001 — Additional documents required', urgency: 'high', href: '/operations/customs/declarations/decl-001' },
  { id: '3', label: 'Missing POD', description: 'JO-CC-RAS-0826-001-01', urgency: 'medium', href: '/operations/trucking/assignments' },
];

export default function OperationsDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Operations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Fulfillment, shipment execution, and operational work
          </p>
        </div>
      </div>

      {/* Work Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {WORK_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className={item.color}>{item.icon}</span>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{item.count}</span>
            </div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</div>
            <div className="text-xs text-slate-500">{item.description}</div>
          </Link>
        ))}
      </div>

      {/* Exceptions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Operational Exceptions
        </h2>
        <div className="space-y-2">
          {EXCEPTIONS.map((exc) => (
            <Link
              key={exc.id}
              href={exc.href}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className={`w-2 h-2 rounded-full ${exc.urgency === 'high' ? 'bg-red-500' : exc.urgency === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">{exc.label}</div>
                <div className="text-xs text-slate-500">{exc.description}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
