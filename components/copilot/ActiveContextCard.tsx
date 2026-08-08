import React from 'react';
import { Target, X, MapPin } from 'lucide-react';
import ConfidenceBadge from './ConfidenceBadge';

export default function ActiveContextCard() {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" /> Active Context
        </h3>
        <button className="text-slate-400 hover:text-slate-600" title="Clear Context">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      
      <div className="bg-white border border-emerald-200 shadow-sm rounded-lg overflow-hidden">
        <div className="bg-emerald-50 p-2 border-b border-emerald-100 flex justify-between items-center">
          <span className="font-bold text-emerald-900 text-sm">JO-223</span>
          <ConfidenceBadge score={0.98} />
        </div>
        <div className="p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Customer</span>
            <span className="font-medium text-slate-900">PT Maju Mundur</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Driver</span>
            <span className="font-medium text-slate-900">Budi Santoso</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Vehicle</span>
            <span className="font-medium text-slate-900">B 9123 CD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status</span>
            <span className="font-medium text-blue-600 bg-blue-50 px-1.5 rounded">IN TRANSIT</span>
          </div>
          
          <hr className="border-slate-100 my-2" />
          
          <div className="flex items-center gap-1 text-slate-500 mt-2">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">Tj. Priok → Cikarang Dry Port</span>
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-slate-400">
            <span>ETA: 14:30</span>
            <span>Last GPS: 2m ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
