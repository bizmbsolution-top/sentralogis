"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  BarChart3,
  PieChart,
  Truck,
  Warehouse,
  Ship,
  LayoutGrid,
  ArrowUpRight,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  FileText,
  CreditCard,
  Target,
} from "lucide-react";
import Link from "next/link";

const SBU_ICONS: Record<string, React.ElementType> = {
  TRUCKING: Truck,
  WAREHOUSE: Warehouse,
  FORWARDING: Ship,
  CLEARANCE: LayoutGrid,
};

const SBU_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  TRUCKING: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", bar: "bg-blue-500" },
  WAREHOUSE: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", bar: "bg-emerald-500" },
  FORWARDING: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200", bar: "bg-purple-500" },
  CLEARANCE: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", bar: "bg-amber-500" },
  OTHER: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", bar: "bg-slate-500" },
};

function formatRupiah(val: number): string {
  if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `Rp ${(val / 1_000).toFixed(0)}K`;
  return `Rp ${val.toLocaleString("id-ID")}`;
}

function formatRupiahFull(val: number): string {
  return `Rp ${val.toLocaleString("id-ID")}`;
}

export default function HQBusinessDashboard() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    currentRevenue: 0,
    lastRevenue: 0,
    revenueVariance: 0,
    totalCogs: 0,
    grossMargin: 0,
    arOutstanding: 0,
    apOutstanding: 0,
    activeJobs: 0,
    completedJobs: 0,
    totalJobs: 0,
  });
  const [sbuData, setSbuData] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [customerConcentration, setCustomerConcentration] = useState(0);
  const [sbuPieData, setSbuPieData] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) {
      setLoading(false);
      return;
    }

    const tenantId = profile.tenant_id;

    try {
      setLoading(true);

      // Fetch all job orders with relationships
      const { data: jos } = await supabase
        .from("job_orders")
        .select(`
          id, base_price, purchase_price, status, created_at, completed_at,
          wo_item:wo_items!wo_item_id (
            sbu_type,
            wo:work_orders!wo_id (
              customer_id,
              customer:md_entities!customer_id (name)
            )
          )
        `)
        .eq("tenant_id", tenantId);

      if (!jos || jos.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch invoices for AR outstanding
      const woIds = jos.map((j: any) => j.wo_item?.wo_id).filter(Boolean);
      const { data: invoices } = await supabase
        .from("invoices")
        .select("total_billing, status")
        .in("wo_id", woIds)
        .in("status", ["sent", "accepted"]);

      // Fetch vendor invoices for AP outstanding
      const { data: vendorInvoices } = await supabase
        .from("vendor_invoices")
        .select("invoice_amount, status")
        .in("wo_id", woIds)
        .in("status", ["verified", "submitted"]);

      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Calculate revenue & COGS
      let currentRevenue = 0;
      let lastRevenue = 0;
      let totalCogs = 0;
      let activeJobs = 0;
      let completedJobs = 0;

      const sbuMap = new Map<string, { revenue: number; cogs: number; jobs: number; completed: number }>();
      const customerMap = new Map<string, number>();
      const monthMap = new Map<string, { revenue: number; cogs: number; label: string }>();

      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7);
        const label = d.toLocaleString("default", { month: "short" });
        monthMap.set(key, { revenue: 0, cogs: 0, label });
      }

      jos.forEach((jo: any) => {
        const revenue = Number(jo.base_price) || 0;
        const cogs = Number(jo.purchase_price) || 0;
        const sbuType = (jo.wo_item?.sbu_type || "OTHER").toUpperCase();
        const customerName = jo.wo_item?.wo?.customer?.name || "Unknown";
        const createdDate = new Date(jo.created_at);
        const monthKey = createdDate.toISOString().slice(0, 7);

        // Monthly revenue
        if (createdDate >= startOfCurrentMonth) currentRevenue += revenue;
        if (createdDate >= startOfLastMonth && createdDate < startOfCurrentMonth) lastRevenue += revenue;

        totalCogs += cogs;

        // Job status
        if (["completed", "COMPLETED", "PEKERJAAN SELESAI", "ready_for_billing", "invoiced", "paid"].includes(jo.status)) {
          completedJobs++;
        } else {
          activeJobs++;
        }

        // SBU aggregation
        if (!sbuMap.has(sbuType)) {
          sbuMap.set(sbuType, { revenue: 0, cogs: 0, jobs: 0, completed: 0 });
        }
        const sbu = sbuMap.get(sbuType)!;
        sbu.revenue += revenue;
        sbu.cogs += cogs;
        sbu.jobs++;
        if (["completed", "COMPLETED", "PEKERJAAN SELESAI", "ready_for_billing", "invoiced", "paid"].includes(jo.status)) {
          sbu.completed++;
        }

        // Customer aggregation
        customerMap.set(customerName, (customerMap.get(customerName) || 0) + revenue);

        // Monthly trend
        if (monthMap.has(monthKey)) {
          const m = monthMap.get(monthKey)!;
          m.revenue += revenue;
          m.cogs += cogs;
        }
      });

      const revenueVariance = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;
      const grossMargin = currentRevenue > 0 ? ((currentRevenue - totalCogs) / currentRevenue) * 100 : 0;
      const arOutstanding = (invoices || []).reduce((sum, inv) => sum + (Number(inv.total_billing) || 0), 0);
      const apOutstanding = (vendorInvoices || []).reduce((sum, vi) => sum + (Number(vi.invoice_amount) || 0), 0);

      // Customer concentration (top 3 customer % of total revenue)
      const totalRevenue = jos.reduce((sum, j) => sum + (Number(j.base_price) || 0), 0);
      const top3Revenue = Array.from(customerMap.values())
        .sort((a, b) => b - a)
        .slice(0, 3)
        .reduce((sum, v) => sum + v, 0);
      const concentration = totalRevenue > 0 ? (top3Revenue / totalRevenue) * 100 : 0;

      // Format SBU data
      const formattedSBU = Array.from(sbuMap.entries())
        .map(([name, data]) => ({
          name,
          revenue: data.revenue,
          cogs: data.cogs,
          margin: data.revenue > 0 ? ((data.revenue - data.cogs) / data.revenue) * 100 : 0,
          jobs: data.jobs,
          completed: data.completed,
          completionRate: data.jobs > 0 ? (data.completed / data.jobs) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Format monthly trend
      const formattedTrend = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, data]) => ({
          month: data.label || key,
          revenue: data.revenue,
          cogs: data.cogs,
          margin: data.revenue > 0 ? ((data.revenue - data.cogs) / data.revenue) * 100 : 0,
        }));

      // Format top customers
      const formattedCustomers = Array.from(customerMap.entries())
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // SBU pie data
      const pieData = formattedSBU.map((s) => ({
        name: s.name,
        value: s.revenue,
        percentage: totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0,
      }));

      setMetrics({
        currentRevenue,
        lastRevenue,
        revenueVariance,
        totalCogs,
        grossMargin,
        arOutstanding,
        apOutstanding,
        activeJobs,
        completedJobs,
        totalJobs: jos.length,
      });

      setSbuData(formattedSBU);
      setMonthlyTrend(formattedTrend);
      setTopCustomers(formattedCustomers);
      setCustomerConcentration(concentration);
      setSbuPieData(pieData);
    } catch (err) {
      console.error("HQ Business Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [profile, supabase]);

  useEffect(() => {
    if (profile) fetchData();
  }, [profile, fetchData]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400">Loading business dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <BarChart3 size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Business Intelligence</p>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">Business Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Data synced
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <DollarSign size={18} />
              </div>
              <Badge variant={metrics.revenueVariance >= 0 ? "success" : "danger"}>
                {metrics.revenueVariance >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(metrics.revenueVariance).toFixed(1)}%
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mb-1">Revenue (This Month)</p>
            <p className="text-xl font-semibold text-slate-900">{formatRupiah(metrics.currentRevenue)}</p>
          </Card>

          <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <Target size={18} />
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-1">Gross Margin</p>
            <p className="text-xl font-semibold text-slate-900">{metrics.grossMargin.toFixed(1)}%</p>
            <p className="text-[10px] text-slate-400 mt-1">COGS: {formatRupiah(metrics.totalCogs)}</p>
          </Card>

          <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                <CreditCard size={18} />
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-1">AR Outstanding</p>
            <p className="text-xl font-semibold text-slate-900">{formatRupiah(metrics.arOutstanding)}</p>
            <p className="text-[10px] text-slate-400 mt-1">AP: {formatRupiah(metrics.apOutstanding)}</p>
          </Card>

          <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                <Activity size={18} />
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-1">Active Jobs</p>
            <p className="text-xl font-semibold text-slate-900">{metrics.activeJobs}</p>
            <p className="text-[10px] text-slate-400 mt-1">
              Completed: {metrics.completedJobs} / {metrics.totalJobs}
            </p>
          </Card>
        </div>

        {/* Revenue Trend + SBU Contribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend */}
          <Card className="lg:col-span-2 p-6 border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Revenue Trend</h3>
                <p className="text-xs text-slate-400 mt-0.5">6 months revenue vs COGS</p>
              </div>
            </div>

            {monthlyTrend.length > 0 ? (
              <div className="h-56 flex items-end justify-between gap-4 px-2">
                {monthlyTrend.map((d, idx) => {
                  const maxVal = Math.max(...monthlyTrend.map((x) => x.revenue)) || 1;
                  const revenueHeight = (d.revenue / maxVal) * 100;
                  const cogsHeight = d.revenue > 0 ? (d.cogs / maxVal) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex items-end gap-1 h-44">
                        <div
                          className="flex-1 bg-slate-200 rounded-t transition-all duration-500"
                          style={{ height: `${cogsHeight}%`, minHeight: "2px" }}
                          title={`COGS: ${formatRupiahFull(d.cogs)}`}
                        />
                        <div
                          className="flex-1 bg-blue-500 rounded-t transition-all duration-500"
                          style={{ height: `${revenueHeight}%`, minHeight: "2px" }}
                          title={`Revenue: ${formatRupiahFull(d.revenue)}`}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-slate-500">{d.month}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No data available</div>
            )}

            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-xs text-slate-500">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-200 rounded" />
                <span className="text-xs text-slate-500">COGS</span>
              </div>
            </div>
          </Card>

          {/* SBU Contribution */}
          <Card className="p-6 border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="flex items-center gap-2 mb-6">
              <PieChart size={16} className="text-slate-400" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">SBU Contribution</h3>
                <p className="text-xs text-slate-400 mt-0.5">Revenue share per unit</p>
              </div>
            </div>

            <div className="space-y-4">
              {sbuPieData.map((sbu, idx) => {
                const colors = SBU_COLORS[sbu.name] || SBU_COLORS.OTHER;
                const Icon = SBU_ICONS[sbu.name] || Activity;
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${colors.bg} ${colors.text} rounded-lg flex items-center justify-center`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-700 truncate">{sbu.name}</span>
                        <span className="text-xs font-semibold text-slate-900">{sbu.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${colors.bar} rounded-full`} style={{ width: `${sbu.percentage}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {customerConcentration > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={14} className={customerConcentration > 70 ? "text-amber-500" : "text-emerald-500"} />
                  <span className="text-xs font-medium text-slate-600">Customer Concentration</span>
                </div>
                <p className="text-xs text-slate-400">
                  Top 3 customers: <span className="font-semibold text-slate-700">{customerConcentration.toFixed(1)}%</span> of total revenue
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* SBU Performance Table */}
        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">SBU Performance</h3>
            <p className="text-xs text-slate-400 mt-0.5">Revenue, COGS, margin & completion rate</p>
          </div>

          {sbuData.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">No SBU data available</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="px-5 py-3">SBU</th>
                    <th className="px-5 py-3 text-right">Revenue</th>
                    <th className="px-5 py-3 text-right">COGS</th>
                    <th className="px-5 py-3 text-right">Margin</th>
                    <th className="px-5 py-3 text-center">Jobs</th>
                    <th className="px-5 py-3 text-center">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sbuData.map((sbu, idx) => {
                    const colors = SBU_COLORS[sbu.name] || SBU_COLORS.OTHER;
                    const Icon = SBU_ICONS[sbu.name] || Activity;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 ${colors.bg} ${colors.text} rounded-lg flex items-center justify-center`}>
                              <Icon size={14} />
                            </div>
                            <span className="text-sm font-medium text-slate-700">{sbu.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-sm font-medium text-slate-900">{formatRupiahFull(sbu.revenue)}</td>
                        <td className="px-5 py-4 text-right text-sm text-slate-500">{formatRupiahFull(sbu.cogs)}</td>
                        <td className="px-5 py-4 text-right">
                          <span className={`text-sm font-semibold ${sbu.margin >= 20 ? "text-emerald-600" : sbu.margin >= 10 ? "text-amber-600" : "text-rose-600"}`}>
                            {sbu.margin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center text-sm text-slate-600">{sbu.jobs}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${colors.bar} rounded-full`} style={{ width: `${sbu.completionRate}%` }} />
                            </div>
                            <span className="text-xs font-medium text-slate-500 w-10 text-right">{sbu.completionRate.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Top Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Top Customers</h3>
                <p className="text-xs text-slate-400 mt-0.5">By total revenue</p>
              </div>
              <Link href="/hq/customers" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {topCustomers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No customer data</div>
            ) : (
              <div className="space-y-4">
                {topCustomers.slice(0, 8).map((cust, idx) => {
                  const maxRev = topCustomers[0]?.revenue || 1;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-400 w-6 text-right">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700 truncate">{cust.name}</span>
                          <span className="text-sm font-semibold text-slate-900 ml-2">{formatRupiah(cust.revenue)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(cust.revenue / maxRev) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="p-6 border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900">Quick Access</h3>
              <p className="text-xs text-slate-400 mt-0.5">Navigate to detailed reports</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/hq/work-orders" className="group">
                <div className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all">
                  <FileText size={18} className="text-blue-600 mb-2" />
                  <p className="text-xs font-medium text-slate-700">Work Orders</p>
                  <p className="text-[10px] text-slate-400">All orders</p>
                </div>
              </Link>

              <Link href="/hq/invoice-customer" className="group">
                <div className="p-4 border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all">
                  <DollarSign size={18} className="text-emerald-600 mb-2" />
                  <p className="text-xs font-medium text-slate-700">AR Invoicing</p>
                  <p className="text-[10px] text-slate-400">Customer invoices</p>
                </div>
              </Link>

              <Link href="/hq/finance/cost-audit" className="group">
                <div className="p-4 border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-sm transition-all">
                  <CreditCard size={18} className="text-amber-600 mb-2" />
                  <p className="text-xs font-medium text-slate-700">AP Audit</p>
                  <p className="text-[10px] text-slate-400">Vendor costs</p>
                </div>
              </Link>

              <Link href="/hq/finance/summary" className="group">
                <div className="p-4 border border-slate-200 rounded-xl hover:border-purple-300 hover:shadow-sm transition-all">
                  <BarChart3 size={18} className="text-purple-600 mb-2" />
                  <p className="text-xs font-medium text-slate-700">Finance Summary</p>
                  <p className="text-[10px] text-slate-400">P&L overview</p>
                </div>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
