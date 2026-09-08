import React from 'react';
import { Truck, FileCheck, Warehouse, Anchor, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface ServiceRequestItem {
  id: string;
  target_domain: string;
  service_product_sku: string;
  status: string;
  requested_at: string;
  accepted_at?: string | null;
  completed_at?: string | null;
  correlation_id?: string | null;
}

interface ServiceContractPanelProps {
  serviceRequests: ServiceRequestItem[];
}

export const ServiceContractPanel: React.FC<ServiceContractPanelProps> = ({
  serviceRequests
}) => {
  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case 'TRUCKING':
        return Truck;
      case 'CUSTOMS':
        return FileCheck;
      case 'WAREHOUSE':
        return Warehouse;
      default:
        return Anchor;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { text: 'text-emerald-700 bg-emerald-50 border-emerald-300', icon: CheckCircle2, label: 'Completed' };
      case 'ACCEPTED':
      case 'EXECUTING':
      case 'DISPATCHED':
        return { text: 'text-blue-700 bg-blue-50 border-blue-300', icon: Clock, label: status };
      case 'REJECTED':
      case 'CANCELLED':
        return { text: 'text-red-700 bg-red-50 border-red-300', icon: AlertCircle, label: status };
      case 'ISSUED':
      default:
        return { text: 'text-amber-700 bg-amber-50 border-amber-300', icon: Clock, label: 'Pending Acceptance' };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            SBU Service Contracts
          </span>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mt-0.5">
            Cross-Domain Execution Contracts ({serviceRequests.length})
          </h3>
        </div>
      </div>

      {serviceRequests.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center text-xs text-slate-400">
          No external SBU Service Contracts issued for this shipment.
        </div>
      ) : (
        <div className="space-y-2.5">
          {serviceRequests.map(sr => {
            const Icon = getDomainIcon(sr.target_domain);
            const statusMeta = getStatusBadge(sr.status);
            const StatusIcon = statusMeta.icon;

            return (
              <div
                key={sr.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-2 hover:border-slate-300 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-blue-600 shadow-xs">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 font-mono">
                        {sr.service_product_sku}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Domain: {sr.target_domain}
                      </span>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusMeta.text}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusMeta.label}</span>
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60 font-mono">
                  <span>Req: {new Date(sr.requested_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  <span>ID: {sr.id.substring(0, 10)}...</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
