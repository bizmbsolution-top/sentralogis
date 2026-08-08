import React from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Bell, Truck, AlertCircle, Users, Activity, RefreshCw } from 'lucide-react';
import SentraBotIndicator from './sentrabot/SentraBotIndicator';
import SentraBotStatus from './sentrabot/SentraBotStatus';

export default function CopilotHeader() {
  const { profile } = useAuth();
  
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
      <div className="flex items-center gap-4 mb-4 md:mb-0">
        <SentraBotIndicator />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Good Morning, {profile?.full_name || 'Operator'}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-500">{profile?.tenants?.name || 'SentraForge Tenant'} • {profile?.role || 'Dispatcher'}</p>
            <div className="w-px h-3 bg-slate-300"></div>
            <SentraBotStatus />
            <button className="ml-1 text-slate-400 hover:text-slate-600 transition-colors" title="Refresh Context">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-md border border-slate-100">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span className="font-medium text-slate-700">3 Alerts</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-md border border-slate-100">
          <Activity className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-slate-700">12 Jobs Today</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-md border border-slate-100">
          <Truck className="w-4 h-4 text-indigo-500" />
          <span className="font-medium text-slate-700">24 Active</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-md border border-slate-100">
          <Users className="w-4 h-4 text-emerald-500" />
          <span className="font-medium text-slate-700">18 Online</span>
        </div>
      </div>
    </div>
  );
}
