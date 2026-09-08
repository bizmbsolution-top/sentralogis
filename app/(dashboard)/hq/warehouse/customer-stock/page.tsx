"use client";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// [AI] Customer Stock Visibility — 3PL owner-centric stock portal:
// one card per goods owner, drill-down drawer with per-SKU stock + FEFO watch + CSV report export

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Search, RefreshCw, X, Users, Package, Boxes, Clock,
  AlertTriangle, MapPin, Download, ChevronRight,
} from "lucide-react";

interface LotRow {
  id: string;
  skuCode: string;
  productName: string;
  customer: string;
  quantity: number;
  reserved: number;
  available: number;
  batch: string;
  expiryDate: string | null;
  binCode: string;
  warehouseName: string;
}

const DONE = new Set(['AVAILABLE', 'RESERVED']);

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${String(d.getFullYear()).slice(2)}`;
}

function daysLeft(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 864e5);
}

function ExpiryChip({ iso }: { iso: string | null }) {
  const dl = daysLeft(iso);
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

export default function HQWarehouseCustomerStock() {
  const supabase = createClient();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    try {
      const [invRes, whRes] = await Promise.all([
        supabase.from('wh_inventory').select(`
          id, quantity, reserved_quantity, available_quantity,
          batch_number, expiry_date, status,
          product_sku:md_product_skus!product_sku_id (
            sku_code, name, customer:md_entities(name)
          ),
          location:md_warehouse_locations!location_id (code),
          warehouse:md_warehouses!warehouse_id (name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .in('status', ['AVAILABLE', 'RESERVED'])
        .order('updated_at', { ascending: false })
        .limit(1000),
        supabase.from('md_warehouses').select('id, name').eq('tenant_id', profile.tenant_id).eq('is_active', true),
      ]);

      setWarehouses(whRes.data || []);
      setLots((invRes.data || []).map((i: any) => ({
        id: i.id,
        skuCode: i.product_sku?.sku_code || '-',
        productName: i.product_sku?.name || '-',
        customer: i.product_sku?.customer?.name || 'Tanpa Customer',
        quantity: Number(i.quantity) || 0,
        reserved: Number(i.reserved_quantity) || 0,
        available: Number(i.available_quantity) || 0,
        batch: i.batch_number || '-',
        expiryDate: i.expiry_date || null,
        binCode: i.location?.code || '-',
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

  const warehouseNames = useMemo(() => [...new Set(lots.map(l => l.warehouseName).filter(n => n && n !== '-'))], [lots]);
  const whStyle = (name: string) => WH_PALETTE[Math.max(0, warehouseNames.indexOf(name)) % WH_PALETTE.length];

  // Filter chain
  const scoped = useMemo(() => lots.filter(l => {
    if (warehouseFilter !== 'all') {
      const whName = warehouses.find(w => w.id === warehouseFilter)?.name;
      if (l.warehouseName !== whName) return false;
    }
    const q = search.trim().toLowerCase();
    if (q) {
      const tokens = q.split(/\s+/);
      const hay = [l.customer, l.skuCode, l.productName, l.batch, l.binCode, l.warehouseName]
        .join(' ').toLowerCase();
      if (!tokens.every(t => hay.includes(t))) return false;
    }
    return true;
  }), [lots, warehouseFilter, warehouses, search]);

  // Group by OWNER first, then SKU within owner
  interface OwnerSku {
    key: string; productName: string; skuCode: string;
    qty: number; reserved: number; available: number;
    batches: Set<string>; bins: Set<string>; nearestExpiry: string | null;
  }
  const owners = useMemo(() => {
    const ownerMap = new Map<string, {
      customer: string; totalQty: number; reserved: number; available: number;
      skus: Set<string>; bins: Set<string>; warehouses: Set<string>;
      expiringSoon: number; skuMap: Map<string, OwnerSku>;
      topSkus: Array<{ name: string; qty: number }>;
    }>();
    scoped.forEach(l => {
      let o = ownerMap.get(l.customer);
      if (!o) {
        o = { customer: l.customer, totalQty: 0, reserved: 0, available: 0,
              skus: new Set(), bins: new Set(), warehouses: new Set(),
              expiringSoon: 0, skuMap: new Map(), topSkus: [] };
        ownerMap.set(l.customer, o);
      }
      o.totalQty += l.quantity;
      o.reserved += l.reserved;
      o.available += l.available;
      o.skus.add(l.skuCode);
      if (l.binCode !== '-') o.bins.add(`${l.warehouseName}|${l.binCode}`);
      o.warehouses.add(l.warehouseName);
      const dl = daysLeft(l.expiryDate);
      if (dl !== null && dl <= 30) o.expiringSoon++;

      let s = o.skuMap.get(l.skuCode);
      if (!s) {
        s = { key: l.skuCode, productName: l.productName, skuCode: l.skuCode,
              qty: 0, reserved: 0, available: 0, batches: new Set(), bins: new Set(), nearestExpiry: null };
        o.skuMap.set(l.skuCode, s);
      }
      s.qty += l.quantity;
      s.reserved += l.reserved;
      s.available += l.available;
      if (l.batch !== '-') s.batches.add(l.batch);
      if (l.binCode !== '-') s.bins.add(l.binCode);
      if (l.expiryDate && (!s.nearestExpiry || l.expiryDate < s.nearestExpiry)) s.nearestExpiry = l.expiryDate;
    });

    return [...ownerMap.values()].map(o => ({
      ...o,
      topSkus: [...o.skuMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 3),
    })).sort((a, b) => b.totalQty - a.totalQty);
  }, [scoped]);

  const stats = useMemo(() => ({
    customers: owners.length,
    totalQty: scoped.reduce((s, l) => s + l.quantity, 0),
    skuCount: new Set(scoped.map(l => l.skuCode)).size,
    expiring: scoped.filter(l => { const d = daysLeft(l.expiryDate); return d !== null && d <= 30; }).length,
  }), [owners.length, scoped]);

  // Selected customer detail
  const detail = useMemo(() => {
    if (!selectedCustomer) return null;
    const owner = owners.find(o => o.customer === selectedCustomer);
    if (!owner) return null;
    const ownerLots = scoped.filter(l => l.customer === selectedCustomer);
    const fefo = ownerLots
      .filter(l => l.expiryDate && l.quantity > 0)
      .map(l => ({ ...l, dl: daysLeft(l.expiryDate)! }))
      .filter(l => l.dl <= 30)
      .sort((a, b) => a.dl - b.dl)
      .slice(0, 8);
    const skus = [...owner.skuMap.values()].sort((a, b) => b.qty - a.qty);
    return { ...owner, fefo, skus, lotCount: ownerLots.length };
  }, [selectedCustomer, owners, scoped]);

  const exportCustomerCsv = () => {
    if (!detail) return;
    const header = ['SKU', 'Product', 'Total Qty', 'Available', 'Reserved', 'Active Lots', 'Bins Used', 'Nearest Expiry'];
    const lines = detail.skus.map(s => [
      s.skuCode, s.productName, s.qty, s.available, s.reserved, s.batches.size, s.bins.size, fmtDate(s.nearestExpiry),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['\uFEFF' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stok-${detail.customer.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = [
    { label: 'Pemilik Barang', value: stats.customers, icon: Users, cls: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    { label: 'Unit Tertitip', value: stats.totalQty.toLocaleString('id-ID'), icon: Package, cls: 'text-slate-700 bg-slate-50 border-slate-200' },
    { label: 'SKU Dikelola', value: stats.skuCount, icon: Boxes, cls: 'text-violet-700 bg-violet-50 border-violet-200' },
    { label: 'Expiry ≤30 Hari', value: stats.expiring, icon: AlertTriangle, cls: stats.expiring > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-400 bg-slate-50 border-slate-200' },
  ];

  if (loading && !lastSync) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
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
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">Customer Stock Visibility</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-0.5">Stok Titipan per Pemilik Barang</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            {lastSync && <span className="text-emerald-600/70 font-bold">{lastSync.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
          </span>
          <button onClick={() => fetchData()} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

      {/* Filters */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm flex flex-col lg:flex-row gap-2 lg:items-center">
        <div className="relative flex-1 min-w-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari cerdas: customer, SKU, produk, batch, gudang... (multi kata)"
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
      </div>

      {/* Customer cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {owners.length === 0 ? (
          <div className="col-span-full bg-white border border-dashed border-slate-200 rounded-3xl py-16 text-center">
            <Package size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-xs font-bold text-slate-400">Tidak ada stok customer cocok dengan filter</p>
          </div>
        ) : owners.map(o => {
          const maxTop = Math.max(1, ...o.topSkus.map(s => s.qty));
          return (
            <button
              key={o.customer}
              onClick={() => setSelectedCustomer(o.customer)}
              className="text-left bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-slate-900 truncate">{o.customer}</h4>
                  <p className="text-[9px] font-bold text-slate-400">{o.skus.size} SKU · {o.bins.size} bin terpakai</p>
                </div>
                <span className="text-lg font-black italic text-indigo-700 shrink-0 tabular-nums">{o.totalQty.toLocaleString('id-ID')}</span>
              </div>

              {/* Top-3 SKU mini bars */}
              <div className="space-y-1.5 mb-3">
                {o.topSkus.map(s => (
                  <div key={s.key}>
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                      <span className="truncate max-w-[160px]">{s.productName}</span>
                      <span className="tabular-nums shrink-0">{s.qty.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-400" style={{ width: `${Math.max(4, (s.qty / maxTop) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex gap-1 flex-wrap">
                  {[...o.warehouses].slice(0, 2).map(w => {
                    const ws = whStyle(w);
                    return (
                      <span key={w} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase ${ws.bg} ${ws.text} ${ws.border}`}>
                        <MapPin size={8} />{w.replace(/^GUDANG /i, '')}
                      </span>
                    );
                  })}
                  {[...o.warehouses].length > 2 && (
                    <span className="text-[8px] font-bold text-slate-400">+{[...o.warehouses].length - 2}</span>
                  )}
                </div>
                {o.expiringSoon > 0 ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border bg-amber-50 text-amber-700 border-amber-200 text-[8px] font-black uppercase animate-pulse">
                    <AlertTriangle size={9} />{o.expiringSoon} batch ≤30j
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border bg-emerald-50 text-emerald-600 border-emerald-200 text-[8px] font-black uppercase">
                    Aman
                  </span>
                )}
              </div>
              <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-blue-600 flex items-center">
                Lihat detail stok <ChevronRight size={11} className="inline ml-0.5" />
              </p>
            </button>
          );
        })}
      </div>

      {/* ===== CUSTOMER DETAIL DRAWER ===== */}
      {selectedCustomer && detail && (
        <>
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={() => setSelectedCustomer(null)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-start justify-between z-10">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">Laporan Stok Titipan</p>
                <h3 className="text-base font-black text-slate-900 tracking-tight truncate">{detail.customer}</h3>
                <p className="text-[10px] font-bold text-slate-400">{detail.skus.length} SKU · {detail.lotCount} lot · {detail.bins.size} bin</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={exportCustomerCsv}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 hover:text-slate-900 hover:border-slate-300 transition-all"
                  title="Export laporan stok CSV untuk dikirim ke customer"
                >
                  <Download size={13} /> CSV
                </button>
                <button onClick={() => setSelectedCustomer(null)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">On Hand</p>
                  <p className="text-sm font-black text-slate-800 tabular-nums">{detail.totalQty.toLocaleString('id-ID')}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-wider text-emerald-600">Available</p>
                  <p className="text-sm font-black text-emerald-700 tabular-nums">{detail.available.toLocaleString('id-ID')}</p>
                </div>
                <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-wider text-blue-500">Reserved</p>
                  <p className="text-sm font-black text-blue-700 tabular-nums">{detail.reserved.toLocaleString('id-ID')}</p>
                </div>
              </div>

              {/* Warehouses */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[...detail.warehouses].map(w => {
                  const ws = whStyle(w);
                  return (
                    <span key={w} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${ws.bg} ${ws.text} ${ws.border}`}>
                      <MapPin size={10} />{w}
                    </span>
                  );
                })}
              </div>

              {/* Stock per SKU */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Stok per SKU</p>
                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 text-left text-[8px] font-black uppercase tracking-widest text-slate-400">
                        <th className="px-3 py-2">Produk / SKU</th>
                        <th className="px-3 py-2 text-center">Lot</th>
                        <th className="px-3 py-2 text-right">On Hand</th>
                        <th className="px-3 py-2 text-right">Tersedia</th>
                        <th className="px-3 py-2">Expiry Terdekat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {detail.skus.map(s => (
                        <tr key={s.key} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2">
                            <p className="font-black text-slate-800 truncate max-w-[180px]">{s.productName}</p>
                            <p className="text-[9px] font-mono font-bold text-slate-400">{s.skuCode}</p>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-slate-600 tabular-nums">{s.batches.size}</td>
                          <td className="px-3 py-2 text-right font-black text-slate-800 tabular-nums">{s.qty.toLocaleString('id-ID')}</td>
                          <td className="px-3 py-2 text-right font-black text-emerald-600 tabular-nums">{s.available.toLocaleString('id-ID')}</td>
                          <td className="px-3 py-2"><ExpiryChip iso={s.nearestExpiry} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FEFO watch */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1">
                  <Clock size={11} /> FEFO Watch — Batch Expiry ≤30 Hari
                </p>
                {detail.fefo.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 rounded-xl border border-dashed border-slate-200">Tidak ada batch mendekati expiry 🎯</p>
                ) : (
                  <div className="space-y-1.5">
                    {detail.fefo.map(f => (
                      <div key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{f.productName}</p>
                          <p className="text-[9px] font-bold text-slate-400">
                            Batch {f.batch} · {f.quantity.toLocaleString('id-ID')} unit · {f.binCode}
                          </p>
                        </div>
                        <ExpiryChip iso={f.expiryDate} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
