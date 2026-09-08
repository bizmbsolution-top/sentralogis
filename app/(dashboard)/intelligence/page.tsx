'use client';

import React from 'react';
import {
  BarChart3,
  Ship,
  Truck,
  Shield,
  Warehouse,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface DomainHealth {
  domain: string;
  status: 'healthy' | 'warning' | 'critical';
  metric: string;
  icon: React.ReactNode;
  href: string;
}

interface Risk {
  id: string;
  label: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  href: string;
}

const DOMAIN_HEALTH: DomainHealth[] = [
  { domain: 'Forwarding', status: 'healthy', metric: '12 active shipments', icon: <Ship className="w-5 h-5" />, href: '/operations/forwarding' },
  { domain: 'Trucking', status: 'warning', metric: '3 delayed JOs', icon: <Truck className="w-5 h-5" />, href: '/operations/trucking' },
  { domain: 'Customs', status: 'critical', metric: '1 declaration on hold', icon: <Shield className="w-5 h-5" />, href: '/operations/customs' },
  { domain: 'Warehouse', status: 'healthy', metric: '5 pending tasks', icon: <Warehouse className="w-5 h-5" />, href: '/operations/warehouse' },
];

const RISKS: Risk[] = [
  { id: '1', label: 'Shipment Delay', description: 'SHP-2026-00125 exceeded ETA by 2 days', severity: 'critical', href: '/operations/forwarding/shipments/shp-2026-00125' },
  { id: '2', label: 'Customs Hold', description: 'DECL-001 requires additional documents', severity: 'high', href: '/operations/customs/declarations/decl-001' },
  { id: '3', label: 'SLA Risk', description: '2 trucking JOs approaching SLA', severity: 'medium', href: '/operations/trucking' },
];

export default function ControlTowerDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Control Tower
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Cross-domain operational visibility and exception management
        </p>
      </div>

      {/* Domain Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {DOMAIN_HEALTH.map((dh) => (
          <Link
            key={dh.domain}
            href={dh.href}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-slate-500 dark:text-slate-400">{dh.icon}</span>
              <span className={`w-2 h-2 rounded-full ${dh.status === 'healthy' ? 'bg-green-500' : dh.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} />
            </div>
            <div className="text-sm font-medium text-slate-900 dark:text-white">{dh.domain}</div>
            <div className="text-xs text-slate-500">{dh.metric}</div>
          </Link>
        ))}
      </div>

      {/* Risks */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Active Risks
        </h2>
        <div className="space-y-2">
          {RISKS.map((risk) => (
            <Link
              key={risk.id}
              href={risk.href}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className={`w-2 h-2 rounded-full ${risk.severity === 'critical' ? 'bg-red-500' : risk.severity === 'high' ? 'bg-amber-500' : 'bg-blue-500'}`} />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">{risk.label}</div>
                <div className="text-xs text-slate-500">{risk.description}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
