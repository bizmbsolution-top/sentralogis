import React from 'react';
import { Box, Layers } from 'lucide-react';
import { ShipmentUnit } from '@/lib/domain/shipment/types';
import { PolymorphicUnitCard } from './PolymorphicUnitCard';

interface CargoUnitsPanelProps {
  units: ShipmentUnit[];
}

export const CargoUnitsPanel: React.FC<CargoUnitsPanelProps> = ({ units }) => {
  const totalWeight = units.reduce((acc, u) => acc + (Number(u.total_gross_weight_kg) || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Cargo Manifest Payload
          </span>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mt-0.5">
            Polymorphic Handling Units ({units.length})
          </h3>
        </div>
        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
          Total: {totalWeight.toLocaleString()} kg
        </span>
      </div>

      {units.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center text-xs text-slate-400">
          No physical cargo units allocated in this shipment.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {units.map((unit, idx) => (
            <PolymorphicUnitCard key={unit.id || idx} unit={unit as any} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
};
