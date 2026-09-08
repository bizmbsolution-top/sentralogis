import React from 'react';
import {
  Truck,
  Ship,
  Plane,
  Train,
  FileCheck,
  Warehouse,
  ArrowRight,
  ArrowDown,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { ExecutionLeg, TransportMode } from '@/lib/domain/shipment/types';

interface ExecutionPlanGraphProps {
  legs: Array<Partial<ExecutionLeg> & { transport_mode: TransportMode }>;
  selectedLegId?: string | null;
  onSelectLeg?: (legId: string | number) => void;
  onRemoveLeg?: (index: number) => void;
  className?: string;
}

export const ExecutionPlanGraph: React.FC<ExecutionPlanGraphProps> = ({
  legs,
  selectedLegId,
  onSelectLeg,
  className = ''
}) => {
  const getModeMeta = (mode: TransportMode) => {
    switch (mode) {
      case 'ROAD_TRUCK':
        return { icon: Truck, label: 'ROAD', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' };
      case 'OCEAN_VESSEL':
      case 'BARGE':
        return { icon: Ship, label: mode === 'BARGE' ? 'BARGE' : 'OCEAN', color: 'text-blue-700 bg-blue-50 border-blue-300' };
      case 'AIR_FREIGHT':
        return { icon: Plane, label: 'AIR', color: 'text-sky-700 bg-sky-50 border-sky-300' };
      case 'RAIL_FREIGHT':
        return { icon: Train, label: 'RAIL', color: 'text-amber-700 bg-amber-50 border-amber-300' };
      case 'CUSTOMS_CLEARANCE':
        return { icon: FileCheck, label: 'CUSTOMS', color: 'text-rose-700 bg-rose-50 border-rose-300' };
      case 'WAREHOUSE_STAGING':
        return { icon: Warehouse, label: 'WAREHOUSE', color: 'text-purple-700 bg-purple-50 border-purple-300' };
      case 'PORT_TERMINAL_HANDLING':
        return { icon: Warehouse, label: 'PORT HANDLING', color: 'text-indigo-700 bg-indigo-50 border-indigo-300' };
      default:
        return { icon: ArrowRight, label: mode, color: 'text-slate-700 bg-slate-50 border-slate-300' };
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return { icon: CheckCircle2, text: 'text-emerald-600', label: 'Done' };
      case 'EXECUTING':
      case 'IN_PROGRESS':
        return { icon: Clock, text: 'text-blue-600 animate-pulse', label: 'In Transit' };
      case 'DISPATCHED':
        return { icon: Clock, text: 'text-amber-600', label: 'Dispatched' };
      case 'CANCELLED':
      case 'BLOCKED':
        return { icon: AlertCircle, text: 'text-red-600', label: 'Blocked' };
      default:
        return { icon: Clock, text: 'text-slate-400', label: 'Planned' };
    }
  };

  if (legs.length === 0) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-500 text-xs font-medium">
        No execution legs configured in journey.
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Visual Directed Journey Graph ({legs.length} Continuous Leg{legs.length > 1 ? 's' : ''})
        </span>
        <span className="text-[11px] text-slate-400 font-mono">
          Click any leg node to inspect / edit
        </span>
      </div>

      {/* Desktop Adaptive Horizontal Graph (>= 768px) */}
      <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-2 pt-1">
        {legs.map((leg, idx) => {
          const modeMeta = getModeMeta(leg.transport_mode);
          const ModeIcon = modeMeta.icon;
          const statusMeta = getStatusBadge(leg.status);
          const StatusIcon = statusMeta.icon;
          const isSelected = selectedLegId === leg.id || selectedLegId === String(idx);

          return (
            <React.Fragment key={leg.id || idx}>
              {/* Interactive Leg Node */}
              <div
                onClick={() => onSelectLeg && onSelectLeg(leg.id || idx)}
                className={`flex-1 min-w-[210px] rounded-xl p-3.5 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-slate-50/80 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                    LEG {leg.leg_sequence || idx + 1}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${modeMeta.color}`}>
                    <ModeIcon className="w-3 h-3" />
                    <span>{modeMeta.label}</span>
                  </span>
                </div>

                <div className="space-y-1 text-xs font-semibold text-slate-900 mb-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{leg.origin_location_id || 'Origin'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{leg.destination_location_id || 'Destination'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono text-[10px]">
                    {leg.execution_provider_type === 'INTERNAL_SBU' ? 'Internal SBU' : 'External Vendor'}
                  </span>
                  <span className={`inline-flex items-center gap-1 font-semibold ${statusMeta.text}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusMeta.label}</span>
                  </span>
                </div>
              </div>

              {/* Edge connector arrow */}
              {idx < legs.length - 1 && (
                <div className="flex items-center justify-center text-slate-300 shrink-0">
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile Vertical Flow (< 768px) */}
      <div className="flex md:hidden flex-col gap-2">
        {legs.map((leg, idx) => {
          const modeMeta = getModeMeta(leg.transport_mode);
          const ModeIcon = modeMeta.icon;
          const statusMeta = getStatusBadge(leg.status);
          const StatusIcon = statusMeta.icon;
          const isSelected = selectedLegId === leg.id || selectedLegId === String(idx);

          return (
            <React.Fragment key={leg.id || idx}>
              <div
                onClick={() => onSelectLeg && onSelectLeg(leg.id || idx)}
                className={`rounded-xl p-3.5 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-slate-50/80 border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                    LEG #{leg.leg_sequence || idx + 1}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${modeMeta.color}`}>
                    <ModeIcon className="w-3 h-3" />
                    <span>{modeMeta.label}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-2">
                  <span>{leg.origin_location_id || 'Origin'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{leg.destination_location_id || 'Destination'}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200">
                  <span className="text-slate-500">{leg.execution_provider_type === 'INTERNAL_SBU' ? 'Internal SBU Contract' : 'Vendor Partner'}</span>
                  <span className={`inline-flex items-center gap-1 font-semibold ${statusMeta.text}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusMeta.label}</span>
                  </span>
                </div>
              </div>

              {idx < legs.length - 1 && (
                <div className="flex justify-center text-slate-300 py-0.5">
                  <ArrowDown className="w-4 h-4" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
