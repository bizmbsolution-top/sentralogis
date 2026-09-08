import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Edit3,
  AlertTriangle,
  FileCheck,
  Calendar,
  Globe,
  MapPin,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Shipment, ShipmentGlobalStatus } from '@/lib/domain/shipment/types';
import { ShipmentStatusBadge } from './ShipmentStatusBadge';

interface ShipmentCommandHeaderProps {
  shipment: Shipment;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isEditingPlan: boolean;
  onToggleEditPlan: () => void;
  onRefresh: () => void;
  hasCriticalExceptions?: boolean;
  hasCustoms?: boolean;
}

export const ShipmentCommandHeader: React.FC<ShipmentCommandHeaderProps> = ({
  shipment,
  riskLevel,
  isEditingPlan,
  onToggleEditPlan,
  onRefresh,
  hasCriticalExceptions,
  hasCustoms
}) => {
  const getRiskBadge = () => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-300';
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-300';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'LOW':
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    }
  };

  const isCompleted = shipment.global_status === 'COMPLETED' || shipment.global_status === 'CANCELLED';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/sbu/forwarding/shipments"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
            title="Back to Directory"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider font-mono">
                Forwarding Command Center
              </span>
              <span className="text-slate-300">•</span>
              <ShipmentStatusBadge status={shipment.global_status} />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getRiskBadge()}`}>
                Risk: {riskLevel}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
              {shipment.shipment_number}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Refresh Command Center"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {!isCompleted && (
            <button
              type="button"
              onClick={onToggleEditPlan}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all ${
                isEditingPlan
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingPlan ? 'Close Plan Editor' : 'Edit Execution Plan'}</span>
            </button>
          )}

          {hasCustoms && (
            <Link
              href="/sbu/customs"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
            >
              <FileCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Customs Workspace</span>
            </Link>
          )}
        </div>
      </div>

      {/* Corridor & Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400">Customer Entity</span>
          <div className="font-bold text-slate-900 truncate mt-0.5">{shipment.customer_id}</div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400">Corridor Route</span>
          <div className="font-mono font-bold text-slate-900 mt-0.5 flex items-center gap-1">
            <span className="text-blue-700">{shipment.origin_location_id}</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span className="text-emerald-700">{shipment.destination_location_id}</span>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400">Planned Schedule</span>
          <div className="font-medium text-slate-800 mt-0.5">
            {shipment.eta ? `ETA: ${new Date(shipment.eta).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'ETA: Pending'}
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400">Booking / B/L Reference</span>
          <div className="font-mono text-slate-800 font-semibold truncate mt-0.5">
            {shipment.master_bl_number || shipment.booking_reference || '—'}
          </div>
        </div>
      </div>
    </div>
  );
};
