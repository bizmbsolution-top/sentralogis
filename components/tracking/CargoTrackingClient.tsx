'use client';

import React, { useState } from 'react';
import { Package, Ship, Anchor, CheckCircle2, Clock, ShieldCheck, MapPin, Search, ChevronRight } from 'lucide-react';

interface CargoStatus {
  status: string;
  location: string;
  timestamp: string;
  description: string;
  isCompleted: boolean;
}

export default function CargoTrackingClient({ cargoData, isForwarderView = false }: { cargoData: any, isForwarderView?: boolean }) {
  // Logic: Map technical status to User-Friendly status
  const statusMap: Record<string, any> = {
    'planning': { label: 'Order Confirmed', icon: Package, publicDesc: 'Your cargo is scheduled for consolidation.' },
    'received': { label: 'Received at WH', icon: MapPin, publicDesc: 'Cargo has arrived at our warehouse facility.' },
    'stuffing': { label: 'Preparing Export', icon: Box, publicDesc: 'Cargo is being secured for international transit.' },
    'departed': { label: 'In Transit (Sea)', icon: Ship, publicDesc: 'Vessel has departed from Port of Loading.' },
    'arrived': { label: 'At Destination', icon: Anchor, publicDesc: 'Vessel has arrived at Port of Discharge.' },
    'closed': { label: 'Delivered', icon: CheckCircle2, publicDesc: 'Cargo has been released and delivered.' }
  };

  const milestones: CargoStatus[] = [
    { status: 'Received at WH', location: 'Jakarta CFS', timestamp: '2024-04-20 10:00', description: 'Cargo scanned and measured.', isCompleted: true },
    { status: 'Preparing Export', location: 'Jakarta CFS', timestamp: '2024-04-21 14:00', description: 'Secured inside container.', isCompleted: true },
    { status: 'In Transit (Sea)', location: 'Java Sea', timestamp: '2024-04-22 08:00', description: 'Vessel departed.', isCompleted: false },
    { status: 'At Destination', location: 'Singapore Port', timestamp: '-', description: 'Estimate Arrival 25 Apr.', isCompleted: false },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header: Identity & Security */}
        <div className="flex flex-col md:flex-row justify-between gap-8 border-b border-white/10 pb-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
               <ShieldCheck className="w-3 h-3 text-blue-400" />
               <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Secure Shipment Tracking</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter">
              {cargoData?.sku || 'CARGO-991283'}
            </h1>
            <p className="text-white/40 text-sm font-medium tracking-wide max-w-md">
              Tracking inheritance from Consolidation Container <span className="text-white/20">#HIDDEN_FOR_PRIVACY</span>
            </p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-6">
             <div className="text-right">
                <span className="text-[10px] font-bold text-white/30 block uppercase tracking-widest mb-1">Current Status</span>
                <span className="text-xl font-bold text-blue-400 uppercase italic">On Vessel (Transit)</span>
             </div>
             <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <Ship className="w-6 h-6" />
             </div>
          </div>
        </div>

        {/* Visibility Difference Area */}
        {isForwarderView && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6 mb-8">
             <div className="flex items-center gap-3 mb-4">
               <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
               <h3 className="text-xs font-bold tracking-widest text-purple-400 italic font-mono uppercase">Internal Forwarder View</h3>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Container No.</p>
                  <p className="text-xs font-mono font-bold">EMCU-1299381</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Seal No.</p>
                  <p className="text-xs font-mono font-bold">SN-991223</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Vessel</p>
                  <p className="text-xs font-bold">EVERGREEN PROMPT</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Actual CBM</p>
                  <p className="text-xs font-bold">4.25 CBM</p>
                </div>
             </div>
          </div>
        )}

        {/* Milestone Timeline */}
        <div className="relative space-y-12 pl-8">
          <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-blue-500 via-blue-500/20 to-transparent"></div>
          
          {milestones.map((milestone, idx) => (
            <div key={idx} className={`relative transition-all duration-700 ${milestone.isCompleted ? 'opacity-100' : 'opacity-30'}`}>
              <div className={`absolute -left-[31px] top-1 w-8 h-8 rounded-full border-4 border-[#050505] flex items-center justify-center ${milestone.isCompleted ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`}>
                {milestone.isCompleted ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Clock className="w-4 h-4 text-white/40" />}
              </div>
              
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 group">
                <div className="space-y-1">
                  <h3 className={`text-lg font-bold tracking-tight ${milestone.isCompleted ? 'text-white' : 'text-white/40'}`}>
                    {milestone.status}
                  </h3>
                  <p className="text-xs text-white/40 font-medium">
                    {milestone.description}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-[10px] font-mono font-bold text-white/20 uppercase tracking-[0.2em]">{milestone.location}</p>
                  <p className="text-xs font-bold text-white/60">{milestone.timestamp}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Bar */}
        <div className="pt-12 flex flex-col md:flex-row gap-4">
           <button className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded-xl py-4 flex items-center justify-center gap-3 text-sm font-bold tracking-widest uppercase">
              Download Manifest Receipt
              <ChevronRight className="w-4 h-4" />
           </button>
           <button className="flex-1 bg-blue-600 hover:bg-blue-700 transition-all rounded-xl py-4 flex items-center justify-center gap-3 text-sm font-bold tracking-widest uppercase shadow-xl shadow-blue-500/20">
              Contact Support Agent
           </button>
        </div>

      </div>
    </div>
  );
}

const Box = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
  </svg>
);
