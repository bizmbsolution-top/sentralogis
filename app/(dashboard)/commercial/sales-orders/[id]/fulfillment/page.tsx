'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Layers,
  Ship,
  Truck,
  FileText,
  Building2,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

interface SalesOrderDetail {
  id: string;
  soNumber: string;
  status: string;
  engagementId: string;
  targetFulfillmentDate: string;
}

interface CapabilityOption {
  type: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const CAPABILITY_OPTIONS: CapabilityOption[] = [
  { type: 'FORWARDING', label: 'Forwarding', icon: <Ship className="w-5 h-5" />, description: 'Sea freight, FCL/LCL, consolidation' },
  { type: 'CUSTOMS', label: 'Customs Clearance', icon: <FileText className="w-5 h-5" />, description: 'Import/export customs documentation' },
  { type: 'TRUCKING', label: 'Trucking', icon: <Truck className="w-5 h-5" />, description: 'Land transportation, pickup/delivery' },
  { type: 'WAREHOUSE', label: 'Warehouse', icon: <Building2 className="w-5 h-5" />, description: 'Storage, picking, repacking' },
];

export default function CreateFulfillmentPage() {
  const params = useParams();
  const router = useRouter();
  const salesOrderId = params?.id as string;

  const [salesOrder, setSalesOrder] = useState<SalesOrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [soLoading, setSoLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [targetFulfillmentDate, setTargetFulfillmentDate] = useState('');

  useEffect(() => {
    if (!salesOrderId) return;

    async function fetchSalesOrder() {
      setSoLoading(true);
      try {
        const res = await fetch(`/api/v1/commercial/sales-orders/${salesOrderId}`);
        if (!res.ok) throw new Error('Failed to fetch sales order');
        const json = await res.json();
        setSalesOrder(json.data);
        setTargetFulfillmentDate(json.data.targetFulfillmentDate || '');
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setSoLoading(false);
      }
    }
    fetchSalesOrder();
  }, [salesOrderId]);

  const toggleCapability = (type: string) => {
    setSelectedCapabilities((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedCapabilities.length === 0) {
      setError('Please select at least one capability.');
      return;
    }

    setLoading(true);
    try {
      const allocations = selectedCapabilities.map((capabilityType) => ({
        capabilityType,
        allocatedQuantity: 1,
      }));

      const res = await fetch('/api/v1/commercial/fulfillments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesOrderId,
          targetFulfillmentDate,
          allocations,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to create fulfillment.');
      }

      router.push(`/commercial/sales-orders/${salesOrderId}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (soLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-slate-500">Loading...</span>
      </div>
    );
  }

  if (error && !salesOrder) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Back Navigation */}
      <Link
        href={`/commercial/sales-orders/${salesOrderId}`}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sales Order
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Create Fulfillment
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Compose services for {salesOrder?.soNumber}
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Capability Selection */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Select Capabilities
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Choose which services will be part of this fulfillment.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CAPABILITY_OPTIONS.map((cap) => {
              const isSelected = selectedCapabilities.includes(cap.type);
              return (
                <button
                  key={cap.type}
                  type="button"
                  onClick={() => toggleCapability(cap.type)}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {cap.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                        {cap.label}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cap.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Date */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Fulfillment Target
          </h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Target Fulfillment Date
            </label>
            <input
              type="date"
              value={targetFulfillmentDate}
              onChange={(e) => setTargetFulfillmentDate(e.target.value)}
              className="w-full md:w-64 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/commercial/sales-orders/${salesOrderId}`}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || selectedCapabilities.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
            Create Fulfillment
          </button>
        </div>
      </form>
    </div>
  );
}
