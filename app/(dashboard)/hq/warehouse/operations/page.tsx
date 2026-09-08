'use client';

// [AI] HQ Warehouse Operations Monitor — unified oversight across WMS services
// Sources:
//  1. wo_items (sbu_type=WAREHOUSE) + job_orders  → authoritative WO-JO state (matches SBU warehouse view)
//  2. wh_tasks                                     → granular WMS task execution
//  3. wh_repacking_orders                          → Add Service (repacking/kitting/bundling)
// Lens: KPI cards per service, pipeline funnel, aging/stalled alerts, live feed

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Loader2, RefreshCw, Warehouse, AlertTriangle, ArrowDownToLine, ArrowUpFromLine,
  Wrench, ArrowLeftRight, Layers, X, Clock, CheckCircle2, Activity, Package, Search } from 'lucide-react';

type ServiceKey = 'INBOUND' | 'OUTBOUND' | 'TRANSFER' | 'ADD_SERVICE' | 'OTHER';
type Pipeline = 'PENDING' | 'ASSIGNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

interface OpsRow {
  id: string;
  source: 'WO_ITEM' | 'TASK' | 'REPACK';
  number: string;
  woNumber?: string;
  service: ServiceKey;
  serviceLabel: string;
  pipeline: Pipeline;
  statusLabel: string;
  customer: string;
  warehouseName: string;
  stage?: string;
  goodsSummary?: string;
  joDone?: number;
  joTotal?: number;
  priority: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  notes?: string;
}

const SERVICE_CONFIG: Record<ServiceKey | 'ALL' | 'STALLED', { label: string; icon: any; text: string; bg: string; border: string }> = {
  ALL:         { label: 'All', icon: Layers,            text: 'text-slate-700',    bg: 'bg-slate-50',     border: 'border-slate-200' },
  INBOUND:     { label: 'Inbound', icon: ArrowDownToLine, text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  OUTBOUND:    { label: 'Outbound', icon: ArrowUpFromLine, text: 'text-blue-700',  bg: 'bg-blue-50',    border: 'border-blue-200' },
  ADD_SERVICE: { label: 'Add Service', icon: Wrench,    text: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200' },
  TRANSFER:    { label: 'Transfer', icon: ArrowLeftRight, text: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  OTHER:       { label: 'Lainnya', icon: Layers,          text: 'text-slate-600',   bg: 'bg-slate-50',   border: 'border-slate-200' },
  STALLED:     { label: 'Stalled >24j', icon: AlertTriangle, text: 'text-rose-700', bg: 'bg-rose-50',   border: 'border-rose-200' },
};

// [AI] operation_type → service lens (aligned with HQ work-orders mapping)
const OP_TYPE_TO_SERVICE: Record<string, ServiceKey> = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND',
  STOCK_TRANSFER: 'TRANSFER',
  INTERNAL_MOVEMENT: 'TRANSFER',
  CROSS_DOCKING: 'ADD_SERVICE',
  VAS: 'ADD_SERVICE',
  REPACKING: 'ADD_SERVICE',
  KITTING: 'ADD_SERVICE',
  BUNDLING: 'ADD_SERVICE',
};

const TASK_TYPE_TO_SERVICE: Record<string, ServiceKey> = {
  INBOUND: 'INBOUND', PUTAWAY: 'INBOUND',
  OUTBOUND: 'OUTBOUND', PICKING: 'OUTBOUND', PACKING: 'OUTBOUND',
  TRANSFER: 'TRANSFER',
};

const DONE_JO = ['completed', 'done', 'selesai', 'pekerjaan selesai'];

function mapTaskPipeline(status: string): Pipeline {
  switch ((status || '').toUpperCase()) {
    case 'PENDING': return 'PENDING';
    case 'ASSIGNED': return 'ASSIGNED';
    case 'IN_PROGRESS': return 'ACTIVE';
    case 'COMPLETED': return 'COMPLETED';
    default: return 'CANCELLED';
  }
}

function parseItemData(raw: any): any {
  if (!raw) return {};
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return {}; } }
  return raw;
}

function deriveWoItemPipeline(itemStatus: string, jos: any[]): Pipeline {
  const relevant = (jos || []).filter(j => (j.status || '').toLowerCase() !== 'cancelled');
  if (relevant.length > 0 && relevant.every(j => (j.status || '').toLowerCase() === 'rejected')) return 'CANCELLED';
  const active = relevant.filter(j => (j.status || '').toLowerCase() !== 'rejected');
  if (active.length > 0 && active.every(j => DONE_JO.includes((j.status || '').toLowerCase()))) return 'COMPLETED';
  const s = (itemStatus || '').toLowerCase();
  if (['in_progress', 'truck_arrived', 'unloading', 'checking', 'putaway_in_progress'].includes(s)) return 'ACTIVE';
  if (['assigned', 'confirmed_assigned', 'dispatched'].includes(s)) return 'ASSIGNED';
  if (active.some(j => !DONE_JO.includes((j.status || '').toLowerCase()))) return 'ACTIVE';
  return 'PENDING';
}

// dd-mm-yy HH:mm
function fmtDT(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// [AI] Stable per-warehouse chip colors (multi-warehouse tenants need instant visual separation)
const WH_PALETTE = [
  { text: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { text: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  { text: 'text-fuchsia-700',bg: 'bg-fuchsia-50',border: 'border-fuchsia-200' },
  { text: 'text-cyan-700',   bg: 'bg-cyan-50',   border: 'border-cyan-200' },
  { text: 'text-lime-700',   bg: 'bg-lime-50',   border: 'border-lime-200' },
];
function getWarehouseStyle(name: string, warehouseNames: string[]) {
  const idx = Math.max(0, warehouseNames.indexOf(name));
  return WH_PALETTE[idx % WH_PALETTE.length];
}

function ageHours(row: OpsRow): number {
  const ref = row.pipeline === 'COMPLETED' && row.completedAt ? row.completedAt : row.createdAt;
  return (Date.now() - new Date(ref).getTime()) / 36e5;
}

function isStalled(row: OpsRow): boolean {
  return row.pipeline !== 'COMPLETED' && row.pipeline !== 'CANCELLED' && ageHours(row) > 24;
}

function ageColor(row: OpsRow): string {
  if (row.pipeline === 'COMPLETED') return 'text-slate-400 bg-slate-100 border-slate-200';
  const h = ageHours(row);
  if (h >= 24) return 'text-rose-700 bg-rose-50 border-rose-200 animate-pulse';
  if (h >= 8) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-emerald-700 bg-emerald-50 border-emerald-200';
}

function formatAge(row: OpsRow): string {
  const h = ageHours(row);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) return `${Math.floor(h)}j`;
  return `${Math.floor(h / 24)}h ${Math.floor(h % 24)}j`;
}

export default function WarehouseOperationsMonitor() {
  const supabase = createClient();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OpsRow[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [tab, setTab] = useState<'ALL' | ServiceKey | 'STALLED'>('ALL');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [selected, setSelected] = useState<OpsRow | null>(null);
  // [AI] Date-range & smart-search filters
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    try {
      const [woItemsRes, tasksRes, repacksRes, whRes] = await Promise.all([
        // 1. Authoritative WO-JO state (same source as SBU warehouse work-orders)
        supabase.from('wo_items').select(`
          id, item_code, status, sbu_type, item_data, created_at, updated_at,
          wo:work_orders(id, wo_number, status,
            customer:md_entities!customer_id(name, legal_name)),
          job_orders(id, jo_number, status, created_at, updated_at, assigned_warehouse_id, warehouse_id),
          wo_item_manifests(quantity, md_product_skus(name, sku_code))
        `).eq('tenant_id', profile.tenant_id).eq('sbu_type', 'WAREHOUSE')
          .order('updated_at', { ascending: false }).limit(400),
        // 2. Granular WMS task execution
        supabase.from('wh_tasks').select(`
          id, task_number, task_type, status, priority, notes, warehouse_id,
          created_at, updated_at, completed_at,
          warehouse:md_warehouses(name),
          wo_item:wo_items(
            wo:work_orders(id, wo_number, customer:md_entities!customer_id(name, legal_name))
          )
        `).eq('tenant_id', profile.tenant_id).order('updated_at', { ascending: false }).limit(300),
        // 3. Add Service orders
        supabase.from('wh_repacking_orders').select(`
          id, order_number, order_type, status, priority, notes, warehouse_id, current_stage,
          created_at, updated_at,
          warehouse:md_warehouses(name),
          customer:md_entities(name)
        `).eq('tenant_id', profile.tenant_id).order('updated_at', { ascending: false }).limit(200),
        supabase.from('md_warehouses').select('id, name').eq('is_active', true),
      ]);

      if (woItemsRes.error) console.warn('wo_items:', woItemsRes.error.message);
      if (tasksRes.error) console.warn('wh_tasks:', tasksRes.error.message);
      if (repacksRes.error) console.warn('wh_repacking_orders:', repacksRes.error.message);

      // [AI] Warehouse id → name resolution map (many wo_items only carry warehouse_id, not name)
      const whNameById: Record<string, string> = {};
      for (const w of whRes.data || []) whNameById[w.id] = w.name;
      const resolveWh = (...ids: any[]): string => {
        for (const id of ids) {
          if (id && whNameById[id]) return whNameById[id];
        }
        return '—';
      };

      // --- Source 1: WO Items ---
      const woItemRows: OpsRow[] = (woItemsRes.data || []).map((it: any) => {
        const data = parseItemData(it.item_data);
        const opType = (data.operation_type || '').toUpperCase();
        const service = OP_TYPE_TO_SERVICE[opType] || 'OTHER';
        const jos = it.job_orders || [];
        const joTotal = jos.filter((j: any) => (j.status || '').toLowerCase() !== 'cancelled').length;
        const joDone = jos.filter((j: any) => DONE_JO.includes((j.status || '').toLowerCase())).length;
        const goodsParts: string[] = [];
        if (data.unit_count) goodsParts.push(`${data.unit_count} Unit`);
        const skus = (it.wo_item_manifests || [])
          .map((m: any) => m.md_product_skus?.name)
          .filter(Boolean).slice(0, 3);
        if (skus.length > 0) goodsParts.push(skus.join(', ') + ((it.wo_item_manifests?.length || 0) > 3 ? ` +${it.wo_item_manifests.length - 3}` : ''));
        if (goodsParts.length === 0 && data.warehouse_name) goodsParts.push(data.warehouse_name);
        // Completed timestamp = latest completed JO, fallback updated_at
        const completedJos = jos.filter((j: any) => DONE_JO.includes((j.status || '').toLowerCase()));
        const lastCompletedAt = completedJobsLatest(completedJos);
        return {
          id: it.id,
          source: 'WO_ITEM' as const,
          number: it.item_code || it.id.slice(0, 8),
          woNumber: it.wo?.wo_number,
          service,
          serviceLabel: opType ? opType.replace(/_/g, ' ') : 'WAREHOUSE',
          pipeline: deriveWoItemPipeline(it.status, jos),
          statusLabel: (it.status || 'pending').replace(/_/g, ' '),
          customer: it.wo?.customer?.legal_name || it.wo?.customer?.name || '—',
          // [AI] Multi-fallback warehouse resolution: item name → item id → JO assigned → JO plain
          warehouseName: data.warehouse_name || resolveWh(
            data.warehouse_id,
            (jos[0] as any)?.assigned_warehouse_id,
            (jos[0] as any)?.warehouse_id
          ),
          stage: joTotal > 0 ? `${joDone}/${joTotal} JO` : undefined,
          goodsSummary: goodsParts.join(' · ') || undefined,
          joDone,
          joTotal,
          priority: 'NORMAL',
          createdAt: it.created_at,
          updatedAt: it.updated_at || it.created_at,
          completedAt: lastCompletedAt,
          notes: data.notes,
        };
      });

      // --- Source 2: WMS Tasks ---
      const taskRows: OpsRow[] = (tasksRes.data || []).map((t: any) => {
        const svc = TASK_TYPE_TO_SERVICE[t.task_type] || 'OTHER';
        return {
          id: t.id,
          source: 'TASK' as const,
          number: t.task_number,
          woNumber: t.wo_item?.wo?.wo_number,
          service: svc,
          serviceLabel: t.task_type,
          pipeline: mapTaskPipeline(t.status),
          statusLabel: (t.status || '').replace('_', ' '),
          customer: t.wo_item?.wo?.customer?.legal_name || t.wo_item?.wo?.customer?.name || '—',
          warehouseName: t.warehouse?.name || '—',
          priority: t.priority || 'NORMAL',
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          completedAt: t.completed_at,
          notes: t.notes,
        };
      });

      // --- Source 3: Repacking / Add Service ---
      const repackRows: OpsRow[] = (repacksRes.data || []).map((r: any) => {
        let pipeline: Pipeline = 'PENDING';
        const s = (r.status || '').toUpperCase();
        if (['COMPLETED', 'DONE', 'SELESAI'].includes(s)) pipeline = 'COMPLETED';
        else if (s === 'CANCELLED') pipeline = 'CANCELLED';
        else if (s === 'CREATED') pipeline = 'PENDING';
        else pipeline = 'ACTIVE';
        return {
          id: r.id,
          source: 'REPACK' as const,
          number: r.order_number,
          service: 'ADD_SERVICE' as const,
          serviceLabel: r.order_type ? `REPACKING · ${r.order_type}` : 'REPACKING',
          pipeline,
          statusLabel: s === 'CREATED' ? 'PLANNED' : (s || '—'),
          customer: r.customer?.name || '—',
          warehouseName: r.warehouse?.name || '—',
          stage: r.current_stage ? `Stage ${r.current_stage}/3` : undefined,
          priority: r.priority || 'NORMAL',
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          notes: r.notes,
        };
      });

      setWarehouses(whRes.data || []);
      setRows([...woItemRows, ...taskRows, ...repackRows]);
      setLastSync(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, supabase]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 60_000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const scoped = useMemo(() => {
    let list = rows.filter(r => warehouseFilter === 'all' || r.warehouseName === warehouses.find(w => w.id === warehouseFilter)?.name);

    // [AI] Date range filter — based on creation date
    if (dateFrom) {
      const from = new Date(dateFrom + 'T00:00:00').getTime();
      list = list.filter(r => new Date(r.createdAt).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59.999').getTime();
      list = list.filter(r => new Date(r.createdAt).getTime() <= to);
    }

    // [AI] Smart search — multi-keyword, matches number / WO / customer / goods / warehouse / status
    const q = search.trim().toLowerCase();
    if (q) {
      const tokens = q.split(/\s+/);
      list = list.filter(r => {
        const haystack = [
          r.number, r.woNumber, r.customer, r.goodsSummary,
          r.warehouseName, r.statusLabel, r.serviceLabel,
          SERVICE_CONFIG[r.service].label,
        ].filter(Boolean).join(' ').toLowerCase();
        return tokens.every(t => haystack.includes(t));
      });
    }

    return list;
  }, [rows, warehouseFilter, warehouses, dateFrom, dateTo, search]);

  const hasActiveFilters = !!(dateFrom || dateTo || search.trim()) || warehouseFilter !== 'all';

  const resetFilters = () => {
    setDateFrom(''); setDateTo(''); setSearch('');
    setWarehouseFilter('all');
    setTab('ALL');
  };

  const stats = useMemo(() => {
    const by = (svc: ServiceKey) => scoped.filter(r => r.service === svc);
    const activeCount = (list: OpsRow[]) => list.filter(r => r.pipeline !== 'COMPLETED' && r.pipeline !== 'CANCELLED').length;
    const inbound = by('INBOUND'); const outbound = by('OUTBOUND');
    const addsvc = by('ADD_SERVICE'); const transfer = by('TRANSFER');
    return {
      inbound: { total: inbound.length, active: activeCount(inbound), done: inbound.filter(r => r.pipeline === 'COMPLETED').length },
      outbound: { total: outbound.length, active: activeCount(outbound), done: outbound.filter(r => r.pipeline === 'COMPLETED').length },
      addsvc: { total: addsvc.length, active: activeCount(addsvc), done: addsvc.filter(r => r.pipeline === 'COMPLETED').length },
      transfer: { total: transfer.length, active: activeCount(transfer), done: transfer.filter(r => r.pipeline === 'COMPLETED').length },
      stalled: scoped.filter(isStalled).length,
      funnel: {
        pending: scoped.filter(r => r.pipeline === 'PENDING').length,
        assigned: scoped.filter(r => r.pipeline === 'ASSIGNED').length,
        active: scoped.filter(r => r.pipeline === 'ACTIVE').length,
        completed: scoped.filter(r => r.pipeline === 'COMPLETED').length,
      },
    };
  }, [scoped]);

  const filtered = useMemo(() => {
    let list = scoped;
    if (tab === 'STALLED') list = list.filter(isStalled);
    else if (tab !== 'ALL') list = list.filter(r => r.service === tab);
    return [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [scoped, tab]);

  // [AI] Known warehouse names — basis for stable chip colors & per-warehouse breakdown
  const warehouseNames = useMemo(() => {
    const fromMaster = (warehouses || []).map(w => w.name);
    const fromRows = scoped.map(r => r.warehouseName).filter(n => n && n !== '—');
    return [...new Set([...fromMaster, ...fromRows])];
  }, [warehouses, scoped]);

  // [AI] Per-warehouse activity breakdown — which location the work is happening at
  const whBreakdown = useMemo(() =>
    warehouseNames.map(name => {
      const list = scoped.filter(r => r.warehouseName === name);
      return {
        name,
        active: list.filter(r => r.pipeline !== 'COMPLETED' && r.pipeline !== 'CANCELLED').length,
        total: list.length,
      };
    }).filter(b => b.total > 0),
  [warehouseNames, scoped]);

  const feed = useMemo(() =>
    [...scoped].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6),
  [scoped]);

  const kpiCards: Array<{ key: 'INBOUND' | 'OUTBOUND' | 'ADD_SERVICE' | 'TRANSFER'; stat: typeof stats.inbound }> = [
    { key: 'INBOUND', stat: stats.inbound },
    { key: 'OUTBOUND', stat: stats.outbound },
    { key: 'ADD_SERVICE', stat: stats.addsvc },
    { key: 'TRANSFER', stat: stats.transfer },
  ];

  if (loading && rows.length === 0) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Memuat Operations Monitor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-950 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-950/20 text-white">
            <Activity size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">Operations Monitor</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-0.5">WO · JO · Task Gudang — Real-Time</p>
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
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <button onClick={() => fetchData()} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm" title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter bar: smart search + date range */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm flex flex-col lg:flex-row gap-2 lg:items-center">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari cerdas: nomor, WO, customer, barang, gudang, status... (multi kata)"
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tgl Dibuat</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all"
          />
          <span className="text-slate-300 font-black text-xs">s/d</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white transition-all"
          />
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all"
            >
              <X size={12} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map(({ key, stat }) => {
          const cfg = SERVICE_CONFIG[key];
          const Icon = cfg.icon;
          const pct = stat.total > 0 ? Math.round((stat.done / stat.total) * 100) : 0;
          const isActive = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(isActive ? 'ALL' : key)}
              className={`p-4 rounded-2xl border text-left transition-all hover:shadow-md ${cfg.bg} ${isActive ? `${cfg.border} ring-2 ring-offset-1 ring-indigo-400` : 'border-slate-200/80'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
                <Icon size={16} className={cfg.text} />
              </div>
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-black italic leading-none ${cfg.text}`}>{stat.active}</span>
                <span className="text-[10px] font-bold text-slate-400 mb-0.5">/ {stat.total} aktif</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/80 overflow-hidden border border-slate-100">
                <div className={`h-full rounded-full transition-all duration-500 ${key === 'ADD_SERVICE' ? 'bg-orange-400' : key === 'TRANSFER' ? 'bg-violet-400' : key === 'OUTBOUND' ? 'bg-blue-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[9px] font-bold text-slate-400 mt-1">{stat.done} selesai · {pct}%</p>
            </button>
          );
        })}
        <button
          onClick={() => setTab(tab === 'STALLED' ? 'ALL' : 'STALLED')}
          className={`p-4 rounded-2xl border text-left transition-all hover:shadow-md bg-white ${tab === 'STALLED' ? 'border-rose-400 ring-2 ring-offset-1 ring-rose-300' : 'border-slate-200/80'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">⚠ Perlu Atensi</span>
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <span className={`text-3xl font-black italic leading-none ${stats.stalled > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-300'}`}>{stats.stalled}</span>
          <p className="text-[9px] font-bold text-slate-400 mt-2">Task menunggu &gt;24 jam</p>
        </button>
      </div>

      {/* Per-warehouse activity breakdown — where is the work happening */}
      {whBreakdown.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1 flex items-center gap-1">
            <Warehouse size={12} /> Lokasi
          </span>
          {whBreakdown.map(b => {
            const style = getWarehouseStyle(b.name, warehouseNames);
            const isSelected = warehouses.find(w => w.id === warehouseFilter)?.name === b.name;
            return (
              <button
                key={b.name}
                onClick={() => {
                  const wh = warehouses.find(w => w.name === b.name);
                  setWarehouseFilter(isSelected || !wh ? 'all' : wh.id);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-left transition-all hover:shadow-sm ${style.bg} ${style.border} ${isSelected ? 'ring-2 ring-offset-1 ring-indigo-400' : ''}`}
              >
                <span className={`text-[10px] font-black uppercase tracking-wider ${style.text}`}>{b.name}</span>
                <span className="text-xs font-black text-slate-800">{b.active}<span className="text-[9px] font-bold text-slate-400">/{b.total} aktif</span></span>
              </button>
            );
          })}
        </div>
      )}

      {/* Funnel */}
      <div className="bg-white border border-slate-200/80 rounded-2xl px-5 py-4 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">Pipeline</span>
          {[
            { label: 'Menunggu', value: stats.funnel.pending, cls: 'bg-slate-100 text-slate-700 border-slate-200' },
            { label: 'Ditugaskan', value: stats.funnel.assigned, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
            { label: 'Proses', value: stats.funnel.active, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            { label: 'Selesai', value: stats.funnel.completed, cls: 'bg-indigo-950 text-white border-indigo-950' },
          ].map((s, i, arr) => (
            <span key={s.label} className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-black ${s.cls}`}>
                {s.label} <b className="text-sm">{s.value}</b>
              </span>
              {i < arr.length - 1 && <span className="text-slate-300 font-black">→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs + Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-0 border-b border-slate-100 flex gap-1 overflow-x-auto no-scrollbar">
          {(['ALL', 'INBOUND', 'OUTBOUND', 'ADD_SERVICE', 'TRANSFER', 'STALLED'] as const).map(t => {
            const cfg = SERVICE_CONFIG[t];
            const count = t === 'ALL' ? scoped.length
              : t === 'STALLED' ? stats.stalled
              : scoped.filter(r => r.service === t).length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${
                  tab === t ? 'border-indigo-900 text-indigo-950' : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                {cfg.label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] ${tab === t ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <CheckCircle2 size={36} className="text-emerald-200" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {tab === 'STALLED' ? 'Tidak ada task macet — semua lancar 🎯' : 'Tidak ada aktivitas pada filter ini'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.slice(0, 80).map(row => (
              <button
                key={`${row.source}-${row.id}`}
                onClick={() => setSelected(row)}
                className="w-full px-5 py-3 hover:bg-slate-50 transition-colors text-left block"
              >
                {/* Line 1: identity + status + age */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider shrink-0 ${SERVICE_CONFIG[row.service].bg} ${SERVICE_CONFIG[row.service].text} ${SERVICE_CONFIG[row.service].border}`}>
                    {SERVICE_CONFIG[row.service].label}
                  </span>
                  <span className="text-xs font-black text-slate-900 truncate">{row.number}</span>
                  {row.woNumber && (
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 truncate max-w-[160px]" title={row.woNumber}>
                      {row.woNumber}
                    </span>
                  )}
                  <span className="flex items-center gap-1 ml-auto shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      row.pipeline === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' :
                      row.pipeline === 'ASSIGNED' ? 'bg-blue-500' :
                      row.pipeline === 'COMPLETED' ? 'bg-indigo-800' :
                      row.pipeline === 'CANCELLED' ? 'bg-rose-400' : 'bg-slate-300'
                    }`} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">{row.statusLabel}</span>
                    {row.stage && <span className="text-[9px] font-bold text-slate-400">· {row.stage}</span>}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-black tabular-nums shrink-0 ${ageColor(row)}`}>
                    {formatAge(row)}
                  </span>
                </div>
                {/* Line 2: context metadata */}
                <div className="flex items-center gap-x-3 gap-y-0.5 mt-1 flex-wrap text-[10px] font-semibold text-slate-400 pl-0.5">
                  {row.warehouseName !== '—' && (() => {
                    const ws = getWarehouseStyle(row.warehouseName, warehouseNames);
                    return (
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-black uppercase tracking-wider shrink-0 ${ws.bg} ${ws.text} ${ws.border}`}>
                        <Warehouse size={10} />{row.warehouseName}
                      </span>
                    );
                  })()}
                  <span className="font-bold text-slate-600 truncate max-w-[220px]">{row.customer}</span>
                  {row.goodsSummary && (
                    <span className="flex items-center gap-1 truncate max-w-[280px]">
                      <Package size={11} className="shrink-0 text-slate-300" />{row.goodsSummary}
                    </span>
                  )}
                  <span className="flex items-center gap-1 shrink-0 tabular-nums">
                    <Clock size={11} className="text-slate-300" />{fmtDT(row.updatedAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Live Feed */}
      {feed.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Aktivitas Terakhir</h3>
          <div className="space-y-2">
            {feed.map(f => (
              <div key={`feed-${f.source}-${f.id}`} className="flex items-center gap-3 text-xs">
                <span className="text-[10px] font-bold text-slate-400 tabular-nums w-28 shrink-0">{fmtDT(f.updatedAt)}</span>
                <span className={`px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase shrink-0 ${SERVICE_CONFIG[f.service].bg} ${SERVICE_CONFIG[f.service].text} ${SERVICE_CONFIG[f.service].border}`}>
                  {f.statusLabel}
                </span>
                <span className="font-bold text-slate-700 truncate">{f.number}</span>
                <span className="text-slate-300">·</span>
                {f.warehouseName !== '—' && (() => {
                  const ws = getWarehouseStyle(f.warehouseName, warehouseNames);
                  return (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider shrink-0 ${ws.bg} ${ws.text} ${ws.border}`}>
                      <Warehouse size={10} />{f.warehouseName}
                    </span>
                  );
                })()}
                <span className="text-slate-400 font-medium truncate hidden md:inline">{f.customer}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={() => setSelected(null)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-start justify-between">
              <div>
                <p className={`inline-block px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider mb-1 ${SERVICE_CONFIG[selected.service].bg} ${SERVICE_CONFIG[selected.service].text} ${SERVICE_CONFIG[selected.service].border}`}>
                  {selected.serviceLabel}
                </p>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">{selected.number}</h3>
                <p className="text-xs font-bold text-slate-500">{selected.customer}</p>
                {selected.woNumber && <p className="text-[10px] font-bold text-slate-400 mt-0.5">WO: {selected.woNumber}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Timestamps timeline */}
              <div className="rounded-2xl border border-slate-100 divide-y divide-slate-50">
                {[
                  { icon: Clock, label: 'Dibuat', value: fmtDT(selected.createdAt), color: 'text-slate-400' },
                  { icon: Activity, label: 'Update Terakhir', value: fmtDT(selected.updatedAt), color: 'text-blue-500' },
                  ...(selected.completedAt ? [{ icon: CheckCircle2, label: 'Selesai', value: fmtDT(selected.completedAt), color: 'text-emerald-500' }] : []),
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <item.icon size={15} className={item.color} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 w-28">{item.label}</span>
                    <span className="text-xs font-bold text-slate-700 tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>

              {selected.goodsSummary && (
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Data Barang</p>
                  <p className="text-xs font-bold text-slate-700">{selected.goodsSummary}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{selected.statusLabel}{selected.stage ? ` · ${selected.stage}` : ''}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Umur</p>
                  <p className={`text-sm font-black mt-0.5 inline-block px-2 py-0.5 rounded-md border ${ageColor(selected)}`}>{formatAge(selected)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Prioritas</p>
                  <p className="text-sm font-black text-slate-800 mt-0.5">{selected.priority}</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Gudang</p>
                  {(() => {
                    const ws = getWarehouseStyle(selected.warehouseName, warehouseNames);
                    return (
                      <p className={`text-sm font-black mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${ws.bg} ${ws.text} ${ws.border}`}>
                        <Warehouse size={13} />{selected.warehouseName}
                      </p>
                    );
                  })()}
                </div>
              </div>

              {selected.joTotal != null && selected.joTotal > 0 && (
                <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-1">Job Orders</p>
                  <p className="text-sm font-black text-indigo-900">{selected.joDone}/{selected.joTotal} selesai</p>
                </div>
              )}

              {selected.notes && (
                <div className="rounded-xl bg-amber-50/60 border border-amber-100 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">Catatan</p>
                  <p className="text-xs font-medium text-slate-700">{selected.notes}</p>
                </div>
              )}

              {isStalled(selected) && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-rose-600" />
                  <p className="text-xs font-black text-rose-700">Task ini stalled — menunggu lebih dari 24 jam tanpa progres.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// helper: latest completed JO updated_at
function completedJobsLatest(completedJos: any[]): string | null {
  let latest: string | null = null;
  for (const j of completedJos || []) {
    const u = j.updated_at || null;
    if (u && (!latest || new Date(u) > new Date(latest))) latest = u;
  }
  return latest;
}
