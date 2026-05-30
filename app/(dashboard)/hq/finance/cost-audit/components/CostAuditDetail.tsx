"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  Eye,
  Ban,
  Zap,
  FileCheck,
  Receipt,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  User,
  MapPin,
  Phone,
  MessageSquare,
  Download,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "react-hot-toast";
import { formatRupiah } from "../hooks/useCostAuditData";
import PaymentPanel from "./PaymentPanel";

interface CostAuditDetailProps {
  selectedWo: any;
  paymentMap: Record<string, any[]>;
  onBack: () => void;
  onAction: (itemId: string, newStatus: "approved" | "rejected") => Promise<void>;
  onBulkApprove: (costs: any[]) => Promise<void>;
  onFinalizeAudit: (joList: any[]) => Promise<void>;
  onRefresh: () => void;
}

export default function CostAuditDetail({
  selectedWo,
  paymentMap,
  onBack,
  onAction,
  onBulkApprove,
  onFinalizeAudit,
  onRefresh,
}: CostAuditDetailProps) {
  const pendingReviewCount = selectedWo.costs.filter(
    (c: any) => c.status === "need_approval"
  ).length;
  const podReadyCount = selectedWo.jo_list.filter(
    (j: any) => j.jo?.pod_status === "received_hq"
  ).length;

  const marginPercent = selectedWo.margin.percent;
  const marginTone =
    marginPercent >= 20
      ? "text-emerald-700"
      : marginPercent >= 10
        ? "text-amber-700"
        : "text-rose-700";
  const marginBg =
    marginPercent >= 20
      ? "bg-emerald-50"
      : marginPercent >= 10
        ? "bg-amber-50"
        : "bg-rose-50";
  const marginBarColor =
    marginPercent >= 20 ? "bg-emerald-500" : "bg-rose-500";

  // ─── Render Helpers ─────────────────────────────────────

  const renderDocLinks = (joGroup: any) => {
    const podUrl = joGroup.jo.pod_photo_url;
    const hasDoc = podUrl && podUrl.length > 5;

    return (
      <div className="flex gap-1.5 flex-wrap">
        {hasDoc ? (
          (() => {
            try {
              const urls = JSON.parse(podUrl);
              if (Array.isArray(urls)) {
                return urls.map((u: string, idx: number) => (
                  <a
                    key={idx}
                    href={u}
                    target="_blank"
                    className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                  >
                    <FileCheck size={10} /> Doc {idx + 1}
                  </a>
                ));
              }
            } catch { /* not JSON */ }
            return (
              <a
                href={podUrl}
                target="_blank"
                className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shadow-sm"
              >
                <FileCheck size={10} /> SBU Doc
              </a>
            );
          })()
        ) : (
          <span className="text-[10px] text-slate-400 italic flex items-center gap-1">
            <FileCheck size={10} /> No POD
          </span>
        )}
        {joGroup.jo.advance_receipt_url && (
          <a
            href={joGroup.jo.advance_receipt_url}
            target="_blank"
            className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-amber-600 hover:bg-amber-50/50 flex items-center gap-1.5 whitespace-nowrap shadow-sm"
          >
            <Receipt size={10} /> Uang Jalan
          </a>
        )}
        {joGroup.jo.transfer_proof_url && (
          <a
            href={joGroup.jo.transfer_proof_url}
            target="_blank"
            className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-emerald-600 hover:bg-emerald-50/50 flex items-center gap-1.5 whitespace-nowrap shadow-sm"
          >
            <Receipt size={10} /> Pelunasan
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ─── Sticky Header ──────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 lg:px-8 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={onBack}
              className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-bold text-slate-900 uppercase truncate">
                  {selectedWo.wo?.wo_number}
                </h1>
                <Badge className="bg-slate-100 text-slate-600 border-none text-[9px] font-bold uppercase tracking-wider px-2 py-0.5">
                  Audit Hub
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">
                {selectedWo.wo?.customer?.legal_name ||
                  selectedWo.wo?.customer?.name ||
                  "---"}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.success("PDF Export initiated")}
            className="h-8 text-[10px]"
            icon={<Download size={14} />}
          >
            Export
          </Button>
        </div>
      </div>

      {/* ─── Content ────────────────────────────────────── */}
      <div className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ─── Section 1: Overview Cards ─────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: "Gross Margin",
                value: `${marginPercent.toFixed(0)}%`,
                helper: formatRupiah(selectedWo.margin.absolute),
                icon: TrendingUp,
                tone: `${marginBg} ${marginTone}`,
              },
              {
                label: "Revenue",
                value: formatRupiah(selectedWo.margin.revenue),
                helper: `${selectedWo.jo_list.length} mission${selectedWo.jo_list.length > 1 ? "s" : ""}`,
                icon: Receipt,
                tone: "bg-slate-100 text-slate-700",
              },
              {
                label: "Pending Review",
                value: String(pendingReviewCount),
                helper: `${selectedWo.costs.length} total items`,
                icon: AlertCircle,
                tone:
                  pendingReviewCount > 0
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700",
              },
              {
                label: "POD Coverage",
                value: `${podReadyCount}/${selectedWo.jo_list.length}`,
                helper:
                  podReadyCount === selectedWo.jo_list.length
                    ? "Complete"
                    : "Awaiting docs",
                icon: FileCheck,
                tone:
                  podReadyCount === selectedWo.jo_list.length
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-700",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
                      {card.label}
                    </p>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.tone}`}>
                      <Icon size={14} />
                    </div>
                  </div>
                  <p className="text-lg font-bold text-slate-900 leading-tight">{card.value}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{card.helper}</p>
                </div>
              );
            })}
          </div>

          {/* ─── Two Column Layout ─────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left: 2/3 width */}
            <div className="xl:col-span-2 space-y-6">

              {/* ─── Section 2: Customer & JO Missions ──── */}
              <Card className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                        <User size={16} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 uppercase">
                          {selectedWo.wo?.customer?.legal_name ||
                            selectedWo.wo?.customer?.name ||
                            "---"}
                        </h2>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-slate-400" />
                          {selectedWo.jo_list[0]?.jo?.wo_item?.item_data
                            ?.origin_name ||
                            selectedWo.jo_list[0]?.jo?.wo_item?.item_data
                              ?.shipper_name ||
                            "Origin"}
                          {" → "}
                          {selectedWo.jo_list[0]?.jo?.wo_item?.item_data
                            ?.destination_name ||
                            selectedWo.jo_list[0]?.jo?.wo_item?.item_data
                              ?.recipient_name ||
                            "Dest"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <a
                        href={`https://wa.me/${selectedWo.wo?.customer?.phone?.replace(/\D/g, "")}`}
                        target="_blank"
                        className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 border border-emerald-200 transition-all"
                      >
                        <MessageSquare size={14} />
                      </a>
                      <a
                        href={`tel:${selectedWo.wo?.customer?.phone}`}
                        className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 border border-slate-200 transition-all"
                      >
                        <Phone size={14} />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">
                    Job Order Missions ({selectedWo.jo_list.length})
                  </p>
                  {selectedWo.jo_list.map((joGroup: any) => (
                    <div
                      key={joGroup.jo.id}
                      className="bg-slate-50 rounded-lg border border-slate-100 p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[10px] text-slate-400 uppercase">{joGroup.jo.jo_number}</p>
                            {joGroup.isJoSettled ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-bold uppercase px-1.5 py-0.2 h-4 flex items-center">
                                Settled
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-[8px] font-bold uppercase px-1.5 py-0.2 h-4 flex items-center">
                                Outstanding
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-900 uppercase mt-0.5">
                            {joGroup.jo.md_drivers?.name || "No Driver"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase">Fleet</p>
                          <p className="text-xs font-semibold text-slate-700 uppercase mt-0.5">
                            {joGroup.jo.md_fleets?.plate_number || "N/A"}{" "}
                            <span className="text-slate-400">·</span>{" "}
                            {joGroup.jo.md_fleets?.fleet_type?.type_name || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-2.5">
                        <div>
                          <p className="text-[10px] text-emerald-600 font-semibold uppercase">
                            Bagi Hasil ({joGroup.margin.driverSharePct}%)
                          </p>
                          <p className="text-xs font-bold text-emerald-600">
                            {formatRupiah(joGroup.margin.driverShareAmount)}
                          </p>
                        </div>
                        {joGroup.margin.isVendor && (
                          <Badge className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold uppercase px-2 py-0.5">
                            Vendor · {formatRupiah(joGroup.margin.purchasePrice)}
                          </Badge>
                        )}
                      </div>

                      {renderDocLinks(joGroup)}
                    </div>
                  ))}
                </div>
              </Card>

              {/* ─── Section 3: Reviewable Items ───────── */}
              <Card className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase">
                      Reviewable Items
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Approval queue and supporting documents
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {pendingReviewCount > 1 && (
                      <button
                        onClick={() => {
                          const pendingCosts = selectedWo.costs.filter(
                            (c: any) => c.status === "need_approval"
                          );
                          onBulkApprove(pendingCosts);
                        }}
                        className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider px-3 shadow-sm transition-all"
                      >
                        Approve All
                      </button>
                    )}
                    <span className="bg-slate-100 text-slate-600 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                      {selectedWo.costs.length} Items
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {selectedWo.costs.map((item: any) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-100 bg-slate-50/50 p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 shrink-0 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                            <Zap size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 uppercase">
                              {item.cost_type.replace(/_/g, " ")}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                              {item.name || "No description"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-slate-900">
                            {formatRupiah(item.amount)}
                          </p>
                          <Badge
                            className={`border-none text-[9px] font-bold uppercase mt-1 ${
                              item.charge_type === "surcharge"
                                ? "bg-orange-50 text-orange-600"
                                : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            {item.charge_type || "REIMBURSEMENT"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.billing_proof_url ? (
                          <a
                            href={item.billing_proof_url}
                            target="_blank"
                            className="w-8 h-8 bg-white text-slate-600 border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-all"
                          >
                            <Eye size={14} />
                          </a>
                        ) : (
                          <div className="w-8 h-8 bg-slate-50 text-slate-300 rounded-lg flex items-center justify-center">
                            <Ban size={14} />
                          </div>
                        )}

                        {item.status === "need_approval" ? (
                          <>
                            <button
                              onClick={() => onAction(item.id, "approved")}
                              className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 transition-all"
                            >
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button
                              onClick={() => onAction(item.id, "rejected")}
                              className="w-8 h-8 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-lg flex items-center justify-center transition-all"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        ) : (
                          <div
                            className={`flex-1 h-8 rounded-lg flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase ${
                              item.status === "approved"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {item.status === "approved" ? (
                              <CheckCircle size={12} />
                            ) : (
                              <XCircle size={12} />
                            )}
                            {item.status.replace(/_/g, " ")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Sidebar: 1/3 width */}
            <div className="space-y-6">

              {/* ─── Section 4: Profitability ───────────── */}
              <Card className="rounded-xl border border-slate-200 shadow-sm bg-white p-5">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
                  Profitability
                </p>

                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className="text-2xl font-bold text-slate-900 leading-none">
                      {marginPercent.toFixed(0)}
                      <span className="text-base text-slate-400">%</span>
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase mt-1">
                      Est. Gross Margin
                    </p>
                  </div>
                  <Badge
                    className={`border-none text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      marginPercent >= 20
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {marginPercent >= 20 ? "OPTIMAL" : "LOW MARGIN"}
                  </Badge>
                </div>

                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-5">
                  <div
                    className={`h-full ${marginBarColor} transition-all duration-1000`}
                    style={{
                      width: `${Math.min(100, marginPercent)}%`,
                    }}
                  />
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">
                      Revenue
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {formatRupiah(selectedWo.margin.revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-emerald-600 uppercase">
                      Driver Share ({selectedWo.margin.driverSharePct.toFixed(0)}%)
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                      {formatRupiah(selectedWo.margin.driverShareAmount)}
                    </span>
                  </div>
                  {selectedWo.margin.approvedExtraCosts > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        Extra Costs
                      </span>
                      <span className="text-xs font-bold text-amber-600">
                        {formatRupiah(selectedWo.margin.approvedExtraCosts)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-rose-600 uppercase">
                      Total COGS
                    </span>
                    <span className="text-xs font-bold text-rose-600">
                      {formatRupiah(selectedWo.margin.cogs)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-900 uppercase">
                      Net Margin
                    </span>
                    <span className="text-sm font-bold text-emerald-600">
                      {formatRupiah(selectedWo.margin.absolute)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* ─── Section 5: Payment Panel ──────────── */}
              <PaymentPanel
                joList={selectedWo.jo_list}
                paymentMap={paymentMap}
                onRefresh={onRefresh}
              />

              {/* ─── Vendor AP Rollup ──────────────────── */}
              {selectedWo.vendor_breakdown?.length > 0 && (
                <Card className="rounded-xl border border-slate-200 shadow-sm bg-white p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Vendor AP Rollup
                    </p>
                    <Badge className="bg-slate-100 text-slate-600 border-none text-[9px] font-bold uppercase px-2 py-0.5">
                      AP
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {selectedWo.vendor_breakdown.map((bucket: any) => (
                      <div
                        key={bucket.vendor_id || "internal"}
                        className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100"
                      >
                        <div>
                          <p className="text-[10px] font-bold text-slate-900 uppercase">
                            {bucket.bucket}
                          </p>
                          <p className="text-[9px] text-slate-500">
                            {bucket.vendor_id
                              ? `${bucket.vendor_id.slice(0, 8)}...`
                              : "Internal account"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-900">
                            {formatRupiah(bucket.total_amount)}
                          </p>
                          <p className="text-[9px] text-slate-500">
                            {bucket.pending_count} pending · {bucket.approved_count} approved
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* ─── Section 6: Audit Checklist ────────── */}
              <Card className="rounded-xl border border-slate-200 shadow-sm bg-white p-5">
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
                  Audit Checklist
                </p>
                <div className="space-y-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selectedWo.jo_list.every(
                          (j: any) => j.jo?.pod_status === "received_hq"
                        )
                          ? "bg-emerald-50 text-emerald-500"
                          : "bg-slate-100 text-slate-300"
                      }`}
                    >
                      <FileCheck size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-900 uppercase">
                        POD Verification
                      </p>
                      <p className="text-[9px] text-slate-500 uppercase">
                        {selectedWo.jo_list.every(
                          (j: any) => j.jo?.pod_status === "received_hq"
                        )
                          ? "Complete"
                          : "Pending Physical Document"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        selectedWo.costs.every(
                          (c: any) => c.status !== "need_approval"
                        )
                          ? "bg-emerald-50 text-emerald-500"
                          : "bg-amber-50 text-amber-500 animate-pulse"
                      }`}
                    >
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-900 uppercase">
                        Financial Clearance
                      </p>
                      <p className="text-[9px] text-slate-500 uppercase">
                        {selectedWo.costs.every(
                          (c: any) => c.status !== "need_approval"
                        )
                          ? "All Costs Processed"
                          : "Action Required"}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  disabled={selectedWo.costs.some(
                    (c: any) => c.status === "need_approval"
                  )}
                  onClick={() => onFinalizeAudit(selectedWo.jo_list)}
                  className="w-full h-9 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-wider disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                >
                  FINALIZE AUDIT <ArrowRight size={14} />
                </button>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
