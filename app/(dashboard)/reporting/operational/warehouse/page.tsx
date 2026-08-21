"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import {
  ChevronLeft,
  Loader2,
  Package,
  Truck,
  Users,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Filter,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

const HQ_WH_ROLES = [
  "hq_ops", "hq_director_ops", "hq_finance", "hq_director_fin",
  "hq_cs", "hq_director_cs", "hq_commercial_director",
  "hq_director_bizdev", "hq_director_hrd",
];
const SBU_WH_ROLES = [
  "sbu_manager_wh", "sbu_ops_wh", "sbu_fin_wh", "sbu_admin_wh",
];
const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];

export default function WarehouseReportingPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    inventory: { totalItems: 0, totalValue: 0, availableItems: 0 },
    inbound: { totalTasks: 0, completedTasks: 0, pendingTasks: 0 },
    outbound: { totalTasks: 0, completedTasks: 0, pendingTasks: 0 },
    movements: { totalMovements: 0, completedMovements: 0 },
    transfers: { totalTransfers: 0, completedTransfers: 0 },
    staff: { totalStaff: 0, activeStaff: 0 },
    financials: { totalRevenue: 0, totalExpenses: 0, netProfit: 0 }
  });

  const [sbuFilter, setSbuFilter] = useState('ALL');

  const isHqRole = !!profile && HQ_WH_ROLES.includes(profile.role);
  const isSbuWh = !!profile && SBU_WH_ROLES.includes(profile.role);
  const isGlobalRole = !!profile && GLOBAL_ROLES.includes(profile.role);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(
    profile?.tenant_id || null
  );
  const [tenantList, setTenantList] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (profile.tenant_id) {
      setResolvedTenantId(profile.tenant_id);
      return;
    }
    if (isGlobalRole) {
      const fetchTenant = async () => {
        const { data } = await supabase.from("tenants").select("id").limit(1);
        if (data && data.length > 0) setResolvedTenantId(data[0].id);
      };
      fetchTenant();
    }
  }, [profile, isGlobalRole]);

  useEffect(() => {
    if (!isGlobalRole) return;
    const fetchTenantList = async () => {
      const { data } = await supabase
        .from("tenants")
        .select("id, tenant_code, name")
        .order("tenant_code");
      if (data && data.length > 0) {
        setTenantList(data);
        setSelectedTenantId((prev) => prev || resolvedTenantId || data[0].id);
      }
    };
    fetchTenantList();
  }, [isGlobalRole, resolvedTenantId]);

  const tenantId = isGlobalRole
    ? selectedTenantId || resolvedTenantId
    : resolvedTenantId;
  const canAccess = !!tenantId && (isHqRole || isSbuWh || isGlobalRole);

  const fetchReportData = useCallback(async () => {
    if (!profile?.tenant_id && !tenantId) { setLoading(false); return; }
    const tId = tenantId || profile?.tenant_id;
    if (!tId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [
        inventoryRes, inboundRes, outboundRes, movementsRes,
        transfersRes, staffRes
      ] = await Promise.all([
        supabase.from('wh_inventory')
          .select('id, quantity, reserved_quantity, available_quantity, unit_cost')
          .eq('tenant_id', tId) as any,
        supabase.from('wh_tasks')
          .select('id, status')
          .eq('tenant_id', tId)
          .in('task_type', ['INBOUND', 'PUTAWAY'])
          .in('status', ['COMPLETED', 'REJECTED']) as any,
        supabase.from('wh_tasks')
          .select('id, status')
          .eq('tenant_id', tId)
          .in('task_type', ['OUTBOUND', 'PICKING', 'PACKING'])
          .in('status', ['COMPLETED', 'REJECTED']) as any,
        supabase.from('wh_inventory_movements')
          .select('id, status')
          .eq('tenant_id', tId)
          .in('status', ['COMPLETED', 'REJECTED']) as any,
        supabase.from('wh_transfer_orders')
          .select('id, status')
          .eq('tenant_id', tId)
          .in('status', ['COMPLETED', 'REJECTED']) as any,
        supabase.from('md_warehouse_staff')
          .select('id')
          .eq('tenant_id', tId)
          .eq('is_active', true) as any,
      ]);

      const [inv, inbound, outbound, movements, transfers, staff] = [
        (inventoryRes.data as any[]) || [],
        inboundRes.data || [],
        outboundRes.data || [],
        movementsRes.data || [],
        transfersRes.data || [],
        staffRes.data || []
      ];

      setReportData({
        inventory: {
          totalItems: inv.length,
          totalValue: inv.reduce((sum, item) => sum + (item.unit_cost || 0) * (item.quantity || 0), 0),
          availableItems: inv.filter(item => item.available_quantity > 0).length
        },
        inbound: {
          totalTasks: inbound.length,
          completedTasks: inbound.length,
          pendingTasks: 0
        },
        outbound: {
          totalTasks: outbound.length,
          completedTasks: outbound.length,
          pendingTasks: 0
        },
        movements: {
          totalMovements: movements.length,
          completedMovements: movements.length
        },
        transfers: {
          totalTransfers: transfers.length,
          completedTransfers: transfers.length
        },
        staff: {
          totalStaff: staff.length,
          activeStaff: staff.length
        },
        financials: {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0
        }
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [profile, supabase, sbuFilter, tenantId]);

  useEffect(() => { if (profile) fetchReportData(); }, [profile, fetchReportData, sbuFilter]);

  const statCards = [
    { label: 'Inventory Summary', value: reportData.inventory.totalItems, subvalue: `Available: ${reportData.inventory.availableItems}`, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Completed Inbound Tasks', value: reportData.inbound.totalTasks, subvalue: 'All completed/rejected', icon: Truck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Completed Outbound Tasks', value: reportData.outbound.totalTasks, subvalue: 'All completed/rejected', icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Completed Movements', value: reportData.movements.totalMovements, subvalue: 'All completed/rejected', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Completed Transfers', value: reportData.transfers.totalTransfers, subvalue: 'All completed/rejected', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Active Staff', value: reportData.staff.totalStaff, subvalue: 'Warehouse personnel', icon: Users, color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Toaster position="top-right" />
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center max-w-md">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <Package className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Akses Ditolak</h2>
          <p className="text-xs text-slate-500">Hanya user HQ/Warehouse yang dapat mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Toaster position="top-right" />
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="mt-4 text-slate-600">Loading reports...</p>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/hq/ops-dashboard" className="p-2.5 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all">
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Warehouse Operations Reporting</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Enterprise warehouse analytics and reports</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isGlobalRole && tenantList.length > 0 && (
            <select value={tenantId || ""} onChange={(e) => setSelectedTenantId(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 transition-all shadow-sm">
              {tenantList.map((t) => <option key={t.id} value={t.id}>{t.tenant_code} — {t.name}</option>)}
            </select>
          )}
          <button onClick={fetchReportData} disabled={loading} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-all">
            <FileSpreadsheet className="w-4 h-4" /> EXCEL
          </button>
          <button className="bg-rose-600 text-white px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs flex items-center gap-2 shadow-sm hover:bg-rose-700 transition-all">
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{card.value.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <p className="text-xs text-slate-400">{card.subvalue}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Inventory Analytics</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between"><span className="text-sm text-slate-600">Total Inventory Items</span><span className="font-medium">{reportData.inventory.totalItems}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-slate-600">Available Items</span><span className="font-medium text-green-600">{reportData.inventory.availableItems}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-slate-600">Inventory Value</span><span className="font-medium">Rp {reportData.inventory.totalValue.toLocaleString()}</span></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Completed Operations</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Completed Inbound Tasks', value: reportData.inbound.totalTasks, color: 'bg-green-500' },
              { label: 'Completed Outbound Tasks', value: reportData.outbound.totalTasks, color: 'bg-orange-500' },
              { label: 'Completed Movements', value: reportData.movements.totalMovements, color: 'bg-purple-500' },
              { label: 'Completed Transfers', value: reportData.transfers.totalTransfers, color: 'bg-indigo-500' },
            ].map((op, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1"><span className="text-sm text-slate-600">{op.label}</span><span className="text-sm font-medium">{op.value}</span></div>
                <div className="w-full bg-slate-200 rounded-full h-2"><div className={`${op.color} h-2 rounded-full`} style={{ width: '100%' }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}