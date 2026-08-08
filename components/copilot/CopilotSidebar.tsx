import React from 'react';
import { Activity, Clock, ShieldCheck } from 'lucide-react';

export default function CopilotSidebar() {
  return (
    <div className="w-80 bg-slate-50 border-l border-slate-200 hidden lg:flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-slate-200 bg-white">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Context Panel
        </h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Execution History */}
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recent Executions</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3 h-3" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">Driver Budi Assigned</p>
                <p className="text-[10px] text-slate-500">WO-2309-112 • 2m ago</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3 h-3" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">Container TGHU123 Updated</p>
                <p className="text-[10px] text-slate-500">WO-2309-108 • 15m ago</p>
              </div>
            </div>
          </div>
        </section>

        <hr className="border-slate-200" />

        {/* Active Entities */}
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Active Context</h3>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Focusing on</p>
            <p className="text-sm font-semibold text-slate-800">No active entities</p>
          </div>
        </section>
      </div>
    </div>
  );
}
