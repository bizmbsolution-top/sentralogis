'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { 
  Package, 
  ArrowDownLeft, 
  ArrowUpRight, 
  TrendingUp, 
  Loader2, 
  Box, 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

export default function CustomerWarehouseDashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // KPI state
  const [stats, setStats] = useState({
    totalSkus: 0,
    totalStockOnHand: 0,
    totalReserved: 0,
    totalAvailable: 0,
    inboundThisMonth: 0,
    outboundThisMonth: 0,
  });

  // Top SKUs
  const [topSkus, setTopSkus] = useState<any[]>([]);
  const [entityName, setEntityName] = useState<string>('');

  // Recent Activities
  const [recentInbound, setRecentInbound] = useState<any[]>([]);
  const [recentOutbound, setRecentOutbound] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.customer_id) {
      if (profile) setLoading(false);
      return;
    }

    const customerId = profile.customer_id;

    async function fetchDashboardData() {
      setLoading(true);
      try {
        // 0. Fetch Customer Entity Name
        const { data: entData } = await supabase
          .from('md_entities')
          .select('name, legal_name, entity_code')
          .eq('id', customerId)
          .maybeSingle();
        if (entData) {
          const displayName = [entData.name, entData.legal_name].filter(Boolean).join(' - ');
          setEntityName(displayName || entData.entity_code || '');
        }

        // 1. Fetch SKUs count & list
        const { data: skusData } = await supabase
          .from('md_product_skus')
          .select('id, sku_code, name, uom')
          .eq('customer_id', customerId)
          .eq('is_active', true);

        const skusList = skusData || [];

        // 2. Fetch inventory
        const { data: invData } = await supabase
          .from('wh_inventory')
          .select('product_sku_id, quantity, reserved_quantity, available_quantity')
          .eq('customer_id', customerId);

        let soh = 0;
        let rsv = 0;
        let avail = 0;
        const skuMap: Record<string, { code: string; name: string; uom: string; soh: number; avail: number }> = {};

        // Initialize skuMap
        skusList.forEach((s) => {
          skuMap[s.id] = { code: s.sku_code, name: s.name, uom: s.uom || 'PCS', soh: 0, avail: 0 };
        });

        (invData || []).forEach((row) => {
          const qOnHand = Number(row.quantity || 0);
          const qAlloc = Number(row.reserved_quantity || 0);
          const qAvail = Number(row.available_quantity || (qOnHand - qAlloc));
          
          soh += qOnHand;
          rsv += qAlloc;
          avail += qAvail;

          if (row.product_sku_id && skuMap[row.product_sku_id]) {
            skuMap[row.product_sku_id].soh += qOnHand;
            skuMap[row.product_sku_id].avail += qAvail;
          }
        });

        // Top 5 SKUs by SOH
        const sortedSkus = Object.values(skuMap)
          .filter((s) => s.soh > 0)
          .sort((a, b) => b.soh - a.soh)
          .slice(0, 5);

        // 3. Fetch Recent Inbound
        const { data: inboundRows } = await supabase
          .from('wh_inbound_receipts')
          .select('id, receipt_number, receipt_date, status, supplier_name')
          .eq('customer_id', customerId)
          .order('receipt_date', { ascending: false })
          .limit(5);

        // 4. Fetch Recent Outbound
        const { data: outboundRows } = await supabase
          .from('wh_outbound_shipments')
          .select('id, shipment_number, shipment_date, status, consignee_name')
          .eq('customer_id', customerId)
          .order('shipment_date', { ascending: false })
          .limit(5);

        setStats({
          totalSkus: skusList.length,
          totalStockOnHand: soh,
          totalReserved: rsv,
          totalAvailable: avail,
          inboundThisMonth: (inboundRows || []).length,
          outboundThisMonth: (outboundRows || []).length,
        });

        setTopSkus(sortedSkus);
        setRecentInbound(inboundRows || []);
        setRecentOutbound(outboundRows || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [profile?.customer_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!profile?.customer_id) {
    return (
      <div className="bg-slate-900/80 border border-amber-500/30 rounded-3xl p-8 text-center max-w-lg mx-auto mt-12">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-bounce" />
        <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Akun Belum Terhubung</h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          Akun login Anda belum dikaitkan dengan Customer / Principal manapun di sistem. Silakan hubungi Admin SBU Gudang untuk menautkan email Anda ke entitas perusahaan Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 border border-white/10 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-10 -top-10 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-black tracking-widest uppercase mb-3">
              <TrendingUp className="w-3.5 h-3.5" />
              {entityName ? `${entityName}` : 'Live 24/7 Logistics Monitor'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {entityName || 'Executive Inventory Snapshot'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
              Executive Inventory Snapshot — Pantau seluruh kuantitas stok barang dan pergerakan gudang Anda secara transparan.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/customer/warehouse/inventory"
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] transition-all active:scale-95 flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Kartu Stok Lengkap
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/[0.08] p-5 rounded-3xl hover:border-cyan-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Total Stok Aktual</span>
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Box className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {stats.totalStockOnHand.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-400">PCS</span>
          </div>
          <div className="text-[10px] font-semibold text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Stock on Hand (SOH)
          </div>
        </div>

        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/[0.08] p-5 rounded-3xl hover:border-emerald-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Stok Siap Kirim</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-300 tracking-tight">
            {stats.totalAvailable.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-400">PCS</span>
          </div>
          <div className="text-[10px] font-semibold text-slate-400 mt-2">
            Available for Outbound
          </div>
        </div>

        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/[0.08] p-5 rounded-3xl hover:border-amber-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Stok Terbooking</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
            {stats.totalReserved.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-400">PCS</span>
          </div>
          <div className="text-[10px] font-semibold text-amber-400/80 mt-2">
            Reserved / Picking Process
          </div>
        </div>

        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/[0.08] p-5 rounded-3xl hover:border-purple-500/40 transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Daftar SKU Terdaftar</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {stats.totalSkus} <span className="text-xs font-bold text-slate-400">SKU</span>
          </div>
          <div className="text-[10px] font-semibold text-purple-300 mt-2">
            Active Product Masters
          </div>
        </div>

      </div>

      {/* Main Grid: Top SKUs vs Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left: Top SKUs Snapshot */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Box className="w-5 h-5 text-cyan-400" /> Top 5 Stok Kuantitas Terbanyak
              </h2>
              <Link href="/customer/warehouse/inventory" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                Semua <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {topSkus.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Belum ada data kuantitas stok untuk produk Anda.
              </div>
            ) : (
              <div className="space-y-3.5">
                {topSkus.map((sku, idx) => (
                  <div key={sku.code || idx} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between hover:bg-white/[0.06] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-300 font-black text-xs flex items-center justify-center border border-cyan-500/20 shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-black text-white uppercase">{sku.code}</div>
                        <div className="text-[11px] text-slate-400 font-medium truncate max-w-[160px]">{sku.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-cyan-300">{sku.soh.toLocaleString('id-ID')}</div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase">{sku.uom}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <Link
              href="/customer/warehouse/inventory"
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-black uppercase tracking-wider text-center block transition-colors border border-white/10"
            >
              Lihat Seluruh Detail Stok
            </Link>
          </div>
        </div>

        {/* Right: Recent Inbound & Outbound */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Recent Inbound Card */}
          <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-400" /> Penerimaan Barang Terakhir (Inbound)
              </h2>
              <Link href="/customer/warehouse/inbound" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentInbound.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs bg-white/[0.02] rounded-2xl border border-white/5">
                Belum ada transaksi penerimaan barang tercatat.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="py-2.5 px-3">No. Penerimaan</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Supplier / Pengirim</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {recentInbound.map((row) => (
                      <tr key={row.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 px-3 font-black text-white">{row.receipt_number || 'INB-DRAFT'}</td>
                        <td className="py-3 px-3 text-slate-300 font-medium">{row.receipt_date || '-'}</td>
                        <td className="py-3 px-3 text-slate-400">{row.supplier_name || 'Direct'}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            row.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            row.status === 'RECEIVING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Outbound Card */}
          <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-blue-400" /> Pengiriman Keluar Terakhir (Outbound)
              </h2>
              <Link href="/customer/warehouse/outbound" className="text-xs font-bold text-cyan-400 hover:underline flex items-center gap-1">
                Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentOutbound.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs bg-white/[0.02] rounded-2xl border border-white/5">
                Belum ada transaksi pengiriman barang keluar tercatat.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="py-2.5 px-3">No. Pengiriman</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Penerima (Consignee)</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {recentOutbound.map((row) => (
                      <tr key={row.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 px-3 font-black text-white">{row.shipment_number || 'OUT-DRAFT'}</td>
                        <td className="py-3 px-3 text-slate-300 font-medium">{row.shipment_date || '-'}</td>
                        <td className="py-3 px-3 text-slate-400">{row.consignee_name || 'Direct'}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            row.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                            row.status === 'PICKING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
