import React, { useState } from 'react';
import { Plus, Container, Layers, Box, Car, AlertCircle } from 'lucide-react';
import { CreateUnitDTO } from '@/lib/domain/shipment/types';
import { PolymorphicUnitCard } from '../PolymorphicUnitCard';

interface CargoComposerProps {
  units: CreateUnitDTO[];
  onAddUnit: (unit: CreateUnitDTO) => void;
  onRemoveUnit: (index: number) => void;
}

export const CargoComposer: React.FC<CargoComposerProps> = ({
  units,
  onAddUnit,
  onRemoveUnit
}) => {
  const [activeType, setActiveType] = useState<'CONTAINER' | 'BULK_MT' | 'PACKAGE' | 'VEHICLE'>('CONTAINER');

  // Container Unit State
  const [containerNumber, setContainerNumber] = useState('');
  const [isoType, setIsoType] = useState('40HC');
  const [sealNumber, setSealNumber] = useState('');
  const [containerTare, setContainerTare] = useState(3800);
  const [containerGross, setContainerGross] = useState(28000);

  // Bulk Unit State
  const [bulkType, setBulkType] = useState('Aluminium Ingot');
  const [metricTonnage, setMetricTonnage] = useState(500);
  const [moisture, setMoisture] = useState(0.5);

  // Package Unit State
  const [pkgType, setPkgType] = useState<'PALLET' | 'BOX' | 'BREAKBULK'>('PALLET');
  const [packageDescription, setPackageDescription] = useState('Standard Wood Pallet');
  const [colliCount, setColliCount] = useState(50);
  const [packageGross, setPackageGross] = useState(2500);

  // Vehicle Unit State
  const [vehicleModel, setVehicleModel] = useState('BYD Seal EV');
  const [vinNumber, setVinNumber] = useState('');
  const [vehicleGross, setVehicleGross] = useState(2150);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeType === 'CONTAINER') {
      const num = containerNumber.trim().toUpperCase();
      if (!num) return;
      onAddUnit({
        unit_type: 'CONTAINER',
        unit_identifier: num,
        container_number: num,
        iso_type: isoType,
        seal_number: sealNumber.trim() || undefined,
        tare_weight_kg: Number(containerTare) || 3800,
        total_gross_weight_kg: Number(containerGross) || 28000
      });
      setContainerNumber('');
      setSealNumber('');
    } else if (activeType === 'BULK_MT') {
      const tonnage = Number(metricTonnage) || 100;
      const identifier = bulkType.trim().toUpperCase() || 'BULK_CARGO';
      onAddUnit({
        unit_type: 'BULK_MT',
        unit_identifier: identifier,
        bulk_type: bulkType,
        metric_tonnage: tonnage,
        moisture_percentage: Number(moisture) || 0,
        total_gross_weight_kg: tonnage * 1000
      });
    } else if (activeType === 'PACKAGE') {
      const identifier = packageDescription.trim().toUpperCase() || 'PACKAGED_GOODS';
      onAddUnit({
        unit_type: pkgType,
        unit_identifier: identifier,
        package_type: packageDescription,
        colli_count: Number(colliCount) || 1,
        total_gross_weight_kg: Number(packageGross) || 500,
        is_stackable: true
      });
    } else if (activeType === 'VEHICLE') {
      const vin = vinNumber.trim().toUpperCase();
      if (!vin) return;
      onAddUnit({
        unit_type: 'VEHICLE',
        unit_identifier: vin,
        vin_number: vin,
        vehicle_model: vehicleModel,
        is_drivable: true,
        total_gross_weight_kg: Number(vehicleGross) || 2000
      });
      setVinNumber('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">02. Cargo Composer (Polymorphic Units)</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Sentralogis supports multi-unit payloads: Containers (FCL), Bulk Cargo (MT), Packages (LCL/Pallets), and Vehicles (CBU).
        </p>
      </div>

      {/* Unit Type Tab Selector */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { key: 'CONTAINER', label: 'Container (FCL)', icon: Container, color: 'text-blue-600' },
          { key: 'BULK_MT', label: 'Bulk Cargo (MT)', icon: Layers, color: 'text-amber-600' },
          { key: 'PACKAGE', label: 'Package / LCL', icon: Box, color: 'text-purple-600' },
          { key: 'VEHICLE', label: 'Vehicle / CBU', icon: Car, color: 'text-emerald-600' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeType === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveType(tab.key as any)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Unit Type Editor Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Configure New {activeType.replace('_', ' ')}
        </div>

        {/* CONTAINER FORM */}
        {activeType === 'CONTAINER' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Container Number</label>
              <input
                type="text"
                placeholder="e.g. TEMU-1234567"
                value={containerNumber}
                onChange={e => setContainerNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">ISO / Size Type</label>
              <select
                value={isoType}
                onChange={e => setIsoType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold"
              >
                <option value="20GP">20GP — Standard 20ft</option>
                <option value="40GP">40GP — Standard 40ft</option>
                <option value="40HC">40HC — High Cube 40ft</option>
                <option value="45HC">45HC — High Cube 45ft</option>
                <option value="20RF">20RF — Reefer 20ft</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Seal Number</label>
              <input
                type="text"
                placeholder="e.g. SEAL-8899"
                value={sealNumber}
                onChange={e => setSealNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Tare Weight (kg)</label>
              <input
                type="number"
                value={containerTare}
                onChange={e => setContainerTare(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Total Gross Weight (kg)</label>
              <input
                type="number"
                value={containerGross}
                onChange={e => setContainerGross(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold"
              />
            </div>
          </div>
        )}

        {/* BULK CARGO FORM */}
        {activeType === 'BULK_MT' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Commodity / Bulk Type</label>
              <input
                type="text"
                value={bulkType}
                onChange={e => setBulkType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Metric Tonnage (MT)</label>
              <input
                type="number"
                value={metricTonnage}
                onChange={e => setMetricTonnage(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Moisture (%)</label>
              <input
                type="number"
                step="0.1"
                value={moisture}
                onChange={e => setMoisture(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        )}

        {/* PACKAGE / LCL FORM */}
        {activeType === 'PACKAGE' && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit Subtype</label>
              <select
                value={pkgType}
                onChange={e => setPkgType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold"
              >
                <option value="PALLET">PALLET</option>
                <option value="BOX">BOX / CARTON</option>
                <option value="BREAKBULK">BREAKBULK</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Package Description</label>
              <input
                type="text"
                value={packageDescription}
                onChange={e => setPackageDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Colli Count</label>
              <input
                type="number"
                value={colliCount}
                onChange={e => setColliCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Gross Weight (kg)</label>
              <input
                type="number"
                value={packageGross}
                onChange={e => setPackageGross(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold"
              />
            </div>
          </div>
        )}

        {/* VEHICLE FORM */}
        {activeType === 'VEHICLE' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Vehicle Model</label>
              <input
                type="text"
                value={vehicleModel}
                onChange={e => setVehicleModel(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">VIN / Chassis Number</label>
              <input
                type="text"
                placeholder="e.g. LC0BYDSEAL00199"
                value={vinNumber}
                onChange={e => setVinNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Curb Weight (kg)</label>
              <input
                type="number"
                value={vehicleGross}
                onChange={e => setVehicleGross(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Cargo Unit to Shipment</span>
          </button>
        </div>
      </div>

      {/* Current Added Units List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Added Cargo Units ({units.length})
          </span>
        </div>

        {units.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400 text-xs">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">No cargo units added yet</p>
            <p className="text-[11px] mt-0.5">Add at least one container, bulk cargo, package, or vehicle above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {units.map((unit, idx) => (
              <PolymorphicUnitCard
                key={unit.unit_identifier || idx}
                unit={unit}
                index={idx}
                onRemove={onRemoveUnit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
