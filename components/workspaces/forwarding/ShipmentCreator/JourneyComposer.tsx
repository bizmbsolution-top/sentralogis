import React, { useState } from 'react';
import { Plus, MapPin, Truck } from 'lucide-react';
import { CreateExecutionLegDTO, TransportMode } from '@/lib/domain/shipment/types';
import { ExecutionPlanGraph } from '../ExecutionPlanGraph';

interface JourneyComposerProps {
  legs: CreateExecutionLegDTO[];
  originDefault: string;
  destinationDefault: string;
  onAddLeg: (leg: CreateExecutionLegDTO) => void;
  onRemoveLeg: (index: number) => void;
}

export const JourneyComposer: React.FC<JourneyComposerProps> = ({
  legs,
  originDefault,
  destinationDefault,
  onAddLeg,
  onRemoveLeg
}) => {
  const [transportMode, setTransportMode] = useState<TransportMode>('OCEAN_VESSEL');
  const [origin, setOrigin] = useState(originDefault || 'CNSHA');
  const [destination, setDestination] = useState(destinationDefault || 'IDPTB');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const seq = legs.length + 1;
    const legCode = `LEG-${String(seq).padStart(2, '0')}-${transportMode.split('_')[0]}`;

    onAddLeg({
      leg_sequence: seq,
      leg_code: legCode,
      transport_mode: transportMode,
      origin_location_id: origin.trim().toUpperCase() || 'ORIGIN',
      destination_location_id: destination.trim().toUpperCase() || 'DEST'
    });

    // Auto-advance origin to previous destination for seamless continuous journey
    setOrigin(destination.trim().toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">03. Journey Composer (Multi-Modal Execution Plan)</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Orchestrate the continuous physical journey through arbitrary multi-modal combinations (Ocean $\rightarrow$ Port $\rightarrow$ Customs $\rightarrow$ Road).
        </p>
      </div>

      {/* Visual Journey Graph Preview */}
      <ExecutionPlanGraph legs={legs} onRemoveLeg={onRemoveLeg} />

      {/* Add New Journey Leg Form */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Truck className="w-4 h-4 text-blue-600" />
          <span>Add Journey Leg (Sequence #{legs.length + 1})</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Transport Mode</label>
            <select
              value={transportMode}
              onChange={e => setTransportMode(e.target.value as TransportMode)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-800"
            >
              <option value="OCEAN_VESSEL">OCEAN VESSEL (Main Line)</option>
              <option value="ROAD_TRUCK">ROAD TRUCK (Inland Trucking)</option>
              <option value="CUSTOMS_CLEARANCE">CUSTOMS CLEARANCE (PPJK)</option>
              <option value="WAREHOUSE_STAGING">WAREHOUSE STAGING</option>
              <option value="PORT_TERMINAL_HANDLING">PORT TERMINAL HANDLING</option>
              <option value="BARGE">BARGE (Tongkang)</option>
              <option value="AIR_FREIGHT">AIR FREIGHT</option>
              <option value="RAIL_FREIGHT">RAIL FREIGHT</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Leg Origin</label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                placeholder="e.g. CNSHA"
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Leg Destination</label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="e.g. IDPTB"
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono uppercase"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Leg to Journey</span>
          </button>
        </div>
      </div>
    </div>
  );
};
