import React from 'react';
import { Building2, MapPin, Calendar, FileText, Globe } from 'lucide-react';
import { IncotermType } from '@/lib/domain/shipment/types';

interface ShipmentIdentityFormProps {
  formData: {
    customer_id: string;
    customer_name: string;
    origin_location_id: string;
    destination_location_id: string;
    incoterm: IncotermType;
    booking_reference: string;
    master_bl_number: string;
    house_bl_number: string;
    etd: string;
    eta: string;
    notes: string;
  };
  onChange: (field: string, value: any) => void;
}

export const ShipmentIdentityForm: React.FC<ShipmentIdentityFormProps> = ({
  formData,
  onChange
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">01. Shipment Identity & Corridor</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Define commercial context, customer entity, origin, destination, and booking metadata.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Customer / Consignee */}
        <div className="sm:col-span-2 space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Customer / Client Entity <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. PT BYD Motor Indonesia"
              value={formData.customer_name}
              onChange={e => onChange('customer_name', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Origin Location */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Origin Port / Hub <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. CNSHA (Shanghai Port)"
              value={formData.origin_location_id}
              onChange={e => onChange('origin_location_id', e.target.value.toUpperCase())}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono uppercase"
              required
            />
          </div>
        </div>

        {/* Destination Location */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Destination Port / Hub <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. IDPTB (Patimban Port)"
              value={formData.destination_location_id}
              onChange={e => onChange('destination_location_id', e.target.value.toUpperCase())}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono uppercase"
              required
            />
          </div>
        </div>

        {/* Incoterm */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Incoterm
          </label>
          <div className="relative">
            <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              value={formData.incoterm}
              onChange={e => onChange('incoterm', e.target.value as IncotermType)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
            >
              <option value="FOB">FOB — Free on Board</option>
              <option value="CIF">CIF — Cost, Insurance & Freight</option>
              <option value="EXW">EXW — Ex Works</option>
              <option value="FCA">FCA — Free Carrier</option>
              <option value="CFR">CFR — Cost and Freight</option>
              <option value="DAP">DAP — Delivered at Place</option>
              <option value="DDP">DDP — Delivered Duty Paid</option>
            </select>
          </div>
        </div>

        {/* Booking Reference */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Booking / Contract Ref
          </label>
          <div className="relative">
            <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. BKG-2026-BYD-09"
              value={formData.booking_reference}
              onChange={e => onChange('booking_reference', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Master BL Number */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Master B/L (Ocean / AWB)
          </label>
          <input
            type="text"
            placeholder="e.g. MSKU-88776655"
            value={formData.master_bl_number}
            onChange={e => onChange('master_bl_number', e.target.value)}
            className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono uppercase"
          />
        </div>

        {/* House BL Number */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            House B/L
          </label>
          <input
            type="text"
            placeholder="e.g. HBL-SNTR-1002"
            value={formData.house_bl_number}
            onChange={e => onChange('house_bl_number', e.target.value)}
            className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono uppercase"
          />
        </div>

        {/* Planned ETD */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Planned ETD (Departure)
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={formData.etd}
              onChange={e => onChange('etd', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Planned ETA */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Planned ETA (Arrival)
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={formData.eta}
              onChange={e => onChange('eta', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
