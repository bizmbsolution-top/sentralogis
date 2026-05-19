'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Truck, Package, Ship, ShieldAlert, Settings2, Save, Activity } from 'lucide-react';

export default function TenantSBUConfigPage() {
  const [sbuStatus, setSbuStatus] = useState({
    trucking: true,
    warehouse: false,
    forwarding: false,
    clearance: false
  });

  const handleToggle = (sbu: keyof typeof sbuStatus) => {
    setSbuStatus(prev => ({ ...prev, [sbu]: !prev[sbu] }));
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SBU Configuration</h1>
          <p className="text-slate-500 text-sm mt-1">Tenant-level Strategic Business Unit Control Panel</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
          <Save size={16} /> Save Configurations
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Module Activation Panel */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity size={20} className="text-blue-600"/> Active Modules (Switchboard)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Trucking */}
            <Card className={`p-5 border-2 transition-all ${sbuStatus.trucking ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 opacity-60'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${sbuStatus.trucking ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Truck size={24} />
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={sbuStatus.trucking} onChange={() => handleToggle('trucking')} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <h3 className="font-bold text-slate-900">SBU Trucking</h3>
              <p className="text-xs text-slate-500 mt-1">Land freight & fleet management.</p>
            </Card>

            {/* Warehouse */}
            <Card className={`p-5 border-2 transition-all ${sbuStatus.warehouse ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-200 opacity-60'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${sbuStatus.warehouse ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Package size={24} />
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={sbuStatus.warehouse} onChange={() => handleToggle('warehouse')} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              <h3 className="font-bold text-slate-900">SBU Warehouse</h3>
              <p className="text-xs text-slate-500 mt-1">Inventory & storage solutions.</p>
            </Card>

            {/* Forwarding */}
            <Card className={`p-5 border-2 transition-all ${sbuStatus.forwarding ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 opacity-60'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${sbuStatus.forwarding ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Ship size={24} />
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={sbuStatus.forwarding} onChange={() => handleToggle('forwarding')} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <h3 className="font-bold text-slate-900">SBU Forwarding</h3>
              <p className="text-xs text-slate-500 mt-1">Ocean and Air freight forwarding.</p>
            </Card>

            {/* Clearance */}
            <Card className={`p-5 border-2 transition-all ${sbuStatus.clearance ? 'border-red-500 bg-red-50/30' : 'border-slate-200 opacity-60'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${sbuStatus.clearance ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                  <ShieldAlert size={24} />
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={sbuStatus.clearance} onChange={() => handleToggle('clearance')} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
              <h3 className="font-bold text-slate-900">SBU Clearance</h3>
              <p className="text-xs text-slate-500 mt-1">Customs & PPJK clearance.</p>
            </Card>

          </div>
        </div>

        {/* Global Settings Panel */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Settings2 size={20} className="text-slate-600"/> Global Parameters
          </h2>
          <Card className="p-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Inter-SBU Handover</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none">
                <option>Strict (Require Manual Approval)</option>
                <option>Auto-Approve (Trust Internal)</option>
              </select>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Token Allocation Strategy</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none">
                <option>Shared Pool (All SBUs)</option>
                <option>Strict Quota per SBU</option>
              </select>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Default Tax Rate (%)</label>
              <input type="number" defaultValue={11} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none" />
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
