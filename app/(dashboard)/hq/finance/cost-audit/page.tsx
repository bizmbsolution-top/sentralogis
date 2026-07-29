"use client";

import React from "react";
import { Loader2, ShieldCheck, Search, RefreshCw, Truck, Warehouse, Ship, LayoutGrid, Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

// [AI] SBU visual indicators for Cost Audit cards
const SBU_BADGE_CONFIG: Record<string, {
  label: string; icon: React.ElementType;
  bg: string; text: string; border: string;
}> = {
  TRUCKING:   { label: 'Trucking',   icon: Truck,      bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  WAREHOUSE:  { label: 'Warehouse',  icon: Warehouse,   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  CLEARANCE:  { label: 'Clearance',  icon: LayoutGrid,  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  FORWARDING: { label: 'Forwarding', icon: Ship,        bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
};
import { useCostAuditData } from "./hooks/useCostAuditData";
import StatWidgets from "./components/StatWidgets";
import WoListCard from "./components/WoListCard";
import CostAuditDetail from "./components/CostAuditDetail";

// [AI] Re-designed Cost Audit Main Hub orchestrating modular hook & visual components.
export default function CostAuditPage() {
  const {
    loading,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sbuFilter,
    handleSbuFilterChange,
    selectedWo,
    setSelectedWoId,
    groupedData,
    paymentMap,
    stats,
    tabCounts,
    avgMargin,
    fetchData,
    handleAction,
    handleBulkApprove,
    handleFinalizeAudit,
  } = useCostAuditData();

  // [AI] Render full detail view if a Work Order is active
  if (selectedWo) {
    return (
      <CostAuditDetail
        selectedWo={selectedWo}
        paymentMap={paymentMap}
        onBack={() => setSelectedWoId(null)}
        onAction={handleAction}
        onBulkApprove={handleBulkApprove}
        onFinalizeAudit={handleFinalizeAudit}
        onRefresh={fetchData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8 animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ─── Header & Top Actions ───────────────────────── */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase">
              AP Purchase Audit Hub
            </h1>
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">
              Audit driver commission, subcontracts, and SBU extra costs.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full xl:w-auto">
            <div className="relative w-full md:w-80">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by WO number or customer..."
                className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-500 outline-none focus:border-slate-400 transition-colors rounded-xl shadow-sm animate-none"
              />
            </div>
            <Button
              onClick={() => fetchData()}
              variant="secondary"
              className="h-11 rounded-xl shadow-sm text-xs font-bold uppercase tracking-wider"
              icon={<RefreshCw size={16} className="text-slate-600" />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* ─── Stat Widgets ──────────────────────────────── */}
        <StatWidgets stats={stats} avgMargin={avgMargin} />

        {/* ─── Tab Filters with Counter Pills ──────────────── */}
        <div className="flex flex-wrap gap-2 pt-2">
          {[
            { id: "sbu_processing", label: "Waiting SBU", count: tabCounts.sbu_processing },
            { id: "new_request", label: "Needs Review", count: tabCounts.new_request },
            { id: "audit_done", label: "Ready to Pay", count: tabCounts.audit_done },
            { id: "paid", label: "Settled", count: tabCounts.paid },
            { id: "all", label: "All Work Orders", count: tabCounts.all },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] transition-all flex items-center gap-2.5 border shadow-sm ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                  statusFilter === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* [AI] Desktop SBU Type Filter */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1">SBU</span>
          {([
            { id: 'all', label: 'All SBU', icon: Layers },
            ...Object.entries(SBU_BADGE_CONFIG).map(([key, val]) => ({ id: key, label: val.label, icon: val.icon })),
          ] as Array<{ id: string; label: string; icon: React.ElementType }>).map(item => {
            const isActive = sbuFilter === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleSbuFilterChange(item.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Icon size={12} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* ─── Queue / List View ─────────────────────────── */}
        <div className="space-y-4">
          {loading ? (
            <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm p-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">
                  Syncing audit queue...
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Loading mission and cost review data.
                </p>
              </div>
            </Card>
          ) : groupedData.length === 0 ? (
            <Card className="rounded-2xl border border-dashed border-slate-300 bg-white shadow-sm p-16 text-center">
              <ShieldCheck size={44} className="mx-auto text-slate-300" />
              <h3 className="mt-4 text-sm font-bold text-slate-900 uppercase tracking-wider">
                No work orders match the current filter
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Try another stage or clear the search to view more records.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {groupedData.map((group: any) => (
                <WoListCard
                  key={group.wo_id}
                  group={group}
                  paymentMap={paymentMap}
                  onSelect={setSelectedWoId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
