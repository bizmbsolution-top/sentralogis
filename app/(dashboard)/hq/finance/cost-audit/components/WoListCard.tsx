"use client";

import { ArrowRight, Truck, Warehouse, Ship, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

// [AI] SBU visual indicators
const SBU_BADGE_CONFIG: Record<string, {
  label: string; icon: React.ElementType;
  bg: string; text: string; border: string;
}> = {
  TRUCKING:   { label: 'Trucking',   icon: Truck,      bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  WAREHOUSE:  { label: 'Warehouse',  icon: Warehouse,   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  CLEARANCE:  { label: 'Clearance',  icon: LayoutGrid,  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  FORWARDING: { label: 'Forwarding', icon: Ship,        bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
};
import { Button } from "@/components/ui/Button";
import {
  formatRupiah,
  getGroupTone,
  getTransportTone,
  resolveTransportLabel,
} from "../hooks/useCostAuditData";

interface WoListCardProps {
  group: any;
  paymentMap: Record<string, any[]>;
  onSelect: (woId: string) => void;
}

export default function WoListCard({ group, paymentMap, onSelect }: WoListCardProps) {
  const tone = getGroupTone(group);
  const transportLabel = resolveTransportLabel(group.jo_list);
  const IconComponent = tone.icon;

  // [AI] Extract unique SBU types
  const sbuTypes = Array.from(new Set(
    group.jo_list?.map((joGroup: any) => joGroup.jo?.wo_item?.sbu_type?.toUpperCase()).filter(Boolean)
  )) as string[];

  const pendingCount = group.costs.filter(
    (item: any) => item.status === "need_approval"
  ).length;

  // [AI] Settlement computation
  let totalTarget = 0;
  let totalPaid = 0;

  for (const joGroup of group.jo_list || []) {
    const jo = joGroup.jo;
    totalTarget +=
      Number(jo?.advance_amount || 0) +
      Number(jo?.purchase_price || 0) +
      Number(jo?.driver_payment_amount || 0);

    const joPayments: any[] = jo.id ? paymentMap[jo.id] || [] : [];
    for (const payment of joPayments) {
      totalPaid += Number(payment.amount);
    }
  }

  const paymentStatus =
    totalTarget > 0 && totalPaid >= totalTarget
      ? { label: "Settled", className: "bg-emerald-50 text-emerald-700" }
      : totalPaid > 0
        ? { label: "Partial", className: "bg-amber-50 text-amber-700" }
        : { label: "Awaiting", className: "bg-slate-100 text-slate-600" };

  const marginTone =
    group.margin.percent >= 20
      ? "text-emerald-700"
      : group.margin.percent >= 10
        ? "text-amber-700"
        : "text-rose-700";

  return (
    <div
      onClick={() => onSelect(group.wo_id)}
      className={`rounded-xl border ${tone.borderClass} bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all duration-200 overflow-hidden`}
    >
      {/* Header row */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${tone.summaryTone}`}
            >
              <IconComponent size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <h2 className="text-sm font-bold text-slate-900 uppercase truncate">
                  {group.wo?.wo_number}
                </h2>
                <Badge
                  className={`${getTransportTone(transportLabel)} border text-[9px] font-bold uppercase tracking-wider px-2 py-0.5`}
                >
                  {transportLabel}
                </Badge>
                
                {/* [AI] SBU Badges */}
                {sbuTypes.map(sbu => {
                  const config = SBU_BADGE_CONFIG[sbu];
                  if (!config) return null;
                  const Icon = config.icon as React.ComponentType<{ size?: number; className?: string }>;
                  return (
                    <Badge
                      key={sbu}
                      className={`${config.bg} ${config.text} ${config.border} border text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 flex items-center gap-1`}
                    >
                      <Icon size={10} />
                      {config.label}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-xs font-medium text-slate-700 truncate">
                {group.wo?.customer?.legal_name ||
                  group.wo?.customer?.name ||
                  "---"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                {group.jo_list[0]?.jo?.wo_item?.item_data?.origin_name ||
                  group.jo_list[0]?.jo?.wo_item?.item_data?.shipper_name ||
                  "Origin"}{" "}
                →{" "}
                {group.jo_list[0]?.jo?.wo_item?.item_data?.destination_name ||
                  group.jo_list[0]?.jo?.wo_item?.item_data?.recipient_name ||
                  "Dest"}
              </p>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge
              className={`${tone.badgeClass} border text-[9px] font-bold uppercase tracking-wider px-2 py-0.5`}
            >
              {tone.label}
            </Badge>
            {pendingCount > 0 && (
              <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold uppercase px-2 py-0.5">
                {pendingCount} review
              </Badge>
            )}
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-100">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Revenue</p>
            <p className="text-xs font-bold text-slate-900 mt-1 truncate">
              {formatRupiah(group.margin.revenue)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-100">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">COGS</p>
            <p className="text-xs font-bold text-slate-900 mt-1 truncate">
              {formatRupiah(group.margin.cogs)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-100">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Margin</p>
            <p className={`text-xs font-bold mt-1 truncate ${marginTone}`}>
              {formatRupiah(group.margin.absolute)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-100">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Margin %</p>
            <p className={`text-xs font-bold mt-1 ${marginTone}`}>
              {group.margin.percent.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <span className="rounded-full bg-slate-200/70 px-2 py-0.5 font-semibold text-slate-600">
            {group.jo_list.length} missions
          </span>
          <span className="rounded-full bg-slate-200/70 px-2 py-0.5 font-semibold text-slate-600">
            {group.costs.length} audit items
          </span>
          <span className={`rounded-full px-2 py-0.5 font-semibold ${paymentStatus.className}`}>
            {paymentStatus.label}
          </span>
          <span className="rounded-full bg-slate-200/70 px-2 py-0.5 font-semibold text-slate-600">
            {new Date(group.costs[0]?.created_at || Date.now()).toLocaleDateString(
              "id-ID",
              { day: "numeric", month: "short" }
            )}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 gap-1 px-2 h-7"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(group.wo_id);
          }}
        >
          Detail <ArrowRight size={12} />
        </Button>
      </div>
    </div>
  );
}
