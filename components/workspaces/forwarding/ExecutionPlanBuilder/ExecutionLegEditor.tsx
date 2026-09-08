import React, { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Layers, ShieldCheck, CheckSquare, Square, Plane } from 'lucide-react';
import {
  ExecutionLeg,
  TransportMode,
  ExecutionProviderType,
  ShipmentUnit,
  CreateExecutionLegDTO
} from '@/lib/domain/shipment/types';

interface ExecutionLegEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (legData: CreateExecutionLegDTO, allocatedUnitIds: string[]) => void;
  initialLeg?: ExecutionLeg | null;
  availableUnits: ShipmentUnit[];
  currentAllocatedUnitIds?: string[];
  nextSequence: number;
}

export const ExecutionLegEditor: React.FC<ExecutionLegEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  initialLeg,
  availableUnits,
  currentAllocatedUnitIds = [],
  nextSequence
}) => {
  const [transportMode, setTransportMode] = useState<TransportMode>('ROAD_TRUCK');
  const [legCode, setLegCode] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [providerType, setProviderType] = useState<ExecutionProviderType>('INTERNAL_SBU');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [aircraftName, setAircraftName] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);

  useEffect(() => {
    if (initialLeg) {
      setTransportMode(initialLeg.transport_mode);
      setLegCode(initialLeg.leg_code);
      setOrigin(initialLeg.origin_location_id);
      setDestination(initialLeg.destination_location_id);
      setProviderType(initialLeg.execution_provider_type);
      setPlannedStart(initialLeg.planned_start_at ? initialLeg.planned_start_at.split('T')[0] : '');
      setPlannedEnd(initialLeg.planned_end_at ? initialLeg.planned_end_at.split('T')[0] : '');
      setAircraftName(initialLeg.aircraft_name || '');
      setFlightNumber(initialLeg.flight_number || '');
      setSelectedUnitIds(currentAllocatedUnitIds);
    } else {
      setTransportMode('ROAD_TRUCK');
      setLegCode(`LEG-${String(nextSequence).padStart(2, '0')}-ROAD`);
      setOrigin('');
      setDestination('');
      setProviderType('INTERNAL_SBU');
      setPlannedStart('');
      setPlannedEnd('');
      setAircraftName('');
      setFlightNumber('');
      setSelectedUnitIds(availableUnits.map(u => u.id));
    }
  }, [initialLeg, nextSequence, availableUnits, currentAllocatedUnitIds, isOpen]);

  if (!isOpen) return null;

  const handleToggleUnit = (unitId: string) => {
    setSelectedUnitIds(prev =>
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
  };

  const handleSelectAllUnits = () => {
    if (selectedUnitIds.length === availableUnits.length) {
      setSelectedUnitIds([]);
    } else {
      setSelectedUnitIds(availableUnits.map(u => u.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const legData: CreateExecutionLegDTO = {
      leg_sequence: initialLeg?.leg_sequence || nextSequence,
      leg_code: legCode.trim() || `LEG-${String(nextSequence).padStart(2, '0')}`,
      transport_mode: transportMode,
      execution_provider_type: providerType,
      origin_location_id: origin.trim().toUpperCase(),
      destination_location_id: destination.trim().toUpperCase(),
      planned_start_at: plannedStart ? `${plannedStart}T00:00:00Z` : undefined,
      planned_end_at: plannedEnd ? `${plannedEnd}T00:00:00Z` : undefined,
      aircraft_name: aircraftName.trim() || undefined,
      flight_number: flightNumber.trim() || undefined
    };

    onSave(legData, selectedUnitIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {initialLeg ? `Edit Leg #${initialLeg.leg_sequence} (${initialLeg.leg_code})` : `Add Journey Leg #${nextSequence}`}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure transport mode, corridor nodes, operational provider, and cargo unit allocations.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Transport Mode */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Transport Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={transportMode}
                onChange={e => {
                  const m = e.target.value as TransportMode;
                  setTransportMode(m);
                  if (!initialLeg) {
                    setLegCode(`LEG-${String(nextSequence).padStart(2, '0')}-${m.split('_')[0]}`);
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20"
                required
              >
                <option value="ROAD_TRUCK">ROAD TRUCK (Inland Trucking)</option>
                <option value="OCEAN_VESSEL">OCEAN VESSEL (Main Line)</option>
                <option value="CUSTOMS_CLEARANCE">CUSTOMS CLEARANCE (PPJK)</option>
                <option value="WAREHOUSE_STAGING">WAREHOUSE STAGING</option>
                <option value="PORT_TERMINAL_HANDLING">PORT TERMINAL HANDLING</option>
                <option value="BARGE">BARGE (Tongkang)</option>
                <option value="AIR_FREIGHT">AIR FREIGHT</option>
                <option value="RAIL_FREIGHT">RAIL FREIGHT</option>
              </select>
            </div>

            {/* Leg Code */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Leg Identifier Code
              </label>
              <input
                type="text"
                value={legCode}
                onChange={e => setLegCode(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono uppercase"
                placeholder="e.g. LEG-01-ROAD"
              />
            </div>

            {/* Origin Location */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Origin Node <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono uppercase"
                  placeholder="e.g. CNSHA"
                  required
                />
              </div>
            </div>

            {/* Destination Location */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Destination Node <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono uppercase"
                  placeholder="e.g. IDPTB"
                  required
                />
              </div>
            </div>

            {/* Planned Departure */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Planned Departure
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={plannedStart}
                  onChange={e => setPlannedStart(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>

            {/* Planned Arrival */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Planned Arrival
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={plannedEnd}
                  onChange={e => setPlannedEnd(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>

            {transportMode === 'AIR_FREIGHT' && (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Aircraft Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Plane className="w-3.5 h-3.5 text-sky-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={aircraftName}
                      onChange={e => setAircraftName(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      placeholder="e.g. PK-AIP"
                      required={transportMode === 'AIR_FREIGHT'}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Flight Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Plane className="w-3.5 h-3.5 text-sky-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={flightNumber}
                      onChange={e => setFlightNumber(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-mono uppercase"
                      placeholder="e.g. JT-123"
                      required={transportMode === 'AIR_FREIGHT'}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Execution Provider */}
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Execution Provider Strategy
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setProviderType('INTERNAL_SBU')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 ${
                    providerType === 'INTERNAL_SBU'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Internal SBU Contract</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProviderType('EXTERNAL_VENDOR')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 ${
                    providerType === 'EXTERNAL_VENDOR'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>External Vendor Partner</span>
                </button>
              </div>
            </div>
          </div>

          {/* Unit Allocation Checkboxes */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Cargo Unit Allocation ({selectedUnitIds.length} / {availableUnits.length})</span>
              </div>
              <button
                type="button"
                onClick={handleSelectAllUnits}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
              >
                {selectedUnitIds.length === availableUnits.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {availableUnits.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No cargo units defined in shipment.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-1">
                {availableUnits.map(unit => {
                  const isChecked = selectedUnitIds.includes(unit.id);
                  return (
                    <div
                      key={unit.id}
                      onClick={() => handleToggleUnit(unit.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer text-xs flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <span className="font-mono font-bold">{unit.unit_identifier}</span>
                        <span className="text-[11px] text-slate-400 font-normal">({unit.unit_type})</span>
                      </div>
                      <span className="text-[11px] font-mono font-normal text-slate-500">
                        {unit.total_gross_weight_kg.toLocaleString()} kg
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
            >
              Save Leg Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
