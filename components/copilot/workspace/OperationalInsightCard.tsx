'use client';

import React from 'react';
import { Lightbulb, TrendingUp, Target, Crosshair } from 'lucide-react';

export interface InsightData {
  detectedSituation: string;
  operationalReason: string;
  businessImpact: string;
  recommendedStrategy: string;
}

interface OperationalInsightCardProps {
  data: InsightData;
}

export default function OperationalInsightCard({ data }: OperationalInsightCardProps) {
  return (
    <div className="bg-gradient-to-br from-indigo-900/40 to-violet-900/20 border border-indigo-500/30 rounded-xl p-4 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-indigo-100">Operational Insight</h3>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-indigo-300/70 font-semibold mb-0.5">Detected Situation</div>
          <p className="text-sm text-slate-200">{data.detectedSituation}</p>
        </div>
        
        <div className="bg-black/20 rounded-lg p-2.5 border border-indigo-500/10">
          <div className="flex items-start gap-2 mb-2">
            <Target className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] uppercase tracking-wider text-rose-300/70 font-semibold mb-0.5">Root Cause</div>
              <p className="text-xs text-slate-300">{data.operationalReason}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] uppercase tracking-wider text-amber-300/70 font-semibold mb-0.5">Business Impact</div>
              <p className="text-xs text-slate-300">{data.businessImpact}</p>
            </div>
          </div>
        </div>

        <div className="pt-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-400/80 font-semibold mb-1">
            <Crosshair className="w-3.5 h-3.5" />
            Recommended Strategy
          </div>
          <p className="text-sm font-medium text-emerald-100/90">{data.recommendedStrategy}</p>
        </div>
      </div>
    </div>
  );
}
