'use client';

import React from 'react';
import { Clock, Navigation, AlertTriangle, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export interface SituationData {
  situation: string;
  phase: string;
  delayDuration?: string;
  eta: string;
  gpsStatus: 'Live' | 'Stale' | 'Offline';
  gpsTime: string;
  aiConfidence: number;
  operationalRisk: 'Low' | 'Medium' | 'High' | 'Critical';
}

interface SituationCardProps {
  data: SituationData;
}

export default function SituationCard({ data }: SituationCardProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'High':
      case 'Critical': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      default: return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'Low': return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'Medium': return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'High':
      case 'Critical': return <AlertCircle className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const getGpsColor = (status: string) => {
    switch (status) {
      case 'Live': return 'text-emerald-400';
      case 'Stale': return 'text-amber-400';
      case 'Offline': return 'text-rose-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 backdrop-blur-md shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{data.situation}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Phase: {data.phase}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${getRiskColor(data.operationalRisk)}`}>
          {getRiskIcon(data.operationalRisk)}
          {data.operationalRisk} Risk
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/30">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Clock className="w-3.5 h-3.5" />
            ETA / Delay
          </div>
          <div className="text-sm font-medium text-slate-200">
            {data.eta}
          </div>
          {data.delayDuration && (
            <div className="text-xs text-rose-400 mt-0.5 font-medium">
              +{data.delayDuration} delay
            </div>
          )}
        </div>

        <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/30">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Navigation className="w-3.5 h-3.5" />
            GPS Status
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              {data.gpsStatus === 'Live' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                data.gpsStatus === 'Live' ? 'bg-emerald-500' :
                data.gpsStatus === 'Stale' ? 'bg-amber-500' : 'bg-rose-500'
              }`}></span>
            </span>
            <span className={`text-sm font-medium ${getGpsColor(data.gpsStatus)}`}>
              {data.gpsStatus}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {data.gpsTime}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-slate-400">AI Confidence</span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: `${data.aiConfidence}%` }}
            />
          </div>
          <span className="text-indigo-300 font-medium">{data.aiConfidence}%</span>
        </div>
      </div>
    </div>
  );
}
