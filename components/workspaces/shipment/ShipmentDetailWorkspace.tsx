'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Ship, MapPin, Calendar, Container, Package, Clock,
  CheckCircle2, Clock8, Globe, FileText, UserPlus, RefreshCw,
  Loader2, AlertCircle, XCircle, Users, Banknote, Layers
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { fetchShipmentById } from '@/lib/api/forwarding-shipments';
import { ShipmentStatusBadge } from '@/components/workspaces/forwarding/ShipmentStatusBadge';
import { ExecutionHealthBar } from '@/components/control-tower/ExecutionHealthBar';
import { ExceptionsPanel } from '@/components/control-tower/ExceptionsPanel';
import type { ShipmentAggregate, ShipmentException, ExecutionLeg, ShipmentUnit, Milestone } from '@/lib/domain/shipment/types';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Layers },
  { id: 'plan', label: 'Execution Plan', icon: MapPin },
  { id: 'units', label: 'Units / Containers', icon: Container },
  { id: 'exceptions', label: 'Exceptions', icon: AlertCircle },
  { id: 'timeline', label: 'Timeline', icon: Clock },
] as const;

type TabId = typeof TABS[number]['id'];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft', PLANNED: 'Planned', BOOKED: 'Booked',
  IN_TRANSIT: 'In Transit', AT_INTERMEDIATE_NODE: 'At Hub',
  CUSTOMS_HOLD: 'Customs Hold', CUSTOMS_RELEASED: 'Customs Cleared',
  OUT_FOR_DELIVERY: 'Out For Delivery', DELIVERED: 'Delivered',
  COMPLETED: 'Completed', EXCEPTION_HOLD: 'Exception Hold', CANCELLED: 'Cancelled',
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function ShipmentDetailWorkspace() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = params?.id as string;

  const [shipment, setShipment] = useState<ShipmentAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [resolving, setResolving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!shipmentId) return;
    setLoading(true);
    setError(null);
    try {
      const aggregate = await fetchShipmentById(shipmentId);
      setShipment(aggregate);
    } catch (err: any) {
      setError(err.message || 'Failed to load shipment');
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResolveException = async (exceptionId: string) => {
    setResolving(true);
    try {
      const res = await fetch(`/api/v1/forwarding/shipments/${shipmentId}/exceptions/${exceptionId}`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to resolve exception');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve exception');
    } finally {
      setResolving(false);
    }
  };

  const unresolvedExceptions = shipment?.exceptions.filter((e) => !e.is_resolved) ?? [];
  const criticalCount = unresolvedExceptions.filter((e) => e.severity === 'CRITICAL' || e.severity === 'HIGH').length;

  const renderOverview = () => {
    if (!shipment) return null;
    const { shipment: s, milestones } = shipment;

    return (
      <div className="space-y-6">
        {/* Route & Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Route</span>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {s.origin_location_id} → {s.destination_location_id}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">ETD / ETA</span>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {formatDate(s.etd)} → {formatDate(s.eta)}
            </p>
            {s.actual_departure_at && (
              <p className="text-xs text-slate-400 mt-1">
                Departed: {formatDateTime(s.actual_departure_at)}
              </p>
            )}
            {s.actual_delivery_at && (
              <p className="text-xs text-slate-400 mt-0.5">
                Delivered: {formatDateTime(s.actual_delivery_at)}
              </p>
            )}
          </div>
        </div>

        {/* BL / Booking / Customer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">BL / Booking</span>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              MBL: {s.master_bl_number || '-'} | HBL: {s.house_bl_number || '-'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Booking: {s.booking_reference || '-'}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Parties</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Customer / Shipper / Consignee</p>
            <div className="text-xs text-slate-400">
              Customer ID: {s.customer_id}
              {s.shipper_id && <span className="block">Shipper: {s.shipper_id}</span>}
              {s.consignee_id && <span className="block">Consignee: {s.consignee_id}</span>}
            </div>
          </div>
        </div>

        {/* Milestones Summary */}
        {milestones && milestones.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Milestones</h3>
            <div className="space-y-2">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{m.milestone_label}</div>
                    <div className="text-xs text-slate-500">{formatDateTime(m.occurred_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exceptions Summary */}
        {unresolvedExceptions.length > 0 && (
          <ExceptionsPanel exceptions={unresolvedExceptions.map((e) => ({
            exceptionId: e.id,
            severity: e.severity as 'CRITICAL' | 'WARNING',
            category: 'OPERATIONAL_FAILURE',
            affectedDomain: 'FORWARDING',
            affectedHandoffId: e.id,
            failureCode: e.exception_type,
            message: e.description,
            recommendedAction: 'Inspect and take corrective action.',
            occurredAt: e.created_at,
          }))} />
        )}
      </div>
    );
  };

  const renderExecutionPlan = () => {
    if (!shipment) return null;
    const { execution_legs } = shipment;

    if (execution_legs.length === 0) {
      return (
        <div className="text-center py-12 text-slate-400">
          <MapPin className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No execution plan defined for this shipment.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {execution_legs.map((leg, index) => (
          <div key={leg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                {index + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {leg.transport_mode}: {leg.origin_location_id} → {leg.destination_location_id}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Planned: {formatDateTime(leg.planned_start_at)} → {formatDateTime(leg.planned_end_at)}
                </div>
              </div>
              <ShipmentStatusBadge status={leg.status} size="sm" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderUnits = () => {
    if (!shipment) return null;
    const { units } = shipment;

    if (units.length === 0) {
      return (
        <div className="text-center py-12 text-slate-400">
          <Container className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No units/containers registered for this shipment.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {units.map((unit) => {
          const c = unit as any;
          const unitLabel = c.container_number || c.unit_type || 'Unit';
          return (
            <div key={c.id || unit.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Container className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-slate-900 dark:text-white font-mono">
                  {unitLabel}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                {c.iso_type && <div>ISO Type: {c.iso_type}</div>}
                {c.seal_number && <div>Seal: {c.seal_number}</div>}
                {c.tare_weight_kg && <div>Tare: {c.tare_weight_kg} kg</div>}
                {c.max_payload_kg && <div>Max Payload: {c.max_payload_kg} kg</div>}
                {c.package_type && <div>Pkg Type: {c.package_type}</div>}
                {c.package_quantity && <div>Packages: {c.package_quantity}</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderExceptions = () => {
    if (!shipment) return null;
    const { exceptions } = shipment;

    if (exceptions.length === 0) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center shadow-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No exceptions logged.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {exceptions.map((exc) => (
          <div key={exc.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded-full ${
                  exc.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-600' :
                  exc.severity === 'HIGH' ? 'bg-amber-100 text-amber-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {exc.severity === 'CRITICAL' ? <XCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      {exc.exception_type}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      exc.is_resolved
                        ? 'bg-emerald-100 text-emerald-700'
                        : exc.severity === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {exc.severity}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                    {exc.description}
                  </p>
                  <div className="text-xs text-slate-500 mt-1">
                    Created: {formatDateTime(exc.created_at)}
                  </div>
                </div>
              </div>

              {!exc.is_resolved && (
                <button
                  onClick={() => handleResolveException(exc.id)}
                  disabled={resolving}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {resolving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Resolve
                </button>
              )}

              {exc.is_resolved && (
                <span className="text-xs text-emerald-600 font-medium">
                  Resolved {exc.resolved_at ? formatDateTime(exc.resolved_at) : ''}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTimeline = () => {
    if (!shipment) return null;
    const { shipment: s, milestones, exceptions, execution_legs } = shipment;

    const timeline: Array<{
      label: string;
      timestamp: string | null;
      status: 'completed' | 'current' | 'pending';
      icon: React.ReactNode;
    }> = [
      {
        label: 'Shipment Created',
        timestamp: s.created_at,
        status: 'completed',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      },
      {
        label: 'First Execution Leg Planned',
        timestamp: execution_legs.find((l) => l.planned_start_at)?.planned_start_at ?? null,
        status: execution_legs.some((l) => l.status === 'IN_PROGRESS' || l.status === 'COMPLETED') ? 'completed' : 'pending',
        icon: <Globe className="w-4 h-4 text-blue-500" />,
      },
    ];

    milestones.forEach((m) => {
      timeline.push({
        label: m.milestone_label,
        timestamp: m.occurred_at,
        status: 'completed',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });
    });

    exceptions.filter((e) => !e.is_resolved).forEach((e) => {
      timeline.push({
        label: `Exception: ${e.exception_type}`,
        timestamp: e.created_at,
        status: 'current',
        icon: <AlertCircle className="w-4 h-4 text-rose-500" />,
      });
    });

    timeline.push({
      label: 'Shipment Delivered',
      timestamp: s.actual_delivery_at ?? null,
      status: s.actual_delivery_at ? 'completed' : 'pending',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    });

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Event Timeline</h3>
        <div className="space-y-0">
          {timeline.map((item, i) => (
            <div key={i} className="flex items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
              <div className="mt-0.5">{item.icon}</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {item.timestamp ? formatDateTime(item.timestamp) : '—'}
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                item.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700'
                  : item.status === 'current'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {item.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTab = (tab: TabId) => {
    switch (tab) {
      case 'overview': return renderOverview();
      case 'plan': return renderExecutionPlan();
      case 'units': return renderUnits();
      case 'exceptions': return renderExceptions();
      case 'timeline': return renderTimeline();
      default: return renderOverview();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-slate-500">Loading shipment...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <span className="text-sm text-amber-700 dark:text-amber-300">Shipment not found.</span>
        </div>
      </div>
    );
  }

  const { shipment: s } = shipment;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back Navigation */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Ship className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                  {s.shipment_number}
                </h1>
                {criticalCount > 0 && (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                    {criticalCount} CRITICAL
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {s.customer_id}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <ShipmentStatusBadge status={s.global_status} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Execution Health Bar (read-only summary) */}
      <ExecutionHealthBar
        status={s.global_status === 'COMPLETED' || s.global_status === 'DELIVERED' ? 'FULFILLED' :
                 s.global_status === 'CANCELLED' ? 'CLOSED' :
                 (criticalCount > 0 ? 'AT_RISK' : 'EXECUTING')}
        progress={{
          committedRevenue: 0,
          currency: 'IDR',
          totalPlannedQuantity: shipment.units.length,
          totalDeliveredQuantity: shipment.milestones.filter((m) =>
            m.milestone_code?.toLowerCase().includes('deliver') || m.milestone_code?.toLowerCase().includes('complet')
          ).length,
          totalRemainingQuantity: 0,
          completionPercentage: s.actual_delivery_at ? 100 :
            shipment.execution_legs.some((l) => l.status === 'COMPLETED' || l.status === 'DELIVERED')
              ? 50 : s.global_status === 'IN_TRANSIT' ? 30 : 10,
        }}
      />

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <div className="border-b border-slate-100 dark:border-slate-800">
          <nav className="flex overflow-x-auto" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'exceptions' && unresolvedExceptions.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] rounded-full">
                    {unresolvedExceptions.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 md:p-6">
          {renderTab(activeTab)}
        </div>
      </div>
    </div>
  );
}
