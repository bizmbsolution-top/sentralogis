'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Shipment,
  ShipmentGlobalStatus
} from '@/lib/domain/shipment/types';
import { fetchShipments } from '@/lib/api/forwarding-shipments';
import { ShipmentStatusBadge } from '@/components/workspaces/forwarding/ShipmentStatusBadge';
import { ShipmentCard } from '@/components/workspaces/forwarding/ShipmentCard';
import {
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Calendar,
  Globe,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function ForwardingShipmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters from URL state or local state
  const statusParam = (searchParams.get('status') as ShipmentGlobalStatus) || 'ALL';
  const searchParam = searchParams.get('q') || '';

  const [selectedStatus, setSelectedStatus] = useState<string>(statusParam);
  const [searchQuery, setSearchQuery] = useState<string>(searchParam);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchShipments({
        status: selectedStatus !== 'ALL' ? (selectedStatus as ShipmentGlobalStatus) : undefined,
        limit: 100
      });
      setShipments(res.data || []);
    } catch (err: any) {
      console.error('Failed to load shipments:', err);
      setError(err.message || 'Shipment data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update URL search params cleanly
  const handleFilterChange = (status: string) => {
    setSelectedStatus(status);
    const params = new URLSearchParams(window.location.search);
    if (status && status !== 'ALL') {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    router.replace(`/sbu/forwarding/shipments?${params.toString()}`);
  };

  // Client-side search filtering across cached shipments
  const filteredShipments = useMemo(() => {
    if (!searchQuery.trim()) return shipments;
    const q = searchQuery.toLowerCase();
    return shipments.filter(
      s =>
        s.shipment_number.toLowerCase().includes(q) ||
        s.origin_location_id.toLowerCase().includes(q) ||
        s.destination_location_id.toLowerCase().includes(q) ||
        (s.booking_reference && s.booking_reference.toLowerCase().includes(q))
    );
  }, [shipments, searchQuery]);

  // Dynamic KPI Aggregations derived from canonical shipment records
  const metrics = useMemo(() => {
    const total = shipments.length;
    const active = shipments.filter(s => s.global_status !== 'COMPLETED' && s.global_status !== 'CANCELLED').length;
    const inTransit = shipments.filter(s => s.global_status === 'IN_TRANSIT' || s.global_status === 'OUT_FOR_DELIVERY').length;
    const customsHold = shipments.filter(s => s.global_status === 'CUSTOMS_HOLD').length;
    const atRisk = shipments.filter(s => s.global_status === 'EXCEPTION_HOLD' || s.global_status === 'CUSTOMS_HOLD').length;
    const completed = shipments.filter(s => s.global_status === 'COMPLETED' || s.global_status === 'DELIVERED').length;

    return { total, active, inTransit, customsHold, atRisk, completed };
  }, [shipments]);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* -------------------------------------------------------------------- */}
      {/* 1. HEADER SECTION */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Globe className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Forwarding & Multi-Modal Journey Orchestrator
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Shipment Command Center
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Monitor, orchestrate, and trace canonical multi-modal logistics shipments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/sbu/forwarding/shipments/create"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Shipment</span>
          </Link>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 2. KPI / COMMAND STRIP */}
      {/* -------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'ALL SHIPMENTS', count: metrics.total, key: 'ALL', color: 'border-slate-200 text-slate-900' },
          { label: 'ACTIVE', count: metrics.active, key: 'IN_TRANSIT', color: 'border-blue-200 text-blue-700 bg-blue-50/50' },
          { label: 'IN TRANSIT', count: metrics.inTransit, key: 'IN_TRANSIT', color: 'border-emerald-200 text-emerald-700 bg-emerald-50/50' },
          { label: 'CUSTOMS HOLD', count: metrics.customsHold, key: 'CUSTOMS_HOLD', color: 'border-amber-200 text-amber-700 bg-amber-50/50' },
          { label: 'AT RISK / EXCEPTION', count: metrics.atRisk, key: 'EXCEPTION_HOLD', color: 'border-rose-200 text-rose-700 bg-rose-50/50' },
          { label: 'COMPLETED', count: metrics.completed, key: 'COMPLETED', color: 'border-slate-200 text-slate-700' }
        ].map(kpi => {
          const isSelected = selectedStatus === kpi.key;
          return (
            <button
              key={kpi.label}
              onClick={() => handleFilterChange(kpi.key)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                  : 'bg-white hover:bg-slate-50 border-slate-200'
              }`}
            >
              <div className={`text-[11px] font-bold uppercase tracking-wider ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                {kpi.label}
              </div>
              <div className={`text-2xl font-extrabold mt-1 font-mono ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                {kpi.count}
              </div>
            </button>
          );
        })}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 3. COMMAND FILTER BAR */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search shipment number, origin, destination..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter Status:</span>
          </div>
          <select
            value={selectedStatus}
            onChange={e => handleFilterChange(e.target.value)}
            className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PLANNED">PLANNED</option>
            <option value="BOOKED">BOOKED</option>
            <option value="IN_TRANSIT">IN TRANSIT</option>
            <option value="CUSTOMS_HOLD">CUSTOMS HOLD</option>
            <option value="CUSTOMS_RELEASED">CUSTOMS CLEARED</option>
            <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="EXCEPTION_HOLD">EXCEPTION HOLD</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 4. SHIPMENTS DIRECTORY / LIST VIEW */}
      {/* -------------------------------------------------------------------- */}
      {loading ? (
        /* Skeleton Loading State */
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse p-4 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-40 bg-slate-200 rounded"></div>
                <div className="h-3 w-64 bg-slate-100 rounded"></div>
              </div>
              <div className="h-8 w-24 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-red-900">Shipment data could not be loaded</h3>
          <p className="text-xs text-red-600 mt-1 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredShipments.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto shadow-sm">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No shipments found</h3>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            {searchQuery
              ? `No shipments matching "${searchQuery}". Try adjusting your search query or filters.`
              : 'There are no active shipments for your organization yet.'}
          </p>
          <Link
            href="/sbu/forwarding/shipments/create"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Shipment</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop Table View (>= 1024px) */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Shipment</th>
                    <th className="py-3.5 px-4">Corridor / Route</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Risk</th>
                    <th className="py-3.5 px-4">ETA</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShipments.map(s => {
                    const isCritical = s.global_status === 'EXCEPTION_HOLD';
                    const isCustomsHold = s.global_status === 'CUSTOMS_HOLD';
                    const riskLevel = isCritical ? 'CRITICAL' : isCustomsHold ? 'WATCH' : 'NORMAL';

                    const riskConfig = {
                      NORMAL: { label: 'NORMAL', icon: ShieldCheck, color: 'text-slate-500 bg-slate-50 border-slate-200' },
                      WATCH: { label: 'CUSTOMS HOLD', icon: AlertTriangle, color: 'text-amber-700 bg-amber-50 border-amber-300' },
                      CRITICAL: { label: 'EXCEPTION', icon: AlertTriangle, color: 'text-red-700 bg-red-50 border-red-300' }
                    }[riskLevel];

                    const RiskIcon = riskConfig.icon;

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900 font-mono text-sm tracking-tight">
                            {s.shipment_number}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Ref: {s.booking_reference || s.work_order_id.substring(0, 8)}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-blue-600" />
                              {s.origin_location_id}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                              {s.destination_location_id}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <ShipmentStatusBadge status={s.global_status} size="sm" />
                        </td>

                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium ${riskConfig.color}`}>
                            <RiskIcon className="w-3 h-3" />
                            {riskConfig.label}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {s.eta ? new Date(s.eta).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-right">
                          <Link
                            href={`/sbu/forwarding/shipments/${s.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <span>Open</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile / Tablet Cards View (< 1024px) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3">
            {filteredShipments.map(s => (
              <ShipmentCard key={s.id} shipment={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
