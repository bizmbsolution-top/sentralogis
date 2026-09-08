import React from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin, Calendar, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';
import { Shipment } from '@/lib/domain/shipment/types';
import { ShipmentStatusBadge } from './ShipmentStatusBadge';

interface ShipmentCardProps {
  shipment: Shipment;
}

export const ShipmentCard: React.FC<ShipmentCardProps> = ({ shipment }) => {
  // Derive operational risk tag from status
  const isCritical = shipment.global_status === 'EXCEPTION_HOLD';
  const isCustomsHold = shipment.global_status === 'CUSTOMS_HOLD';
  const riskLevel = isCritical ? 'CRITICAL' : isCustomsHold ? 'WATCH' : 'NORMAL';

  const riskBadge = {
    NORMAL: {
      label: 'NORMAL',
      icon: ShieldCheck,
      color: 'text-slate-500 bg-slate-50 border-slate-200'
    },
    WATCH: {
      label: 'CUSTOMS HOLD',
      icon: AlertTriangle,
      color: 'text-amber-700 bg-amber-50 border-amber-300'
    },
    CRITICAL: {
      label: 'EXCEPTION',
      icon: AlertTriangle,
      color: 'text-red-700 bg-red-50 border-red-300'
    }
  }[riskLevel];

  const RiskIcon = riskBadge.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all p-5 flex flex-col justify-between">
      <div>
        {/* Header: Number, Status & Risk */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className="text-xs font-mono text-slate-400">SHIPMENT</span>
            <h4 className="text-base font-bold text-slate-900 font-mono tracking-tight">
              {shipment.shipment_number}
            </h4>
          </div>
          <div className="flex items-center gap-1.5">
            <ShipmentStatusBadge status={shipment.global_status} size="sm" />
          </div>
        </div>

        {/* Corridor / Route */}
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3">
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">{shipment.origin_location_id}</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{shipment.destination_location_id}</span>
          </div>
        </div>

        {/* Operational Context Metadata */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>ETA: {shipment.eta ? new Date(shipment.eta).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—'}</span>
          </div>
          <div className="flex items-center justify-end">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium ${riskBadge.color}`}>
              <RiskIcon className="w-3 h-3" />
              {riskBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-mono">
          Ref: {shipment.booking_reference || shipment.work_order_id.substring(0, 8)}
        </span>
        <Link
          href={`/sbu/forwarding/shipments/${shipment.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <span>Open Command Center</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
