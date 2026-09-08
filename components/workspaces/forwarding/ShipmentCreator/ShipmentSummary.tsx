import React from 'react';
import { ArrowRight, MapPin, Box, Truck, ShieldCheck, AlertCircle } from 'lucide-react';
import { CreateUnitDTO, CreateExecutionLegDTO } from '@/lib/domain/shipment/types';

interface ShipmentSummaryProps {
  formData: any;
  units: CreateUnitDTO[];
  legs: CreateExecutionLegDTO[];
  services: string[];
}

export const ShipmentSummary: React.FC<ShipmentSummaryProps> = ({
  formData,
  units,
  legs,
  services
}) => {
  const totalWeight = units.reduce((acc, u) => acc + (Number(u.total_gross_weight_kg) || 0), 0);
  const isReady = Boolean(formData.customer_name && formData.origin_location_id && formData.destination_location_id && units.length > 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5 sticky top-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Live Operational Summary
        </span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
          isReady ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'
        }`}>
          {isReady ? <ShieldCheck className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          <span>{isReady ? 'READY TO CREATE' : 'DRAFT INCOMPLETE'}</span>
        </span>
      </div>

      {/* Customer & Corridor */}
      <div className="space-y-2">
        <div className="text-xs text-slate-400 font-mono">CUSTOMER</div>
        <div className="text-sm font-bold text-slate-900 tracking-tight">
          {formData.customer_name || <span className="text-slate-400 font-normal italic">Customer not selected</span>}
        </div>

        <div className="pt-2">
          <div className="text-xs text-slate-400 font-mono mb-1">CORRIDOR</div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">{formData.origin_location_id || 'ORIGIN'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{formData.destination_location_id || 'DESTINATION'}</span>
          </div>
        </div>
      </div>

      {/* Cargo Payload Summary */}
      <div className="space-y-1.5 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>CARGO PAYLOAD</span>
          <span className="text-slate-800 font-bold">{units.length} Unit{units.length !== 1 ? 's' : ''}</span>
        </div>

        {units.length > 0 ? (
          <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
            <div className="flex items-center justify-between">
              <span>Gross Weight:</span>
              <span className="font-mono text-slate-800 font-semibold">{totalWeight.toLocaleString()} kg</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Unit Types:</span>
              <span className="font-mono text-slate-800">
                {Array.from(new Set(units.map(u => u.unit_type))).join(', ')}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">No units configured yet.</div>
        )}
      </div>

      {/* Multi-Modal Journey Summary */}
      <div className="space-y-1.5 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>EXECUTION LEGS</span>
          <span className="text-slate-800 font-bold">{legs.length} Leg{legs.length !== 1 ? 's' : ''}</span>
        </div>

        {legs.length > 0 ? (
          <div className="flex flex-wrap gap-1 text-[11px] font-mono font-bold">
            {legs.map((leg, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 border border-slate-200">
                {leg.transport_mode.split('_')[0]}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">No legs configured.</div>
        )}
      </div>

      {/* Operational Service Contracts */}
      <div className="space-y-1.5 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>SERVICE CONTRACTS</span>
          <span className="text-slate-800 font-bold">{services.length} Selected</span>
        </div>

        {services.length > 0 ? (
          <div className="flex flex-wrap gap-1 text-[11px] font-mono">
            {services.map(s => (
              <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 font-semibold">
                {s.replace(/TRK_|SEA_|CUS_|WMS_/, '')}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic">None selected.</div>
        )}
      </div>
    </div>
  );
};
