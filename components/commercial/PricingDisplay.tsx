'use client';

import React, { useState } from 'react';
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Info,
  ArrowRight
} from 'lucide-react';

interface PricingDisplayProps {
  capabilityType: string;
  serviceDescription: string;
  quantity: number;
  uom: string;
  currency: string;
  calculatedRate: number;
  rateSource?: string;
  rateVersion?: number;
  effectivePeriod?: { from: string; to: string | null };
  onRequestOverride?: () => void;
  overrideEnabled?: boolean;
}

export default function PricingDisplay({
  capabilityType,
  serviceDescription,
  quantity,
  uom,
  currency,
  calculatedRate,
  rateSource,
  rateVersion,
  effectivePeriod,
  onRequestOverride,
  overrideEnabled = false,
}: PricingDisplayProps) {
  const calculatedAmount = quantity * calculatedRate;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-3">
        <Calculator className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider">Pricing</span>
      </div>

      <div className="space-y-3">
        {/* Rate Source */}
        {rateSource && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-3 h-3" />
            <span>Rate: {rateSource} {rateVersion ? `(v${rateVersion})` : ''}</span>
          </div>
        )}

        {/* Effective Period */}
        {effectivePeriod && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="w-3 h-3" />
            <span>Effective: {effectivePeriod.from} → {effectivePeriod.to || 'open-ended'}</span>
          </div>
        )}

        {/* Calculation */}
        <div className="flex items-center justify-between py-2 border-t border-slate-200 dark:border-slate-700">
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {quantity} {uom} × {currency} {calculatedRate.toLocaleString()}
          </span>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {currency} {calculatedAmount.toLocaleString()}
          </span>
        </div>

        {/* Override Action */}
        {overrideEnabled && onRequestOverride && (
          <button
            onClick={onRequestOverride}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Request Price Override
          </button>
        )}
      </div>
    </div>
  );
}
