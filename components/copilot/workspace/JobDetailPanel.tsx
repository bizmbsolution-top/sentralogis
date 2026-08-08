'use client';

import React from 'react';
import { Pin, X, ArrowRight, Map } from 'lucide-react';
import DriverCard, { DriverInfo } from './DriverCard';
import VehicleCard, { VehicleInfo } from './VehicleCard';
import CustomerCard, { CustomerInfo } from './CustomerCard';

export interface JobDetail {
  id: string;
  jobOrderNumber: string;
  status: string;
  customerName: string;
  origin: string;
  destination: string;
  sbu: string;
  createdAt: string;
  driver?: DriverInfo;
  vehicle?: VehicleInfo;
  customer?: CustomerInfo;
}

export interface JobDetailPanelProps {
  job: JobDetail | null;
  onUnpin: () => void;
}

export default function JobDetailPanel({ job, onUnpin }: JobDetailPanelProps) {
  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white/50 backdrop-blur-sm border border-dashed border-slate-300 rounded-2xl h-full min-h-[300px]">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
          <Pin className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700">No Job Pinned</h3>
        <p className="text-slate-500 text-sm mt-2 text-center max-w-sm">
          Select a job from the inbox or request a job from the AI Copilot to see details here.
        </p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const s = status.toUpperCase();
    if (s.includes('DONE') || s.includes('COMPLETED')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s.includes('ACTIVE') || s.includes('TRANSIT')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (s.includes('PENDING') || s.includes('WAITING')) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-lg overflow-hidden flex flex-col h-full">
      <div className="bg-gradient-to-r from-slate-50 to-white p-4 border-b border-slate-200 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-indigo-900">{job.jobOrderNumber}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(job.status)}`}>
              {job.status}
            </span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">
              {job.sbu}
            </span>
          </div>
          <button 
            onClick={onUnpin}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2 flex-1 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
            <Map className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-slate-700 truncate">{job.origin}</span>
            <ArrowRight className="w-4 h-4 text-slate-400 mx-1 shrink-0" />
            <span className="font-medium text-slate-700 truncate">{job.destination}</span>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-medium px-1">
          Customer: <span className="text-slate-700">{job.customerName}</span>
        </div>
      </div>
      
      <div className="p-4 bg-slate-50/50 flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">Driver</span>
            <DriverCard driver={job.driver || null} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">Vehicle</span>
            <VehicleCard vehicle={job.vehicle || null} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider pl-1">Customer</span>
            <CustomerCard customer={job.customer || null} />
          </div>
        </div>
      </div>
    </div>
  );
}
