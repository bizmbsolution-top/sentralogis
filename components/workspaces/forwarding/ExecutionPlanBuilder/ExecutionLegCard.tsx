import React from 'react';
import {
  Truck,
  Ship,
  Plane,
  Train,
  FileCheck,
  Warehouse,
  ArrowRight,
  MapPin,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ShieldCheck
} from 'lucide-react';
import { ExecutionLeg, TransportMode, ShipmentUnit } from '@/lib/domain/shipment/types';

interface ExecutionLegCardProps {
  leg: ExecutionLeg;
  index: number;
  totalLegs: number;
  allocatedUnits?: ShipmentUnit[];
  onEdit: (leg: ExecutionLeg) => void;
  onDelete: (legId: string) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}

export const ExecutionLegCard: React.FC<ExecutionLegCardProps> = ({
  leg,
  index,
  totalLegs,
  allocatedUnits = [],
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown
}) => {
  const getModeMeta = (mode: TransportMode) => {
    switch (mode) {
      case 'ROAD_TRUCK':
        return { icon: Truck, label: 'ROAD TRUCK', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' };
      case 'OCEAN_VESSEL':
      case 'BARGE':
        return { icon: Ship, label: mode === 'BARGE' ? 'BARGE (TONGKANG)' : 'OCEAN VESSEL', color: 'text-blue-700 bg-blue-50 border-blue-300' };
      case 'AIR_FREIGHT':
        return { icon: Plane, label: 'AIR FREIGHT', color: 'text-sky-700 bg-sky-50 border-sky-300' };
      case 'RAIL_FREIGHT':
        return { icon: Train, label: 'RAIL FREIGHT', color: 'text-amber-700 bg-amber-50 border-amber-300' };
      case 'CUSTOMS_CLEARANCE':
        return { icon: FileCheck, label: 'CUSTOMS (PPJK)', color: 'text-rose-700 bg-rose-50 border-rose-300' };
      case 'WAREHOUSE_STAGING':
        return { icon: Warehouse, label: 'WAREHOUSE STAGING', color: 'text-purple-700 bg-purple-50 border-purple-300' };
      case 'PORT_TERMINAL_HANDLING':
        return { icon: Warehouse, label: 'PORT TERMINAL HANDLING', color: 'text-indigo-700 bg-indigo-50 border-indigo-300' };
      default:
        return { icon: ArrowRight, label: mode, color: 'text-slate-700 bg-slate-50 border-slate-300' };
    }
  };

  const modeMeta = getModeMeta(leg.transport_mode);
  const ModeIcon = modeMeta.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        {/* Header: Leg Sequence, Code, Mode & Quick Reorder */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono text-xs font-extrabold flex items-center justify-center">
              {leg.leg_sequence}
            </span>
            <div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${modeMeta.color}`}>
                <ModeIcon className="w-3.5 h-3.5" />
                <span>{modeMeta.label}</span>
              </span>
              <span className="text-xs font-mono text-slate-400 ml-2">{leg.leg_code}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onMoveUp && index > 0 && (
              <button
                type="button"
                onClick={() => onMoveUp(index)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                title="Move Up in Sequence"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
            {onMoveDown && index < totalLegs - 1 && (
              <button
                type="button"
                onClick={() => onMoveDown(index)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                title="Move Down in Sequence"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit(leg)}
              className="p-1 text-blue-600 hover:text-blue-700 rounded ml-1"
              title="Edit Leg"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(leg.id)}
              className="p-1 text-slate-400 hover:text-red-600 rounded"
              title="Delete Leg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Air Freight Transport Identity */}
        {leg.transport_mode === 'AIR_FREIGHT' && (leg.aircraft_name || leg.flight_number) && (
          <div className="flex items-center gap-3 text-xs font-bold text-slate-900 bg-sky-50 p-3 rounded-xl border border-sky-200 mb-3">
            <Plane className="w-4 h-4 text-sky-600 shrink-0" />
            <div className="min-w-0">
              {leg.aircraft_name && (
                <div className="truncate">{leg.aircraft_name}</div>
              )}
              {leg.flight_number && (
                <div className="font-mono text-sky-700">{leg.flight_number}</div>
              )}
            </div>
          </div>
        )}

        {/* Corridor Route Box */}
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">{leg.origin_location_id}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">{leg.destination_location_id}</span>
          </div>
        </div>

        {/* Schedule & Operational Meta */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3 font-medium">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {leg.planned_start_at ? new Date(leg.planned_start_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Depart: TBA'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {leg.planned_end_at ? new Date(leg.planned_end_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Arrive: TBA'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Allocated Units & Provider Handoff */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>{allocatedUnits.length} Cargo Unit{allocatedUnits.length !== 1 ? 's' : ''} Assigned</span>
        </div>

        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium font-mono">
          <ShieldCheck className="w-3 h-3 text-slate-500" />
          {leg.execution_provider_type === 'INTERNAL_SBU' ? 'Internal SBU' : 'Partner Vendor'}
        </span>
      </div>
    </div>
  );
};
