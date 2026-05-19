'use client';

import { Card } from '@/components/ui/Card';
import { PackageSearch, Construction } from 'lucide-react';

export default function WarehouseFinancesPage() {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Warehouse Finances</h1>
        <p className="text-slate-500 text-sm mt-1">SBU Warehouse Financial & Profitability Dashboard</p>
      </div>

      <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <PackageSearch size={36} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
            Warehouse Module in Development
          </h2>
          <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
            The comprehensive financial dashboard for SBU Warehouse is currently under construction. 
            This module will handle storage billing, handling costs, and inventory metrics.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <span className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-xl flex items-center gap-2">
              <Construction size={14} /> Coming Soon
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
