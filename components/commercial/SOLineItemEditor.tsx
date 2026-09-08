'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Calculator
} from 'lucide-react';

interface SOLineItem {
  id?: string;
  capabilityType: string;
  serviceDescription: string;
  quantity: number;
  uom: string;
  currency: string;
  unitRate: number;
  calculatedAmount: number;
  overrideRate?: number;
  overrideReason?: string;
  isCommitted: boolean;
}

interface SOLineItemEditorProps {
  items: SOLineItem[];
  onChange: (items: SOLineItem[]) => void;
  readonly?: boolean;
  currency?: string;
}

const CAPABILITY_TYPES = ['FORWARDING', 'CUSTOMS', 'TRUCKING', 'WAREHOUSE'];
const UOM_OPTIONS = ['CONTAINER', 'CBM', 'KG', 'PALLET', 'TRIP', 'SHIPMENT', 'DOCUMENT', 'UNIT'];

export default function SOLineItemEditor({ items, onChange, readonly = false, currency = 'USD' }: SOLineItemEditorProps) {
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    const newItem: SOLineItem = {
      capabilityType: 'FORWARDING',
      serviceDescription: '',
      quantity: 1,
      uom: 'CONTAINER',
      currency: currency,
      unitRate: 0,
      calculatedAmount: 0,
      isCommitted: false,
    };
    onChange([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof SOLineItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'unitRate') {
      updated[index].calculatedAmount = updated[index].quantity * updated[index].unitRate;
    }

    onChange(updated);
  };

  const removeItem = (index: number) => {
    if (items[index].isCommitted) {
      setError('Cannot remove committed line item.');
      return;
    }
    onChange(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.calculatedAmount, 0);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        <div className="col-span-2">Capability</div>
        <div className="col-span-3">Description</div>
        <div className="col-span-1">Qty</div>
        <div className="col-span-1">UOM</div>
        <div className="col-span-2">Unit Rate</div>
        <div className="col-span-2">Amount</div>
        <div className="col-span-1"></div>
      </div>

      {/* Items */}
      {items.map((item, index) => (
        <div
          key={index}
          className={`grid grid-cols-12 gap-2 px-3 py-2 rounded-lg border ${
            item.isCommitted
              ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className="col-span-2">
            {item.isCommitted ? (
              <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                <Lock className="w-3 h-3" />
                {item.capabilityType}
              </div>
            ) : (
              <select
                value={item.capabilityType}
                onChange={(e) => updateItem(index, 'capabilityType', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                disabled={readonly}
              >
                {CAPABILITY_TYPES.map((cap) => (
                  <option key={cap} value={cap}>{cap}</option>
                ))}
              </select>
            )}
          </div>
          <div className="col-span-3">
            {item.isCommitted ? (
              <span className="text-sm text-slate-600 dark:text-slate-300">{item.serviceDescription}</span>
            ) : (
              <input
                type="text"
                value={item.serviceDescription}
                onChange={(e) => updateItem(index, 'serviceDescription', e.target.value)}
                placeholder="Service description..."
                className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400"
                disabled={readonly}
              />
            )}
          </div>
          <div className="col-span-1">
            {item.isCommitted ? (
              <span className="text-sm text-slate-600 dark:text-slate-300">{item.quantity}</span>
            ) : (
              <input
                type="number"
                min="0"
                step="1"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                disabled={readonly}
              />
            )}
          </div>
          <div className="col-span-1">
            {item.isCommitted ? (
              <span className="text-sm text-slate-600 dark:text-slate-300">{item.uom}</span>
            ) : (
              <select
                value={item.uom}
                onChange={(e) => updateItem(index, 'uom', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                disabled={readonly}
              >
                {UOM_OPTIONS.map((uom) => (
                  <option key={uom} value={uom}>{uom}</option>
                ))}
              </select>
            )}
          </div>
          <div className="col-span-2">
            {item.isCommitted ? (
              <span className="text-sm text-slate-600 dark:text-slate-300">{item.currency} {item.unitRate.toLocaleString()}</span>
            ) : (
              <input
                type="number"
                min="0"
                step="0.01"
                value={item.unitRate}
                onChange={(e) => updateItem(index, 'unitRate', parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                disabled={readonly}
              />
            )}
          </div>
          <div className="col-span-2 flex items-center">
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              {item.currency} {item.calculatedAmount.toLocaleString()}
            </span>
          </div>
          <div className="col-span-1 flex items-center justify-end">
            {!item.isCommitted && !readonly && (
              <button
                onClick={() => removeItem(index)}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {item.isCommitted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          </div>
        </div>
      ))}

      {/* Add Item */}
      {!readonly && (
        <button
          onClick={addItem}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Line Item
        </button>
      )}

      {/* Total */}
      <div className="flex items-center justify-end gap-4 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <span className="text-sm font-medium text-slate-500">Total:</span>
        <span className="text-lg font-bold text-slate-900 dark:text-white">
          {currency} {totalAmount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
