'use client';

import { Card } from '@/components/ui/Card';
import { Save, MapPin, Wrench, Wallet, Clock } from 'lucide-react';

export default function TenantTruckingConfigPage() {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trucking Configurations</h1>
          <p className="text-slate-500 text-sm mt-1">Operational parameters & policies for SBU Trucking</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
          <Save size={16} /> Save Policies
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Petty Cash & Finances */}
        <Card className="p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <Wallet size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Travel Allowance (Uang Jalan)</h2>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Calculation Method</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none">
                <option>Fixed Rate per Route (Master Data)</option>
                <option>Real Cost + Tolerance Percentage</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Max Tolerance Leakage (%)</label>
              <input type="number" defaultValue={5} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none" />
              <p className="text-[11px] text-slate-400 mt-1">Maximum allowed discrepancy in driver's expense report.</p>
            </div>
          </div>
        </Card>

        {/* Maintenance & Safety */}
        <Card className="p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
              <Wrench size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Fleet Maintenance Rules</h2>
          </div>
          
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Oil Change Alert (KM)</label>
                <input type="number" defaultValue={10000} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tire Check Alert (KM)</label>
                <input type="number" defaultValue={15000} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none" />
              </div>
            </div>
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                <span className="text-sm font-medium text-slate-700">Auto-ground fleet if document expires in &lt; 7 days</span>
              </label>
            </div>
          </div>
        </Card>

        {/* Geofencing & GPS */}
        <Card className="p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <MapPin size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Geofencing & Tracking</h2>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Arrival Radius (Meters)</label>
              <input type="number" defaultValue={500} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none" />
              <p className="text-[11px] text-slate-400 mt-1">Distance from coordinates to trigger "Arrived at Customer" status.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">GPS Ping Frequency (Seconds)</label>
              <select defaultValue="Every 30 seconds (Balanced)" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none">
                <option>Every 10 seconds (High Accuracy, High Battery)</option>
                <option>Every 30 seconds (Balanced)</option>
                <option>Every 60 seconds (Battery Saver)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Operational SLA */}
        <Card className="p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Clock size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Operational SLA</h2>
          </div>
          
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Max Loading Time</label>
                <div className="flex items-center gap-2">
                  <input type="number" defaultValue={2} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none" />
                  <span className="text-sm font-medium text-slate-600">Hours</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Max Unloading Time</label>
                <div className="flex items-center gap-2">
                  <input type="number" defaultValue={2} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none" />
                  <span className="text-sm font-medium text-slate-600">Hours</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">Exceeding these SLAs will automatically flag the Job Order for Demurrage / Detention claims.</p>
          </div>
        </Card>

      </div>
    </div>
  );
}
