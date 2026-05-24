"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge, ProgressBar } from "@/components/ui/Badge";
import {
  Warehouse,
  MapPin,
  Box,
  Package,
  ClipboardList,
  Activity,
  TrendingUp,
  AlertTriangle,
  Thermometer,
} from "lucide-react";
import Link from "next/link";

interface OverviewMetrics {
  warehouses: number;
  areas: number;
  bins: number;
  totalBins: number;
  skus: number;
  inventoryItems: number;
  activeTasks: number;
  totalCapacityPal: number;
  occupiedPal: number;
}

interface AreaUtil {
  area_name: string;
  area_type: string;
  total_capacity: number;
  uom_capacity: string;
  occupied: number;
}

export default function HQWarehouseOverview() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<OverviewMetrics>({
    warehouses: 0, areas: 0, bins: 0, totalBins: 0,
    skus: 0, inventoryItems: 0, activeTasks: 0,
    totalCapacityPal: 0, occupiedPal: 0,
  });
  const [areaUtil, setAreaUtil] = useState<AreaUtil[]>([]);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) { setLoading(false); return; }
    const tId = profile.tenant_id;
    setLoading(true);
    try {
      const [whRes, areaRes, binRes, skuRes, invRes, taskRes, moveRes] = await Promise.all([
        supabase.from("md_warehouses").select("id", { count: "exact", head: true }).eq("tenant_id", tId).eq("is_active", true),
        supabase.from("md_warehouse_areas").select("id, area_name, area_type, total_capacity, uom_capacity", { count: "exact", head: false }).eq("tenant_id", tId).eq("is_active", true),
        supabase.from("md_warehouse_locations").select("id, bin_status", { count: "exact", head: false }).eq("tenant_id", tId).eq("is_active", true),
        supabase.from("md_product_skus").select("id", { count: "exact", head: true }).eq("tenant_id", tId).eq("is_active", true),
        supabase.from("wh_inventory").select("id", { count: "exact", head: true }).eq("tenant_id", tId),
        supabase.from("wh_tasks").select("id", { count: "exact", head: true }).eq("tenant_id", tId).neq("status", "COMPLETED").neq("status", "CANCELLED"),
        supabase.from("wh_inventory_movements").select("id, movement_type, quantity, created_at, to_location_id").eq("tenant_id", tId).order("created_at", { ascending: false }).limit(10),
      ]);

      const areas = areaRes.data || [];
      const bins = binRes.data || [];
      const occupiedBins = bins.filter(b => b.bin_status === "OCCUPIED").length;
      const totalCapPal = areas.reduce((s, a) => s + (a.total_capacity || 0), 0);

      setMetrics({
        warehouses: whRes.count || 0,
        areas: areas.length,
        bins: bins.length,
        totalBins: bins.length,
        skus: skuRes.count || 0,
        inventoryItems: invRes.count || 0,
        activeTasks: taskRes.count || 0,
        totalCapacityPal: totalCapPal,
        occupiedPal: occupiedBins,
      });

      setAreaUtil(areas.map(a => ({
        area_name: a.area_name,
        area_type: a.area_type,
        total_capacity: a.total_capacity || 0,
        uom_capacity: a.uom_capacity || "PALLET",
        occupied: bins.filter(b => b.bin_status === "OCCUPIED").length,
      })));

      setRecentMovements(moveRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [profile, supabase]);

  useEffect(() => { if (profile) fetchData(); }, [profile, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  const kpiCards = [
    { label: "Warehouses", value: metrics.warehouses, icon: Warehouse, color: "text-blue-600", bg: "bg-blue-50", href: "#" },
    { label: "Areas", value: metrics.areas, icon: MapPin, color: "text-emerald-600", bg: "bg-emerald-50", href: "#" },
    { label: "Location Bins", value: metrics.bins, icon: Box, color: "text-purple-600", bg: "bg-purple-50", href: "#" },
    { label: "SKUs", value: metrics.skus, icon: Package, color: "text-amber-600", bg: "bg-amber-50", href: "/hq/warehouse/inventory" },
    { label: "Inventory Items", value: metrics.inventoryItems, icon: ClipboardList, color: "text-cyan-600", bg: "bg-cyan-50", href: "/hq/warehouse/inventory" },
    { label: "Active Tasks", value: metrics.activeTasks, icon: Activity, color: "text-rose-600", bg: "bg-rose-50", href: "#" },
  ];

  const areaTypeLabel: Record<string, string> = {
    YARD: "Yard", INDOOR_FLOOR: "Indoor Floor", RACKING: "Racking",
    COLD_FREEZER: "Cold Freezer", COLD_CHILLER: "Cold Chiller",
    HAZMAT: "Hazmat", BONDED: "Bonded",
  };

  const ARENA_COLORS: Record<string, string> = {
    YARD: "bg-slate-400", INDOOR_FLOOR: "bg-emerald-500", RACKING: "bg-blue-500",
    COLD_FREEZER: "bg-cyan-400", COLD_CHILLER: "bg-teal-400",
    HAZMAT: "bg-red-500", BONDED: "bg-amber-500",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Warehouse Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time monitoring dan utilisasi gudang</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((k) => {
          const Icon = k.icon;
          return (
            <Link key={k.label} href={k.href}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${k.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{k.value}</p>
                    <p className="text-xs text-slate-500 font-medium">{k.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="text-sm font-bold text-slate-900">Area Utilization</h2>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {areaUtil.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No areas configured yet</p>
            ) : (
              areaUtil.map((a, i) => {
                const pct = a.total_capacity > 0 ? Math.round((a.occupied / a.total_capacity) * 100) : 0;
                const barColor = pct > 90 ? "warning" : pct > 70 ? "primary" : "success";
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${ARENA_COLORS[a.area_type] || "bg-slate-300"}`} />
                        <span className="font-medium text-slate-700">{a.area_name}</span>
                        <Badge variant="default">{areaTypeLabel[a.area_type] || a.area_type}</Badge>
                      </div>
                      <span className="text-xs text-slate-500">
                        {a.occupied} / {a.total_capacity} {a.uom_capacity} ({pct}%)
                      </span>
                    </div>
                    <ProgressBar value={a.occupied} max={a.total_capacity || 1} variant={barColor as any} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-slate-900">Quick Summary</h2>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Bin Utilization</span>
              <span className="text-sm font-bold">
                {metrics.totalBins > 0 ? Math.round((metrics.occupiedPal / metrics.totalBins) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Capacity Used</span>
              <span className="text-sm font-bold">
                {metrics.totalCapacityPal > 0
                  ? `${Math.round((metrics.occupiedPal / metrics.totalCapacityPal) * 100)}%`
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Active Tasks</span>
              <span className="text-sm font-bold">{metrics.activeTasks}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Total SKUs</span>
              <span className="text-sm font-bold">{metrics.skus}</span>
            </div>

            <div className="pt-2 space-y-2">
              <Link href="/hq/warehouse/inbound" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <span>→</span> Go to Inbound
              </Link>
              <Link href="/hq/warehouse/outbound" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <span>→</span> Go to Outbound
              </Link>
              <Link href="/hq/warehouse/inventory" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <span>→</span> Browse Inventory
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {recentMovements.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-bold text-slate-900">Recent Inventory Movements</h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {recentMovements.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between px-6 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={m.movement_type === "INBOUND" ? "success" : m.movement_type === "OUTBOUND" ? "danger" : "info"}>
                      {m.movement_type}
                    </Badge>
                    <span className="text-slate-600">{m.quantity} units</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(m.created_at).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
