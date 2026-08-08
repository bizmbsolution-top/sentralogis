'use client';

import React from 'react';
import { Truck, Activity } from 'lucide-react';

export interface VehicleInfo {
  id: string;
  plateNumber: string;
  fleetType: string;
  gpsSource?: 'EasyGo' | 'PWA' | 'Android' | 'None';
  engineStatus?: 'ON' | 'OFF' | 'UNKNOWN';
  lastSpeed?: number;
}

export interface VehicleCardProps {
  vehicle: VehicleInfo | null;
}

export default function VehicleCard({ vehicle }: VehicleCardProps) {
  if (!vehicle) {
    return (
      <div className="flex items-center justify-center p-6 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-500">
        <Truck className="w-5 h-5 mr-2 opacity-50" />
        <span className="text-sm font-medium">No vehicle assigned</span>
      </div>
    );
  }

  const getGpsSourceColor = (source?: string) => {
    switch (source) {
      case 'EasyGo': return 'bg-indigo-100 text-indigo-700';
      case 'PWA': return 'bg-blue-100 text-blue-700';
      case 'Android': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  const getEngineColor = (status?: string) => {
    switch (status) {
      case 'ON': return 'bg-emerald-500';
      case 'OFF': return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="flex items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 gap-4">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
        <Truck className="w-6 h-6" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-slate-900 font-mono tracking-wider">{vehicle.plateNumber}</h4>
          {vehicle.gpsSource && vehicle.gpsSource !== 'None' && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getGpsSourceColor(vehicle.gpsSource)}`}>
              {vehicle.gpsSource}
            </span>
          )}
        </div>
        <div className="flex items-center text-slate-500 text-xs mt-1 gap-3">
          <span className="font-medium text-slate-700">{vehicle.fleetType}</span>
          {vehicle.lastSpeed !== undefined && (
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-blue-500" />
              <span>{vehicle.lastSpeed} km/h</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col items-end justify-center">
        <div className="flex items-center gap-1.5" title={`Engine: ${vehicle.engineStatus || 'UNKNOWN'}`}>
          <span className="text-[10px] text-slate-500 font-medium">Engine</span>
          <div className={`w-2.5 h-2.5 rounded-full ${getEngineColor(vehicle.engineStatus)} ring-2 ring-white shadow-sm`} />
        </div>
      </div>
    </div>
  );
}
