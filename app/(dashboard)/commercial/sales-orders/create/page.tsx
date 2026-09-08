'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Save,
  Calendar,
  DollarSign,
  FileText,
  Building2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Engagement {
  id: string;
  customerId: string;
  customerName: string;
  status: string;
}

interface CreateSalesOrderInput {
  engagementId: string;
  orderDate: string;
  targetFulfillmentDate: string;
  currency: string;
  totalAgreedRevenue: number;
  paymentTermsDays: number;
  incoterm: string;
  commercialNotes: string;
}

export default function CreateSalesOrderPage() {
  const router = useRouter();
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(false);
  const [engagementsLoading, setEngagementsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateSalesOrderInput>({
    engagementId: '',
    orderDate: new Date().toISOString().split('T')[0],
    targetFulfillmentDate: '',
    currency: 'IDR',
    totalAgreedRevenue: 0,
    paymentTermsDays: 30,
    incoterm: '',
    commercialNotes: '',
  });

  useEffect(() => {
    async function fetchEngagements() {
      setEngagementsLoading(true);
      try {
        const res = await fetch('/api/v1/commercial/work-orders?status=ACTIVE&limit=50');
        if (res.ok) {
          const json = await res.json();
          setEngagements(json.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch engagements:', err);
      } finally {
        setEngagementsLoading(false);
      }
    }
    fetchEngagements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.engagementId) {
      setError('Please select an engagement.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/commercial/sales-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to create sales order.');
      }

      router.push(`/commercial/sales-orders/${json.data.id}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateSalesOrderInput, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Back Navigation */}
      <Link
        href="/commercial/sales-orders"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sales Orders
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Create Sales Order
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Create a new customer order from an existing engagement.
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
          {/* Engagement Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Engagement <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={formData.engagementId}
                onChange={(e) => handleChange('engagementId', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                required
              >
                <option value="">Select an engagement...</option>
                {engagementsLoading ? (
                  <option disabled>Loading engagements...</option>
                ) : engagements.length === 0 ? (
                  <option disabled>No active engagements found</option>
                ) : (
                  engagements.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.customerName || eng.customerId} — {eng.id.slice(0, 8)}
                    </option>
                  ))
                )}
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select the customer engagement this order is for.
            </p>
          </div>

          {/* Order Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Order Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={formData.orderDate}
                onChange={(e) => handleChange('orderDate', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Target Fulfillment Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Target Fulfillment Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={formData.targetFulfillmentDate}
                onChange={(e) => handleChange('targetFulfillmentDate', e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Currency & Revenue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="IDR">IDR — Indonesian Rupiah</option>
                <option value="USD">USD — US Dollar</option>
                <option value="CNY">CNY — Chinese Yuan</option>
                <option value="SGD">SGD — Singapore Dollar</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Total Agreed Revenue
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.totalAgreedRevenue || ''}
                  onChange={(e) => handleChange('totalAgreedRevenue', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Payment Terms (days)
            </label>
            <input
              type="number"
              min="0"
              value={formData.paymentTermsDays}
              onChange={(e) => handleChange('paymentTermsDays', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Incoterm */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Incoterm
            </label>
            <select
              value={formData.incoterm}
              onChange={(e) => handleChange('incoterm', e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select incoterm...</option>
              <option value="FOB">FOB — Free On Board</option>
              <option value="CIF">CIF — Cost, Insurance & Freight</option>
              <option value="CFR">CFR — Cost & Freight</option>
              <option value="EXW">EXW — Ex Works</option>
              <option value="DDP">DDP — Delivered Duty Paid</option>
              <option value="FCA">FCA — Free Carrier</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Commercial Notes
            </label>
            <textarea
              value={formData.commercialNotes}
              onChange={(e) => handleChange('commercialNotes', e.target.value)}
              rows={3}
              placeholder="Any additional notes for this order..."
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/commercial/sales-orders"
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !formData.engagementId}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Create Sales Order
          </button>
        </div>
      </form>
    </div>
  );
}
