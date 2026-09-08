"use client";

// [AI] Warehouse Command Center — HQ overview answering 3 questions:
// 1) How much capacity is left? 2) How active is today vs normal? 3) What needs attention?
// NOTE: occupancy is derived from real stock (wh_inventory.location_id),
// NOT bin_status — that column never existed in md_warehouse_locations.

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Warehouse, MapPin, Box, Package, Activity, AlertTriangle,
  ArrowDownToLine, ArrowUpFromLine, Clock, RefreshCw, ChevronRight, Layers,
} from "lucide-react";
import Link from "next/link";

const DONE_JO = ['completed', 'done', 'selesai'];
const TASK_TYPE_TO_SERVICE: Record<string, string> = {
  INBOUND: 'Inbound', PUTAWAY: 'Inbound',
  OUTBOUND: 'Outbound', PICKING: 'Outbound', PACKING: 'Outbound',
  TRANSFER: 'Transfer',
};
const IN_TYPES = ['INBOUND', 'PUTAWAY', 'ADJUSTMENT_PLUS', 'KITTING_OUTPUT'];
const OUT_TYPES = ['OUTBOUND', 'PICKING', 'ADJUSTMENT_MINUS', 'KITTING_CONSUME'];

function fmtDT(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface AreaRow { area_name: string; area_type: string; total_capacity: number; uom_capacity: string; warehouse_id: string }

export default function HQWarehouseOverview() {
  const supabase = createClient();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [locations, setLocations] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    const tId = profile.tenant_id;
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString();
      const [whRes, areaRes, locRes, invRes, taskRes, moveRes] = await Promise.all([
        supabase.from("md_warehouses").select("id, name, code").eq("tenant_id", tId).eq("is_active", true),
        supabase.from("md_warehouse_areas").select("area_name, area_type, total_capacity, uom_capacity, warehouse_id").eq("tenant_id", tId).eq("is_active", true),
        supabase.from("md_warehouse_locations").select("id, warehouse_id, location_type").eq("tenant_id", tId).eq("is_active", true).limit(5000),
        supabase.from("wh_inventory").select(`
          id, location_id, quantity, batch_number, expiry_date,
          product_sku:md_product_skus(id, name, customer:md_entities(name))
        `).eq("tenant_id", tId).gt("quantity", 0).limit(5000),
        supabase.from("wh_tasks").select("id, task_type, status, created_at").eq("tenant_id", tId)
          .neq("status", "COMPLETED").neq("status", "CANCELLED").limit(1000),
        supabase.from("wh_inventory_movements").select(`
          id, movement_type, quantity, created_at,
          inventory:wh_inventory(
            product_sku:md_product_skus(name),
            location:md_warehouse_locations(code)
          )
        `).eq("tenant_id", tId).gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: false }).limit(800),
      ]);

      setWarehouses(whRes.data || []);
      setAreas((areaRes.data || []) as any);
      setLocations(locRes.data || []);
      setInventory(invRes.data || []);
      setTasks(taskRes.data || []);
      setMovements(moveRes.data || []);
      setLastSync(new Date());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [profile?.tenant_id, supabase]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 60_000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // location → warehouse resolution
  const locWhMap = useMemo(() => Object.fromEntries((locations || []).map(l => [l.id, l.warehouse_id])), [locations]);
  const invLocIds = useMemo(() => new Set(
    inventory.filter(i => i.quantity > 0 && i.location_id && locations.some(l => l.id === i.location_id)).map(i => i.location_id)
  ), [inventory, locations]);

  const filtered = useMemo(() => {
    const whMatch = (whId?: string | null) => warehouseFilter === 'all' || !whId || whId === warehouseFilter;
    return {
      locations: locations.filter(l => whMatch(l.warehouse_id)),
      inventory: inventory.filter(i => !i.location_id || whMatch(locWhMap[i.location_id])),
      areas: areas.filter(a => whMatch(a.warehouse_id)),
      tasks,
      movements: movements.filter(m => {
        const locId = m.inventory?.location?.id || m.inventory?.location_id;
        return !locId || whMatch(locWhMap[locId]);
      }),
    };
  }, [inventory, locations, areas, tasks, movements, warehouseFilter, locWhMap]);

  const stats = useMemo(() => {
    const storageLocs = filtered.locations.filter(l => (l.location_type || 'STORAGE') === 'STORAGE' || true);
    const totalBins = storageLocs.length;
    const occupiedBins = new Set(filtered.inventory.filter(i => i.location_id && invLocIds.has(i.location_id)).map(i => i.location_id)).size;

    const stalled = filtered.tasks.filter(t =>
      (Date.now() - new Date(t.created_at).getTime()) / 36e5 > 24);

    const svcCount: Record<string, number> = {};
    filtered.tasks.forEach(t => {
      const k = TASK_TYPE_TO_SERVICE[t.task_type] || 'Lainnya';
      svcCount[k] = (svcCount[k] || 0) + 1;
    });

    // Throughput: today vs avg of previous days within window
    const dayKey = (iso: string) => new Date(iso).toDateString();
    const daily: Record<string, { inQty: number; outQty: number }> = {};
    filtered.movements.forEach(m => {
      const k = dayKey(m.created_at);
      daily[k] = daily[k] || { inQty: 0, outQty: 0 };
      if (IN_TYPES.includes(m.movement_type)) daily[k].inQty += Number(m.quantity) || 0;
      else if (OUT_TYPES.includes(m.movement_type)) daily[k].outQty += Number(m.quantity) || 0;
    });
    const todayKey = new Date().toDateString();
    const today = daily[todayKey] || { inQty: 0, outQty: 0 };
    const prevDays = Object.entries(daily).filter(([k]) => k !== todayKey);
    const nPrev = Math.max(1, prevDays.length);
    const avgIn = Math.round(prevDays.reduce((s, [, v]) => s + v.inQty, 0) / nPrev);
    const avgOut = Math.round(prevDays.reduce((s, [, v]) => s + v.outQty, 0) / nPrev);

    // 7-day series oldest → newest
    const series: Array<{ label: string; inQty: number; outQty: number }> = [];
    for (let d = 6; d >= 0; d--) {
      const dt = new Date(Date.now() - d * 864e5);
      const v = daily[dt.toDateString()] || { inQty: 0, outQty: 0 };
      series.push({ label: `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`, ...v });
    }

    // Per-warehouse occupancy
    const perWh = warehouses.map(w => {
      const whLocs = filtered.locations.filter(l => l.warehouse_id === w.id);
      const occupied = new Set(
        filtered.inventory.filter(i => i.location_id && locWhMap[i.location_id] === w.id).map(i => i.location_id)
      ).size;
      return { ...w, totalBins: whLocs.length, occupied, pct: whLocs.length ? Math.round((occupied / whLocs.length) * 100) : 0 };
    });

    // FEFO watch — expiring ≤30 days
    const fefo = filtered.inventory
      .filter(i => i.expiry_date && i.quantity > 0)
      .map(i => ({ ...i, daysLeft: Math.ceil((new Date(i.expiry_date).getTime() - Date.now()) / 864e5) }))
      .filter(i => i.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 6);

    // Top customers by stock qty
    const custMap: Record<string, number> = {};
    filtered.inventory.forEach(i => {
      const c = i.product_sku?.customer?.name || 'Tanpa Customer';
      custMap[c] = (custMap[c] || 0) + (Number(i.quantity) || 0);
    });
    const topCustomers = Object.entries(custMap).map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty).slice(0, 5);

    return {
      totalBins, occupiedBins, utilPct: totalBins ? Math.round((occupiedBins / totalBins) * 100) : 0,
      activeTasks: filtered.tasks.length, svcCount, stalled: stalled.length,
      today, avgIn, avgOut, series, perWh, fefo, topCustomers,
    };
  }, [filtered, warehouses, invLocIds, locWhMap]);

  const utilTone = stats.utilPct >= 90 ? { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', bar: 'bg-rose-500' }
    : stats.utilPct >= 70 ? { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-500' }
    : { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500' };

  const maxSeriesVal = Math.max(1, ...stats.series.map(s => Math.max(s.inQty, s.outQty)));

  if (loading && !lastSync) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-950 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-950/20 text-white">
            <Warehouse size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">Warehouse Command Center</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-0.5">Kapasitas · Aktivitas · Kesehatan Stok</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            {lastSync && <span className="text-emerald-600/70 font-bold">{lastSync.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
          </span>
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-900/10"
          >
            <option value="all">Semua Gudang</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.code ? `${w.code} · ${w.name}` : w.name}</option>)}
          </select>
          <button onClick={() => fetchData()} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Health Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Utilization */}
        <div className={`p-4 rounded-2xl border ${utilTone.bg} ${utilTone.border}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-black uppercase tracking-widest ${utilTone.text}`}>Utilisasi Kapasitas</span>
            <Box size={16} className={utilTone.text} />
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-black italic leading-none ${utilTone.text}`}>{stats.utilPct}%</span>
            <span className="text-[10px] font-bold text-slate-400 mb-1">{stats.occupiedBins}/{stats.totalBins} bin</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/80 overflow-hidden border border-slate-100">
            <div className={`h-full rounded-full transition-all duration-500 ${utilTone.bar}`} style={{ width: `${Math.min(100, stats.utilPct)}%` }} />
          </div>
        </div>
        {/* Active Tasks */}
        <Link href="/hq/warehouse/operations" className="block">
          <div className="p-4 rounded-2xl border bg-blue-50 border-blue-200 h-full hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Task Aktif</span>
              <Activity size={16} className="text-blue-600" />
            </div>
            <span className="text-3xl font-black italic leading-none text-blue-700">{stats.activeTasks}</span>
            <p className="text-[9px] font-bold text-slate-400 mt-2">
              {Object.entries(stats.svcCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}
            </p>
          </div>
        </Link>
        {/* Stalled */}
        <Link href="/hq/warehouse/operations" className="block">
          <div className={`p-4 rounded-2xl border h-full hover:shadow-md transition-all ${stats.stalled > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200/80'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-black uppercase tracking-widest ${stats.stalled > 0 ? 'text-rose-700' : 'text-slate-400'}`}>Stalled &gt;24 Jam</span>
              <AlertTriangle size={16} className={stats.stalled > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-300'} />
            </div>
            <span className={`text-3xl font-black italic leading-none ${stats.stalled > 0 ? 'text-rose-600' : 'text-slate-300'}`}>{stats.stalled}</span>
            <p className="text-[9px] font-bold text-slate-400 mt-2">perlu atensi → Operations</p>
          </div>
        </Link>
        {/* Throughput */}
        <div className="p-4 rounded-2xl border bg-violet-50 border-violet-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-violet-700">Throughput Hari Ini</span>
            <Layers size={16} className="text-violet-600" />
          </div>
          <div className="flex items-end gap-3">
            <span className="flex items-center gap-1 text-xl font-black italic text-emerald-700 leading-none">
              <ArrowDownToLine size={14} />{stats.today.inQty}
            </span>
            <span className="flex items-center gap-1 text-xl font-black italic text-orange-600 leading-none">
              <ArrowUpFromLine size={14} />{stats.today.outQty}
            </span>
          </div>
          <p className="text-[9px] font-bold text-slate-400 mt-2">avg 7 hari: ⬇{stats.avgIn} / ⬆{stats.avgOut} unit</p>
        </div>
      </div>

      {/* Row 2: Capacity per warehouse + 7-day activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capacity per warehouse */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Kapasitas per Gudang</h3>
            <MapPin size={14} className="text-slate-300" />
          </div>
          {stats.perWh.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Belum ada gudang terdaftar</p>
          ) : (
            <div className="space-y-4">
              {stats.perWh.map(w => {
                const tone = w.pct >= 90 ? 'bg-rose-500' : w.pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';
                const badge = w.pct >= 90 ? '🔴' : w.pct >= 70 ? '🟡' : '🟢';
                const whAreas = filtered.areas.filter(a => a.warehouse_id === w.id);
                const cap = whAreas.reduce((s, a) => s + (Number(a.total_capacity) || 0), 0);
                return (
                  <div key={w.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-black text-slate-800 truncate">{badge} {w.code || w.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 truncate">{w.name}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-500 tabular-nums shrink-0">{w.occupied}/{w.totalBins} bin · {w.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${tone}`} style={{ width: `${Math.min(100, w.pct)}%` }} />
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                      {whAreas.length} area{cap > 0 ? ` · kapasitas master ${cap.toLocaleString('id-ID')}` : ''}
                      {whAreas.slice(0, 3).length > 0 && ` · ${[...new Set(whAreas.map(a => a.area_type))].join(', ')}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 7-day activity chart */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Aktivitas 7 Hari</h3>
            <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-wider">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400" />Masuk</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-400" />Keluar</span>
            </div>
          </div>
          <div className="flex items-end justify-between gap-2 h-36">
            {stats.series.map(s => (
              <div key={s.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  <div className="w-1/2 max-w-[18px] rounded-t-md bg-emerald-300 transition-all duration-500" style={{ height: `${Math.max(2, (s.inQty / maxSeriesVal) * 100)}%` }} title={`Masuk: ${s.inQty}`} />
                  <div className="w-1/2 max-w-[18px] rounded-t-md bg-blue-300 transition-all duration-500" style={{ height: `${Math.max(2, (s.outQty / maxSeriesVal) * 100)}%` }} title={`Keluar: ${s.outQty}`} />
                </div>
                <span className="text-[8px] font-bold text-slate-400 tabular-nums">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: FEFO + Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FEFO Watch */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">⏰ FEFO Watch — Expiry ≤30 Hari</h3>
            <Clock size={14} className="text-slate-300" />
          </div>
          {stats.fefo.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Tidak ada stok mendekati expiry 🎯</p>
          ) : (
            <div className="space-y-2">
              {stats.fefo.map(f => (
                <div key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{f.product_sku?.name || 'SKU'}</p>
                    <p className="text-[9px] font-bold text-slate-400">
                      Batch {f.batch_number || '-'} · {f.quantity.toLocaleString('id-ID')} unit · exp {fmtDT(f.expiry_date).split(' ')[0]}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-1 rounded-md border text-[10px] font-black tabular-nums ${
                    f.daysLeft <= 7 ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                    : f.daysLeft <= 14 ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    {f.daysLeft <= 0 ? 'EXPIRED' : `${f.daysLeft} hari`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top customers */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Top Customer by Stock</h3>
            <Package size={14} className="text-slate-300" />
          </div>
          {stats.topCustomers.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Belum ada stok customer</p>
          ) : (() => {
            const max = Math.max(...stats.topCustomers.map(c => c.qty));
            return (
              <div className="space-y-3">
                {stats.topCustomers.map(c => (
                  <div key={c.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700 truncate">{c.name}</span>
                      <span className="text-[10px] font-black text-slate-500 tabular-nums">{c.qty.toLocaleString('id-ID')} unit</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600" style={{ width: `${Math.max(4, (c.qty / max) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Recent movements with context */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Movement Terakhir</h3>
          <Link href="/hq/warehouse/inventory" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 flex items-center">
            Inventory <ChevronRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {movements.slice(0, 8).map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 px-5 py-2.5 text-xs">
              <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider shrink-0 ${
                IN_TYPES.includes(m.movement_type) ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : OUT_TYPES.includes(m.movement_type) ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {m.movement_type.replace(/_/g, ' ')}
              </span>
              <span className="font-bold text-slate-700 truncate max-w-[220px]">{m.inventory?.product_sku?.name || '—'}</span>
              {m.inventory?.location?.code && (
                <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 shrink-0">{m.inventory.location.code}</span>
              )}
              <span className="ml-auto font-black text-slate-600 tabular-nums shrink-0">{Number(m.quantity).toLocaleString('id-ID')}</span>
              <span className="text-[9px] font-semibold text-slate-400 tabular-nums shrink-0 w-28 text-right">{fmtDT(m.created_at)}</span>
            </div>
          ))}
          {movements.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">Belum ada movement dalam 7 hari</p>
          )}
        </div>
      </div>
    </div>
  );
}
