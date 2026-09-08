import React from 'react';
import { Truck, FileCheck, Warehouse, Anchor, CheckCircle2 } from 'lucide-react';

interface ServiceRequirementsProps {
  selectedServices: string[];
  onToggleService: (serviceKey: string) => void;
}

const AVAILABLE_SERVICES = [
  {
    key: 'TRK_ORIGIN_PICKUP',
    label: 'First-Mile Road Trucking (Pickup)',
    domain: 'TRUCKING',
    icon: Truck,
    description: 'Dispatch internal/partner trucking fleet to pick up cargo from factory/shipper premises.'
  },
  {
    key: 'SEA_OCEAN_FREIGHT',
    label: 'Ocean Freight Linehaul',
    domain: 'FORWARDING',
    icon: Anchor,
    description: 'FCL / LCL ocean vessel booking, slot chartering, and container repositioning.'
  },
  {
    key: 'CUS_IMPORT_PIB_STANDARD',
    label: 'Customs Clearance (PIB / PEB Import/Export)',
    domain: 'CUSTOMS',
    icon: FileCheck,
    description: 'PPJK electronic data interchange, HS classification, duty calculation, and SPPB release.'
  },
  {
    key: 'WMS_INBOUND_RECEIPT',
    label: 'Warehouse & Crossdocking Storage',
    domain: 'WAREHOUSE',
    icon: Warehouse,
    description: 'Inbound gate-in receipt, pallet deconsolidation, staging, and temp storage.'
  },
  {
    key: 'TRK_DEST_DELIVERY',
    label: 'Last-Mile Delivery Trucking',
    domain: 'TRUCKING',
    icon: Truck,
    description: 'Final haulage from destination port/hub to consignee destination facility.'
  }
];

export const ServiceRequirements: React.FC<ServiceRequirementsProps> = ({
  selectedServices,
  onToggleService
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">04. Operational Service Contracts</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Select SBU operational execution requirements. These represent contractual handoffs via Service Requests, not fake Work Orders.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AVAILABLE_SERVICES.map(srv => {
          const isChecked = selectedServices.includes(srv.key);
          const Icon = srv.icon;

          return (
            <div
              key={srv.key}
              onClick={() => onToggleService(srv.key)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                isChecked
                  ? 'bg-blue-50/60 border-blue-500 ring-1 ring-blue-500/20 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  isChecked
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isChecked ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-900 tracking-tight">
                    {srv.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {srv.description}
                </p>
                <div className="pt-1">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    SBU: {srv.domain}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
