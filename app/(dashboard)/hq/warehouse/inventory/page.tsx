"use client";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// [AI] Inventory Explorer — professional stock visibility:
// KPI strip, smart search, warehouse/status/expiry filters, flat & per-SKU grouped views, CSV export

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Search, Package, RefreshCw, X, Layers, MapPin, Clock,
  AlertTriangle, Download, Boxes, Users,
} from "lucide-react";

interface InvRow {
  id: string;
  inventoryCode: string;
  skuCode: string;
  productName: string;
  customer: string;
  quantity: number;
  reserved: number;
  available: number;
  batch: string;
  expiryDate: string | null;
  status: string;
  binCode: string;
  areaLabel: string;
  zoneCode: string;
  warehouseName: string;
}

const STATUS_CONFIG: Record<string, { label: string; text: string; bg: string; border: string }> = {
  AVAILABLE:  { label: 'Available',  text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  RESERVED:   { label: 'Reserved',   text: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  QUARANTINE: { label: 'Quarantine', text: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  DAMAGED:    { label: 'Damaged',    text: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  EXPIRED:    { label: 'Expired',    text: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200' },
};

// [AI] Movement classification for stock card
const MOVE_IN_TYPES = ['INBOUND', 'PUTAWAY', 'ADJUSTMENT_PLUS', 'KITTING_OUTPUT'];
const MOVE_OUT_TYPES = ['OUTBOUND', 'PICKING', 'ADJUSTMENT_MINUS', 'KITTING_CONSUME'];
function moveDirection(t: string): 'IN' | 'OUT' | 'TRANSFER' | 'ADJ' {
  if (MOVE_IN_TYPES.includes(t)) return 'IN';
  if (MOVE_OUT_TYPES.includes(t)) return 'OUT';
  if (t === 'TRANSFER') return 'TRANSFER';
  return 'ADJ';
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${String(d.getFullYear()).slice(2)}`;
}

function expiryDaysLeft(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 864e5);
}

function ExpiryChip({ iso }: { iso: string | null }) {
  const dl = expiryDaysLeft(iso);
  if (dl === null) return <span className="text-[10px] text-slate-300">—</span>;
  const tone = dl <= 0 ? 'bg-rose-100 text-rose-800 border-rose-300'
    : dl <= 7 ? 'bg-rose-50 text-rose-700 border-rose-200'
    : dl <= 30 ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-slate-50 text-slate-500 border-slate-200';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-md border text-[9px] font-black tabular-nums ${tone}`}>
      {fmtDate(iso)}{dl <= 30 ? ` · ${dl <= 0 ? 'EXPIRED' : `${dl}h`}` : ''}
    </span>
  );
}

const WH_PALETTE = [
  { text: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { text: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  { text: 'text-fuchsia-700',bg: 'bg-fuchsia-50',border: 'border-fuchsia-200' },
  { text: 'text-cyan-700',   bg: 'bg-cyan-50',   border: 'border-cyan-200' },
];

export default function HQWarehouseInventory() {
  const supabase = createClient();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [items, setItems] = useState<InvRow[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [view, setView] = useState<'FLAT' | 'SKU'>('FLAT');
  // [AI] Stock Card drawer state
  const [cardSku, setCardSku] = useState<string | null>(null);
  const [cardCustomer, setCardCustomer] = useState<string>('');
  const [cardLoading, setCardLoading] = useState(false);
  interface CardMove {
    id: string; type: string; dir: 'IN' | 'OUT' | 'TRANSFER' | 'ADJ';
    qty: number; createdAt: string;
    fromLoc?: string; toLoc?: string; notes?: string; refType?: string; saldo: number;
  }
  const [cardMoves, setCardMoves] = useState<CardMove[]>([]);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    try {
      const [invRes, whRes] = await Promise.all([
        supabase.from("wh_inventory").select(`
          id, inventory_code, quantity, reserved_quantity, available_quantity,
          batch_number, expiry_date, status, updated_at,
          product_sku:md_product_skus!product_sku_id (sku_code, name, customer:md_entities(name)),
          location:md_warehouse_locations!location_id (
            code, area:md_warehouse_areas!area_id (area_name, area_code),
            zone:md_warehouse_zones!zone_id (zone_code)
          ),
          warehouse:md_warehouses!warehouse_id (name)
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("updated_at", { ascending: false })
        .limit(1000),
        supabase.from("md_warehouses").select("id, name").eq("tenant_id", profile.tenant_id).eq("is_active", true),
      ]);

      setWarehouses(whRes.data || []);
      setItems((invRes.data || []).map((i: any) => ({
        id: i.id,
        inventoryCode: i.inventory_code || '-',
        skuCode: i.product_sku?.sku_code || '-',
        productName: i.product_sku?.name || '-',
        customer: i.product_sku?.customer?.name || '—',
        quantity: Number(i.quantity) || 0,
        reserved: Number(i.reserved_quantity) || 0,
        available: Number(i.available_quantity) || 0,
        batch: i.batch_number || '-',
        expiryDate: i.expiry_date || null,
        status: i.status || 'AVAILABLE',
        binCode: i.location?.code || '-',
        areaLabel: i.location?.area?.area_code || i.location?.area?.area_name || '-',
        zoneCode: i.location?.zone?.zone_code || '-',
        warehouseName: i.warehouse?.name || '-',
      })));
      setLastSync(new Date());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [profile?.tenant_id, supabase]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 60_000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // [AI] Stock Card — full movement history for one SKU of ONE goods owner (customer), across all lots
  const openStockCard = useCallback(async (skuCode: string, customer?: string) => {
    setCardSku(skuCode);
    setCardCustomer(customer || '');
    setCardMoves([]);
    // [AI] Same SKU can belong to different owners — scope lots by customer when provided
    const lots = items.filter(i => i.skuCode === skuCode && (!customer || i.customer === customer));
    if (lots.length === 0) return;
    setCardLoading(true);
    try {
      const invIds = lots.map(l => l.id);
      // fetch in chunks of 50 ids
      let all: any[] = [];
      for (let i = 0; i < invIds.length; i += 50) {
        const chunk = invIds.slice(i, i + 50);
        const { data } = await supabase.from('wh_inventory_movements').select(`
          id, movement_type, quantity, created_at, notes, reference_type,
          from_location:md_warehouse_locations!from_location_id(code),
          to_location:md_warehouse_locations!to_location_id(code)
        `).in('inventory_id', chunk).order('created_at', { ascending: true });
        all = all.concat(data || []);
      }
      all.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      // running saldo (oldest → newest)
      let saldo = 0;
      const mapped: CardMove[] = all.map((m: any) => {
        const dir = moveDirection(m.movement_type);
        if (dir === 'IN') saldo += Number(m.quantity) || 0;
        else if (dir === 'OUT') saldo -= Number(m.quantity) || 0;
        return {
          id: m.id,
          type: m.movement_type,
          dir,
          qty: Number(m.quantity) || 0,
          createdAt: m.created_at,
          fromLoc: m.from_location?.code,
          toLoc: m.to_location?.code,
          notes: m.notes,
          refType: m.reference_type,
          saldo,
        };
      });
      setCardMoves(mapped.reverse()); // newest first
    } catch (err) { console.error(err); }
    finally { setCardLoading(false); }
  }, [items, supabase]);

  // Warehouse names → stable colors
  const warehouseNames = useMemo(() => [...new Set(items.map(i => i.warehouseName).filter(n => n && n !== '-'))], [items]);
  const whStyle = (name: string) => WH_PALETTE[Math.max(0, warehouseNames.indexOf(name)) % WH_PALETTE.length];

  const filtered = useMemo(() => items.filter(i => {
    if (warehouseFilter !== 'all') {
      const whName = warehouses.find(w => w.id === warehouseFilter)?.name;
      if (i.warehouseName !== whName) return false;
    }
    if (statusFilter === 'EXPIRING') {
      const dl = expiryDaysLeft(i.expiryDate);
      if (dl === null || dl > 30) return false;
    } else if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;

    const q = search.trim().toLowerCase();
    if (q) {
      const tokens = q.split(/\s+/);
      const haystack = [
        i.skuCode, i.productName, i.batch, i.binCode, i.areaLabel,
        i.zoneCode, i.customer, i.warehouseName, i.inventoryCode, i.status,
      ].join(' ').toLowerCase();
      if (!tokens.every(t => haystack.includes(t))) return false;
    }
    return true;
  }), [items, warehouses, warehouseFilter, statusFilter, search]);

  // KPI stats from filtered set
  const stats = useMemo(() => {
    const skus = new Set(filtered.map(i => i.skuCode));
    const bins = new Set(filtered.filter(i => i.binCode !== '-').map(i => `${i.warehouseName}|${i.binCode}`));
    const totalQty = filtered.reduce((s, i) => s + i.quantity, 0);
    const availQty = filtered.reduce((s, i) => s + i.available, 0);
    const reservedQty = filtered.reduce((s, i) => s + i.reserved, 0);
    const expiring = filtered.filter(i => { const d = expiryDaysLeft(i.expiryDate); return d !== null && d <= 30; }).length;
    const customers = new Set(filtered.map(i => i.customer).filter(c => c !== '—'));
    return { skuCount: skus.size, bins: bins.size, totalQty, availQty, reservedQty, expiring, customers: customers.size };
  }, [filtered]);

  // Grouped per-SKU view — keyed by SKU **per owner** (same SKU under 2 customers = 2 groups)
  const grouped = useMemo(() => {
    interface SkuGroup {
      key: string; productName: string; skuCode: string; customer: string;
      totalQty: number; available: number; batches: Set<string>; locs: Set<string>;
      nearestExpiry: string | null; warehouses: Set<string>;
    }
    const map = new Map<string, SkuGroup>();
    filtered.forEach(i => {
      // [AI] group key = customer + SKU — pemilik barang adalah pemisah utama
      const key = `${i.customer}||${i.skuCode}`;
      let g = map.get(key);
      if (!g) {
        g = { key, productName: i.productName, skuCode: i.skuCode, customer: i.customer,
              totalQty: 0, available: 0, batches: new Set(), locs: new Set(), nearestExpiry: null, warehouses: new Set() };
        map.set(key, g);
      }
      g.totalQty += i.quantity;
      g.available += i.available;
      if (i.batch !== '-') g.batches.add(i.batch);
      if (i.binCode !== '-') g.locs.add(`${i.warehouseName}|${i.binCode}`);
      g.warehouses.add(i.warehouseName);
      if (i.expiryDate && (!g.nearestExpiry || i.expiryDate < g.nearestExpiry)) g.nearestExpiry = i.expiryDate;
    });
    return [...map.values()].sort((a, b) => b.totalQty - a.totalQty);
  }, [filtered]);

  const hasFilters = !!(search.trim() || statusFilter !== 'ALL' || warehouseFilter !== 'all');

  const exportCsv = () => {
    const header = ['Inventory Code', 'Warehouse', 'Bin', 'Area', 'Zone', 'SKU', 'Product', 'Customer', 'Batch', 'Expiry', 'Status', 'Qty', 'Reserved', 'Available'];
    const lines = filtered.map(i => [
      i.inventoryCode, i.warehouseName, i.binCode, i.areaLabel, i.zoneCode,
      i.skuCode, i.productName, i.customer, i.batch,
      fmtDate(i.expiryDate), i.status, i.quantity, i.reserved, i.available,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['\uFEFF' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    { label: 'Total SKU', value: stats.skuCount, icon: Boxes, cls: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    { label: 'Qty On Hand', value: stats.totalQty.toLocaleString('id-ID'), icon: Package, cls: 'text-slate-700 bg-slate-50 border-slate-200' },
    { label: 'Available', value: stats.availQty.toLocaleString('id-ID'), icon: CheckIcon, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    { label: 'Reserved', value: stats.reservedQty.toLocaleString('id-ID'), icon: LockIcon, cls: 'text-blue-700 bg-blue-50 border-blue-200' },
    { label: 'Bin Terisi', value: stats.bins, icon: MapPin, cls: 'text-violet-700 bg-violet-50 border-violet-200' },
    { label: 'Expiry ≤30 Hari', value: stats.expiring, icon: AlertTriangle, cls: stats.expiring > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-400 bg-slate-50 border-slate-200' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-950 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-950/20 text-white">
            <Boxes size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">Inventory Explorer</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-0.5">Stok per SKU · Lot · Lokasi Bin</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            {lastSync && <span className="text-emerald-600/70 font-bold">{lastSync.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
          </span>
          <button onClick={() => fetchData()} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm" title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`p-4 rounded-2xl border ${k.cls}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-80">{k.label}</span>
                <Icon size={14} />
              </div>
              <span className="text-2xl font-black italic leading-none">{k.value}</span>
            </div>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm flex flex-col lg:flex-row gap-2 lg:items-center">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari cerdas: SKU, produk, batch, lokasi bin, area, customer... (multi kata)"
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:bg-white"
        >
          <option value="all">Semua Gudang</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        {/* View toggle */}
        <div className="flex bg-slate-100 rounded-xl p-0.5">
          {(['FLAT', 'SKU'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {v === 'FLAT' ? 'Detail' : 'Per SKU'}
            </button>
          ))}
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 hover:text-slate-900 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          title={`Export ${filtered.length} baris ke CSV`}
        >
          <Download size={13} /> CSV
        </button>
      </div>

      {/* Status chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'ALL', label: 'Semua' },
          ...Object.entries(STATUS_CONFIG).map(([id, c]) => ({ id, label: c.label })),
          { id: 'EXPIRING', label: '⚠ Expiry ≤30 Hari' },
        ].map(s => {
          const count = s.id === 'ALL' ? items.length
            : s.id === 'EXPIRING' ? items.filter(i => { const d = expiryDaysLeft(i.expiryDate); return d !== null && d <= 30; }).length
            : items.filter(i => i.status === s.id).length;
          const active = statusFilter === s.id;
          const sc = STATUS_CONFIG[s.id];
          return (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all shrink-0 ${
                active
                  ? (sc ? `${sc.bg} ${sc.text} ${sc.border} ring-2 ring-offset-1 ring-indigo-300` : 'bg-indigo-950 text-white border-indigo-950')
                  : 'bg-white text-slate-400 border-slate-200 hover:text-slate-700'
              }`}
            >
              {s.label} <span className={`ml-1 px-1 py-0.5 rounded text-[8px] ${active ? 'bg-white/25' : 'bg-slate-100'}`}>{count}</span>
            </button>
          );
        })}
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setStatusFilter('ALL'); setWarehouseFilter('all'); }}
            className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all shrink-0"
          >
            Reset
          </button>
        )}
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-900 rounded-full animate-spin" />
        </div>
      ) : view === 'FLAT' ? (
        /* ===== FLAT TABLE ===== */
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1050px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Produk / SKU</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Customer</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Lokasi</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Batch / Expiry</th>
                  <th className="px-4 py-3 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Qty</th>
                  <th className="px-4 py-3 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Tersedia</th>
                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-xs font-bold text-slate-400">Tidak ada stok cocok dengan filter</td></tr>
                ) : filtered.map(i => {
                  const ws = whStyle(i.warehouseName);
                  return (
                    <tr key={i.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer" onClick={() => openStockCard(i.skuCode, i.customer)} title="Buka Stock Card">
                      <td className="px-4 py-3">
                        <p className="text-xs font-black text-slate-900 truncate max-w-[220px]">{i.productName}</p>
                        <p className="text-[9px] font-bold text-slate-400 font-mono">{i.skuCode}{i.inventoryCode !== '-' && ` · ${i.inventoryCode}`}</p>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-semibold text-slate-600 truncate max-w-[130px]">{i.customer}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {(() => {
                            const wst = whStyle(i.warehouseName);
                            return (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase shrink-0 ${wst.bg} ${wst.text} ${wst.border}`}>
                                <MapPin size={9} />{i.warehouseName.replace(/^GUDANG /i, '')}
                              </span>
                            );
                          })()}
                          <div className="min-w-0">
                            <p className="text-[11px] font-mono font-bold text-slate-700">{i.binCode}</p>
                            <p className="text-[9px] font-semibold text-slate-400 truncate max-w-[140px]">{[i.zoneCode, i.areaLabel].filter(z => z && z !== '-').join(' · ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[10px] font-mono font-bold text-slate-600 mb-0.5">{i.batch}</p>
                        <ExpiryChip iso={i.expiryDate} />
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900 tabular-nums">{i.quantity.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-black text-emerald-600 tabular-nums">{i.available.toLocaleString('id-ID')}</span>
                        {i.reserved > 0 && <p className="text-[9px] font-bold text-blue-500 tabular-nums">−{i.reserved} reserved</p>}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const sc = STATUS_CONFIG[i.status];
                          return (
                            <span className={`inline-block px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${sc ? `${sc.bg} ${sc.text} ${sc.border}` : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {sc?.label || i.status}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">{filtered.length} dari {items.length} lot ditampilkan</span>
            <span className="text-[10px] font-bold text-slate-400">Auto-refresh 60s</span>
          </div>
        </div>
      ) : (
        /* ===== GROUPED PER SKU ===== */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {grouped.length === 0 ? (
            <div className="col-span-full bg-white border border-dashed border-slate-200 rounded-3xl py-16 text-center">
              <Package size={32} className="mx-auto text-slate-200 mb-3" />
              <p className="text-xs font-bold text-slate-400">Tidak ada SKU cocok dengan filter</p>
            </div>
          ) : grouped.map(g => (
            <div
              key={g.key}
              onClick={() => openStockCard(g.skuCode, g.customer)}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer"
              title="Buka Stock Card"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-slate-900 truncate">{g.productName}</h4>
                  <p className="text-[9px] font-mono font-bold text-slate-400">{g.skuCode}</p>
                </div>
                <span className="text-lg font-black italic text-indigo-700 shrink-0 tabular-nums">{g.totalQty.toLocaleString('id-ID')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1.5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-wider text-emerald-600">Tersedia</p>
                  <p className="text-xs font-black text-emerald-700 tabular-nums">{g.available.toLocaleString('id-ID')}</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-1.5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Lot</p>
                  <p className="text-xs font-black text-slate-700 tabular-nums">{g.batches.size}</p>
                </div>
                <div className="rounded-lg bg-violet-50 border border-violet-100 px-2 py-1.5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-wider text-violet-500">Bin</p>
                  <p className="text-xs font-black text-violet-700 tabular-nums">{g.locs.size}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-1.5 text-[9px] font-bold text-slate-400">
                <span className="truncate"><Users size={9} className="inline mr-0.5" />{g.customer}</span>
                {g.nearestExpiry && <ExpiryChip iso={g.nearestExpiry} />}
              </div>
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {[...g.warehouses].map(w => {
                  const ws = whStyle(w);
                  return (
                    <span key={w} className={`px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase ${ws.bg} ${ws.text} ${ws.border}`}>
                      <MapPin size={8} className="inline mr-0.5" />{w.replace(/^GUDANG /i, '')}
                    </span>
                  );
                })}
                <button
                  onClick={(e) => { e.stopPropagation(); setSearch(g.skuCode); setView('FLAT'); }}
                  className="ml-auto text-[9px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-800 flex items-center"
                >
                  Lihat lot <ChevronRightInline />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* ===== STOCK CARD DRAWER ===== */}
      {cardSku && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={() => setCardSku(null)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            {(() => {
              // [AI] scope lots to this SKU **and owner** — same SKU under 2 customers stays separate
              const lots = items.filter(i => i.skuCode === cardSku && (!cardCustomer || i.customer === cardCustomer));
              const first = lots[0];
              const totalQty = lots.reduce((s, l) => s + l.quantity, 0);
              const totalAvail = lots.reduce((s, l) => s + l.available, 0);
              return (
                <>
                  <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-start justify-between z-10">
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">Stock Card</p>
                      <h3 className="text-base font-black text-slate-900 tracking-tight truncate">{first?.productName || cardSku}</h3>
                      <p className="text-[10px] font-mono font-bold text-slate-400">{cardSku} · {first?.customer || '—'}</p>
                    </div>
                    <button onClick={() => setCardSku(null)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors shrink-0">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-center">
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">On Hand</p>
                        <p className="text-sm font-black text-slate-800 tabular-nums">{totalQty.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-center">
                        <p className="text-[8px] font-black uppercase tracking-wider text-emerald-600">Tersedia</p>
                        <p className="text-sm font-black text-emerald-700 tabular-nums">{totalAvail.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="rounded-xl bg-violet-50 border border-violet-100 px-3 py-2.5 text-center">
                        <p className="text-[8px] font-black uppercase tracking-wider text-violet-500">Lot / Bin</p>
                        <p className="text-sm font-black text-violet-700 tabular-nums">{lots.length}/{new Set(lots.map(l => `${l.warehouseName}|${l.binCode}`)).size}</p>
                      </div>
                    </div>

                    {/* Lots */}
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Lot Saat Ini</p>
                      <div className="rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
                        {lots.map(l => (
                          <div key={l.id} className="flex items-center gap-2 px-3 py-2 text-[10px]">
                            <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md border font-black uppercase ${whStyle(l.warehouseName).bg} ${whStyle(l.warehouseName).text} ${whStyle(l.warehouseName).border}`}>
                              <MapPin size={8} />{l.warehouseName.replace(/^GUDANG /i, '')}
                            </span>
                            <span className="font-mono font-bold text-slate-700">{l.binCode}</span>
                            <span className="font-semibold text-slate-400 truncate">{l.batch}</span>
                            <span className="ml-auto font-black text-slate-800 tabular-nums">{l.quantity.toLocaleString('id-ID')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Movement history (stock card) */}
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Riwayat Gerak ({cardMoves.length})</p>
                      {cardLoading ? (
                        <div className="py-10 flex justify-center"><RefreshCw size={18} className="animate-spin text-slate-300" /></div>
                      ) : cardMoves.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-6 rounded-xl border border-dashed border-slate-200">Belum ada riwayat gerak tercatat</p>
                      ) : (
                        <div className="rounded-2xl border border-slate-100 overflow-hidden">
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="bg-slate-50/70 text-left text-[8px] font-black uppercase tracking-widest text-slate-400">
                                <th className="px-2.5 py-2">Waktu</th>
                                <th className="px-2.5 py-2">Jenis</th>
                                <th className="px-2.5 py-2">Lokasi</th>
                                <th className="px-2.5 py-2 text-right">±Qty</th>
                                <th className="px-2.5 py-2 text-right">Saldo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {cardMoves.map(m => {
                                const dirStyle =
                                  m.dir === 'IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  m.dir === 'OUT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  m.dir === 'TRANSFER' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                                  'bg-slate-100 text-slate-600 border-slate-200';
                                const sign = m.dir === 'IN' ? '+' : m.dir === 'OUT' ? '−' : '⇄';
                                return (
                                  <tr key={m.id} className="hover:bg-slate-50/60">
                                    <td className="px-2.5 py-2 font-bold text-slate-600 tabular-nums whitespace-nowrap">{fmtDate(m.createdAt)}</td>
                                    <td className="px-2.5 py-2">
                                      <span className={`inline-block px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase whitespace-nowrap ${dirStyle}`}>
                                        {m.type.replace(/_/g, ' ')}
                                      </span>
                                    </td>
                                    <td className="px-2.5 py-2 font-mono font-semibold text-slate-500 whitespace-nowrap">
                                      {m.dir === 'TRANSFER' || m.dir === 'OUT'
                                        ? `${m.fromLoc || '?'} → ${m.toLoc || '?'}`
                                        : (m.toLoc || m.fromLoc || '—')}
                                    </td>
                                    <td className={`px-2.5 py-2 text-right font-black tabular-nums whitespace-nowrap ${
                                      m.dir === 'IN' ? 'text-emerald-600' : m.dir === 'OUT' ? 'text-rose-600' : 'text-violet-600'
                                    }`}>
                                      {sign}{m.qty.toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-2.5 py-2 text-right font-bold text-slate-700 tabular-nums">{m.saldo.toLocaleString('id-ID')}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <p className="px-3 py-2 bg-slate-50/60 text-[8px] font-bold text-slate-400">
                            Saldo dihitung kumulatif dari data movement yang tersedia.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}

/* tiny inline icons */
function CheckIcon() { return <CheckCircleMini />; }
function LockIcon() { return <LockMini />; }
function CheckCircleMini() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5L15.5 10"/></svg>;
}
function LockMini() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
}
function ChevronRightInline() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="inline ml-0.5"><path d="m9 18 6-6-6-6"/></svg>;
}
