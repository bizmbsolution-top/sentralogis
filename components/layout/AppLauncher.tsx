'use client';

import React, { useState } from 'react';
import {
  Package,
  Users,
  FileText,
  ShoppingCart,
  Truck,
  Ship,
  Shield,
  Warehouse,
  DollarSign,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  Globe,
  Zap,
} from 'lucide-react';

export interface AppDefinition {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  requiredPermission?: string;
}

const APPS: AppDefinition[] = [
  { id: 'commercial', label: 'Commercial', description: 'Customers, Engagements, Orders', icon: <Users className="w-6 h-6" />, href: '/commercial', color: 'bg-blue-500' },
  { id: 'operations', label: 'Operations', description: 'Fulfillment, Shipments, Execution', icon: <Package className="w-6 h-6" />, href: '/operations', color: 'bg-amber-500' },
  { id: 'finance', label: 'Finance', description: 'Invoices, Payments, Settlements', icon: <DollarSign className="w-6 h-6" />, href: '/finance', color: 'bg-green-500' },
  { id: 'intelligence', label: 'Intelligence', description: 'Visibility, Margin, Exceptions', icon: <BarChart3 className="w-6 h-6" />, href: '/intelligence', color: 'bg-purple-500' },
  { id: 'forwarding', label: 'Forwarding', description: 'Shipments, Consolidations', icon: <Ship className="w-6 h-6" />, href: '/operations/forwarding', color: 'bg-cyan-500' },
  { id: 'trucking', label: 'Trucking', description: 'Work Orders, Assignments, Fleet', icon: <Truck className="w-6 h-6" />, href: '/operations/trucking', color: 'bg-orange-500' },
  { id: 'customs', label: 'Customs', description: 'Declarations, Clearance', icon: <Shield className="w-6 h-6" />, href: '/operations/customs', color: 'bg-red-500' },
  { id: 'warehouse', label: 'Warehouse', description: 'Inbound, Outbound, Inventory', icon: <Warehouse className="w-6 h-6" />, href: '/operations/warehouse', color: 'bg-indigo-500' },
  { id: 'pricing', label: 'Pricing', description: 'Rate Masters, Versions, Overrides', icon: <BarChart3 className="w-6 h-6" />, href: '/pricing', color: 'bg-pink-500' },
  { id: 'control-tower', label: 'Control Tower', description: 'Cross-domain visibility', icon: <Globe className="w-6 h-6" />, href: '/commercial/control-tower', color: 'bg-teal-500' },
];

export default function AppLauncher() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        <Zap className="w-4 h-4" />
        <span className="hidden md:inline">Apps</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Applications</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {APPS.map((app) => (
                <a
                  key={app.id}
                  href={app.href}
                  className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                >
                  <div className={`w-12 h-12 rounded-xl ${app.color} text-white flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    {app.icon}
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{app.label}</div>
                    <div className="text-xs text-slate-400">{app.description}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
