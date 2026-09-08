import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, ShieldCheck, MapPin, Loader2 } from 'lucide-react';
import { CreateUnitDTO, CreateExecutionLegDTO } from '@/lib/domain/shipment/types';

interface ShipmentReviewProps {
  formData: any;
  units: CreateUnitDTO[];
  legs: CreateExecutionLegDTO[];
  services: string[];
  onSubmit: () => void;
  submitting: boolean;
  error?: string | null;
}

export const ShipmentReview: React.FC<ShipmentReviewProps> = ({
  formData,
  units,
  legs,
  services,
  onSubmit,
  submitting,
  error
}) => {
  // Validation checks
  const hasCustomer = Boolean(formData.customer_name?.trim());
  const hasOrigin = Boolean(formData.origin_location_id?.trim());
  const hasDestination = Boolean(formData.destination_location_id?.trim());
  const hasUnits = units.length > 0;
  const hasLegs = legs.length > 0;

  const isValid = hasCustomer && hasOrigin && hasDestination && hasUnits;

  const totalWeightKg = units.reduce((acc, u) => acc + (Number(u.total_gross_weight_kg) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">05. Review & Finalize Shipment</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Verify operational attributes, cargo items, journey legs, and contractual service handoffs before creation.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Shipment Creation Failed</div>
            <div className="mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {/* Validation Checklist */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
        <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
          Pre-Flight Validation Checklist
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            {hasCustomer ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
            <span className={hasCustomer ? 'text-slate-700 font-medium' : 'text-rose-700 font-semibold'}>
              Customer Entity Specified ({formData.customer_name || 'Missing'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasOrigin && hasDestination ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
            <span className={hasOrigin && hasDestination ? 'text-slate-700 font-medium' : 'text-rose-700 font-semibold'}>
              Corridor Nodes ({formData.origin_location_id || '?'} $\rightarrow$ {formData.destination_location_id || '?'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasUnits ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
            <span className={hasUnits ? 'text-slate-700 font-medium' : 'text-rose-700 font-semibold'}>
              Cargo Payload: {units.length} Unit(s) Defined
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasLegs ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <CheckCircle2 className="w-4 h-4 text-blue-600" />}
            <span className="text-slate-700 font-medium">
              Multi-Modal Journey: {legs.length} Leg(s) Configured
            </span>
          </div>
        </div>
      </div>

      {/* Summary Matrix Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Corridor</span>
          <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
            <span>{formData.origin_location_id || '—'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span>{formData.destination_location_id || '—'}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Incoterm: <span className="font-semibold text-slate-800">{formData.incoterm}</span></div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Cargo Volume</span>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {units.length} Unit{units.length > 1 ? 's' : ''} ({totalWeightKg.toLocaleString()} kg)
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Services: <span className="font-semibold text-slate-800">{services.length} Contract(s)</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Timeline ETA</span>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {formData.eta || 'Pending Schedule'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Ref: <span className="font-mono text-slate-800">{formData.booking_reference || '—'}</span>
          </div>
        </div>
      </div>

      {/* Create CTA Button */}
      <div className="pt-4 flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || submitting}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all text-sm disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Orchestrating Canonical Shipment...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Confirm & Create Canonical Shipment</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
