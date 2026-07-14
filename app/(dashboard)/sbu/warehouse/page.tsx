"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Loader2, Package, PackageOpen, ArrowDownUp, AlertTriangle,
  TrendingUp, Clock, ClipboardCheck, Scan
} from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function SBUWarehouseDashboard() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

  const [stats, setStats] = useState({
    totalSku: 0,
    totalStock: 0,
    inboundPending: 0,
    inboundToday: 0,
    outboundPending: 0,
    outboundToday: 0,
    quarantined: 0,
    expiredSoon: 0,
    areasUtilization: [] as { area_name: string; area_type: string; total: number; occupied: number; pct: number }[],
    recentMovements: [] as { type: string; sku: string; qty: number; time: string }[],
  });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      let tenantId = profile?.tenant_id;
      const isHQ = profile?.role?.startsWith('hq_') || profile?.role === 'owner_sentralogis';

      if (!tenantId && isHQ) {
        const { data: tenantData } = await supabase.from('tenants').select('id').limit(1);
        if (tenantData?.length) tenantId = tenantData[0].id;
      }
      if (!tenantId) { setLoading(false); return; }
      
      let whId = profile?.warehouse_id;
      
      // Fetch warehouses for this tenant
      const { data: whData } = await supabase.from('md_warehouses').select('id, name').eq('tenant_id', tenantId);
      if (whData) setWarehouses(whData);

      if (!whId) {
        if (selectedWarehouse) {
          whId = selectedWarehouse;
        } else if (whData && whData.length > 0) {
          whId = whData[0].id;
          setSelectedWarehouse(whId);
        } else {
          setLoading(false);
          return;
        }
      } else {
        setSelectedWarehouse(whId);
      }

      const [
        invRes, taskRes, taskTodayRes, quarantineRes, expiryRes
      ] = await Promise.all([
        supabase.from('wh_inventory').select('quantity, product_sku_id').eq('tenant_id', tenantId).eq('warehouse_id', whId),
        supabase.from('wh_tasks').select('id').eq('tenant_id', tenantId).eq('warehouse_id', whId).in('status', ['PENDING', 'ASSIGNED', 'IN_PROGRESS']),
        supabase.from('wh_tasks').select('id').eq('tenant_id', tenantId).eq('warehouse_id', whId).gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from('wh_inventory').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('warehouse_id', whId).eq('status', 'QUARANTINE'),
        supabase.from('wh_inventory').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('warehouse_id', whId).lte('expiry_date', new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]),
      ]);

      const totalStock = (invRes.data || []).reduce((sum: number, i: any) => sum + Number(i.quantity || 0), 0);
      const totalSku = new Set((invRes.data || []).filter((i: any) => i.product_sku_id).map((i: any) => i.product_sku_id)).size;
      const totalPending = (taskRes.data || []).length;
      const totalToday = (taskTodayRes.data || []).length;

      const { data: areas } = await supabase
        .from('md_warehouse_areas')
        .select('id, area_name, area_type, total_capacity')
        .eq('tenant_id', tenantId)
        .eq('warehouse_id', whId);

      const areaUtil = await Promise.all((areas || []).map(async (a) => {
        const { count } = await supabase
          .from('wh_inventory')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('warehouse_id', whId)
          .in('status', ['AVAILABLE', 'RESERVED']);

        const zoneIdsRes = await supabase.from('md_warehouse_zones').select('id').eq('area_id', a.id);
        const zoneIds = (zoneIdsRes.data || []).map((z: any) => z.id);

        const { data: locs } = await supabase.from('md_warehouse_locations').select('id').in('zone_id', zoneIds);
        const locIds = (locs || []).map((l: any) => l.id);

        const { data: invs } = await supabase.from('wh_inventory').select('id').in('location_id', locIds).in('status', ['AVAILABLE', 'RESERVED']);
        const occupied = (invs || []).length;
        const total = Number(a.total_capacity) || 1;
        return { area_name: a.area_name, area_type: a.area_type, total, occupied, pct: Math.round((occupied / total) * 100) };
      }));

      setStats({
        totalSku,
        totalStock,
        inboundPending: totalPending,
        inboundToday: totalToday,
        outboundPending: totalPending,
        outboundToday: totalToday,
        quarantined: quarantineRes.count || 0,
        expiredSoon: expiryRes.count || 0,
        areasUtilization: areaUtil,
        recentMovements: [],
      });
    } catch (e) {
      console.error('SBU WH dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [profile, supabase, selectedWarehouse]);

  useEffect(() => { if (profile) fetchStats(); }, [profile, fetchStats, selectedWarehouse]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
    </div>
  );

  const kpiCards = [
    { label: 'Total SKU', value: stats.totalSku, icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Total Stock', value: `${stats.totalStock.toLocaleString()} pcs`, icon: PackageOpen, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Inbound Today', value: stats.inboundToday, icon: ArrowDownUp, color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { label: 'Outbound Today', value: stats.outboundToday, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-100' },
    { label: 'Quarantine', value: stats.quarantined, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Expiring Soon', value: stats.expiredSoon, icon: Clock, color: 'text-rose-600', bg: 'bg-rose-100' },
  ];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Warehouse Operations</h1>
          <p className="text-slate-500 text-sm mt-1">SBU Operational Dashboard</p>
        </div>
        {!profile?.warehouse_id && warehouses.length > 0 && (
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon size={18} className={kpi.color} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Area Utilization</h3>
          <div className="space-y-3">
            {stats.areasUtilization.length === 0 && (
              <p className="text-sm text-slate-400">No area data</p>
            )}
            {stats.areasUtilization.map((area) => (
              <div key={area.area_name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">{area.area_name}</span>
                  <span className="text-slate-500">
                    {area.occupied}/{area.total} ({area.pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      area.pct > 85 ? 'bg-red-500' : area.pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(area.pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'New Inbound', icon: Scan, href: '/sbu/warehouse/inbound', color: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100' },
              { label: 'New Outbound', icon: ClipboardCheck, href: '/sbu/warehouse/outbound', color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' },
              { label: 'Check Stock', icon: Package, href: '/sbu/warehouse/inventory', color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
              { label: 'Task Board', icon: ArrowDownUp, href: '/sbu/warehouse', color: 'text-violet-600 bg-violet-50 border-violet-200 hover:bg-violet-100' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${action.color} transition-all`}
              >
                <action.icon size={24} />
                <span className="text-xs font-semibold">{action.label}</span>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
