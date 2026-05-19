'use client';

import { Card } from '@/components/ui/Card';
import { Receipt, Construction } from 'lucide-react';

export default function ForwardingAddCostPage() {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cost Management</h1>
        <p className="text-slate-500 text-sm mt-1">Record Forwarding Operational Costs</p>
      </div>

      <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-20 w-20 bg-orange-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Receipt size={36} className="text-orange-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
            Cost Management in Development
          </h2>
          <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
            The operational cost entry module for SBU Forwarding is currently under construction. 
            This will handle ocean freight payments, THC, documentation fees, and port charges.
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
