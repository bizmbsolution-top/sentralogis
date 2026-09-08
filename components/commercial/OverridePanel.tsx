'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  Calculator,
  ArrowRight
} from 'lucide-react';

interface OverridePanelProps {
  calculatedPrice: number;
  currency: string;
  threshold: number;
  onApplyOverride: (overridePrice: number, reason: string) => void;
  onCancel: () => void;
}

export default function OverridePanel({
  calculatedPrice,
  currency,
  threshold,
  onApplyOverride,
  onCancel,
}: OverridePanelProps) {
  const [overridePrice, setOverridePrice] = useState(calculatedPrice);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const delta = overridePrice - calculatedPrice;
  const deltaPercent = calculatedPrice > 0 ? (delta / calculatedPrice) * 100 : 0;
  const requiresApproval = Math.abs(deltaPercent) > threshold;

  const handleSubmit = () => {
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a reason (minimum 5 characters).');
      return;
    }
    onApplyOverride(overridePrice, reason.trim());
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-wider">Price Override</span>
        </div>
        <button onClick={onCancel} className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30">
          <X className="w-4 h-4 text-amber-600" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Calculated Price */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600 dark:text-slate-300">Calculated Price:</span>
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {currency} {calculatedPrice.toLocaleString()}
          </span>
        </div>

        {/* Override Price */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Override Price
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={overridePrice}
            onChange={(e) => setOverridePrice(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-amber-200 dark:border-amber-800 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Variance */}
        <div className="flex items-center justify-between py-2 border-t border-amber-200 dark:border-amber-800">
          <span className="text-sm text-slate-600 dark:text-slate-300">Variance:</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {delta >= 0 ? '+' : ''}{currency} {delta.toLocaleString()} ({deltaPercent.toFixed(1)}%)
            </span>
            {requiresApproval && <AlertTriangle className="w-3 h-3 text-amber-500" />}
          </div>
        </div>

        {/* Approval Notice */}
        {requiresApproval && (
          <div className="flex items-center gap-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-3 h-3" />
            <span>Override exceeds {threshold}% threshold — approval required.</span>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Reason (required)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Explain why this override is necessary..."
            className="w-full px-3 py-2 border border-amber-200 dark:border-amber-800 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600">
            <AlertTriangle className="w-3 h-3" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            Submit Override
          </button>
        </div>
      </div>
    </div>
  );
}
