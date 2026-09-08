import React from 'react';
import { Box, Container, Layers, Car, Trash2, Weight } from 'lucide-react';
import { CreateUnitDTO } from '@/lib/domain/shipment/types';

interface PolymorphicUnitCardProps {
  unit: CreateUnitDTO;
  index: number;
  onRemove?: (index: number) => void;
}

export const PolymorphicUnitCard: React.FC<PolymorphicUnitCardProps> = ({
  unit,
  index,
  onRemove
}) => {
  const getUnitHeader = () => {
    switch (unit.unit_type) {
      case 'CONTAINER':
        return {
          label: 'CONTAINER (FCL)',
          icon: Container,
          title: unit.container_number || unit.unit_identifier || `Container #${index + 1}`,
          color: 'text-blue-700 bg-blue-50 border-blue-200'
        };
      case 'BULK_MT':
        return {
          label: 'BULK CARGO',
          icon: Layers,
          title: `${unit.bulk_type || 'Dry Bulk'} (${unit.metric_tonnage} MT)`,
          color: 'text-amber-700 bg-amber-50 border-amber-200'
        };
      case 'VEHICLE':
        return {
          label: 'VEHICLE (CBU)',
          icon: Car,
          title: `${unit.vehicle_model || 'Vehicle'} (VIN: ${unit.vin_number || unit.unit_identifier})`,
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
        };
      case 'PALLET':
      case 'BOX':
      case 'BREAKBULK':
      default:
        return {
          label: `PACKAGE (${unit.unit_type})`,
          icon: Box,
          title: `${unit.package_type || 'Packages'} (${unit.colli_count} Colli)`,
          color: 'text-purple-700 bg-purple-50 border-purple-200'
        };
    }
  };

  const header = getUnitHeader();
  const Icon = header.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${header.color}`}>
            <Icon className="w-3.5 h-3.5" />
            <span>{header.label}</span>
          </span>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
              title="Remove Unit"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <h4 className="text-sm font-bold text-slate-900 font-mono tracking-tight mb-2">
          {header.title}
        </h4>

        {/* Dynamic Detail Attributes */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
          {unit.unit_type === 'CONTAINER' && (
            <>
              <div>ISO: <span className="font-mono text-slate-800">{unit.iso_type || '20GP'}</span></div>
              <div>Seal: <span className="font-mono text-slate-800">{unit.seal_number || '—'}</span></div>
              <div>Tare: <span className="font-mono text-slate-800">{unit.tare_weight_kg ? `${unit.tare_weight_kg} kg` : '—'}</span></div>
              <div className="flex items-center gap-1">
                <Weight className="w-3 h-3 text-slate-400" />
                <span>Gross: {unit.total_gross_weight_kg.toLocaleString()} kg</span>
              </div>
            </>
          )}

          {unit.unit_type === 'BULK_MT' && (
            <>
              <div>Tonnage: <span className="font-mono text-slate-800">{unit.metric_tonnage} MT</span></div>
              <div>Moisture: <span className="font-mono text-slate-800">{unit.moisture_percentage ? `${unit.moisture_percentage}%` : '—'}</span></div>
              <div className="col-span-2">Surveyor: <span className="text-slate-800">{unit.surveyor_report_number || 'Standard Inspection'}</span></div>
            </>
          )}

          {unit.unit_type === 'VEHICLE' && (
            <>
              <div>Model: <span className="font-mono text-slate-800">{unit.vehicle_model}</span></div>
              <div>Color: <span className="text-slate-800">{unit.color || 'White'}</span></div>
              <div>Drivable: <span className="text-emerald-700">{unit.is_drivable !== false ? 'Yes' : 'No'}</span></div>
              <div>Weight: <span className="font-mono text-slate-800">{unit.total_gross_weight_kg} kg</span></div>
            </>
          )}

          {(unit.unit_type === 'PALLET' || unit.unit_type === 'BOX' || unit.unit_type === 'BREAKBULK') && (
            <>
              <div>Colli: <span className="font-mono text-slate-800">{unit.colli_count}</span></div>
              <div>Type: <span className="text-slate-800">{unit.package_type}</span></div>
              <div>Stackable: <span className="text-slate-800">{unit.is_stackable ? 'Yes' : 'No'}</span></div>
              <div>Weight: <span className="font-mono text-slate-800">{unit.total_gross_weight_kg} kg</span></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
