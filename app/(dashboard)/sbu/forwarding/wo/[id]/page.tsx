'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, Loader2, PackageOpen, Truck, MapPin, Anchor, CheckCircle2, Clock
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function ForwardingWODetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [wo, setWo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchWO = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          customer:md_entities!customer_id (id, name, phone, address),
          wo_items (
            id, item_code, status, unit_price,
            fw_container_items (
              id, delivery_type, pickup_address, delivery_address, commodity, 
              volume_cbm, gross_weight_kg, is_deconsoled, deconsoled_at, sell_price_snapshot,
              pickup_wo:work_orders!pickup_wo_id (id, wo_number, status),
              last_mile_wo:work_orders!last_mile_wo_id (id, wo_number, status),
              container_assignment:fw_container_assignments (id, container_number, container_type, consol:fw_consolidations(consol_number, vessel_name, voyage_number, origin_port, destination_port))
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setWo(data);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat detail WO');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchWO();
  }, [fetchWO]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-500 font-medium">Memuat detail Work Order...</p>
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-800">WO Tidak Ditemukan</h2>
        <Button onClick={() => router.back()} className="mt-4">Kembali</Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'DRAFT': return <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">DRAFT</span>;
      case 'PENDING': return <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold">PENDING</span>;
      case 'ON_PROGRESS':
      case 'IN_PROGRESS': return <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">ON PROGRESS</span>;
      case 'DONE':
      case 'COMPLETED': return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">COMPLETED</span>;
      default: return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">{status}</span>;
    }
  };

  const getTruckingStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">PENDING</span>;
      case 'ON_PROGRESS': return <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">ON ROAD</span>;
      case 'DONE': return <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">DELIVERED</span>;
      default: return <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{status || 'N/A'}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{wo.wo_number}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Dibuat: {new Date(wo.created_at).toLocaleDateString('id-ID')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(wo.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kiri: Info Umum */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold flex items-center gap-2">
                <PackageOpen className="w-4 h-4 text-indigo-500" /> Informasi General
                </h3>
              </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <div className="text-xs text-slate-500 font-medium">Cargo Owner</div>
                <div className="font-semibold text-slate-900">{wo.customer?.name}</div>
                <div className="text-sm text-slate-600">{wo.customer?.phone || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Tanggal Order</div>
                <div className="font-semibold text-slate-900">{wo.order_date ? new Date(wo.order_date).toLocaleDateString('id-ID') : '-'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Target Eksekusi</div>
                <div className="font-semibold text-slate-900">{wo.execution_date ? new Date(wo.execution_date).toLocaleDateString('id-ID') : '-'}</div>
              </div>
              {wo.notes && (
                <div>
                  <div className="text-xs text-slate-500 font-medium">Catatan</div>
                  <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 mt-1">
                    {wo.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kanan: Detail Kontainer & Operasional */}
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Detail Kontainer & Pengiriman
          </h3>

          {wo.wo_items?.map((item: any, idx: number) => {
            const fwc = item.fw_container_items?.[0];
            if (!fwc) return null;
            
            return (
              <Card key={item.id} className="border-slate-200 shadow-sm overflow-hidden">
                {/* Header Container */}
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                        UNIT {idx + 1}
                      </span>
                      <h4 className="font-bold text-slate-800">
                        {fwc.container_assignment?.container_number || 'Belum ada Kontainer (TBA)'}
                      </h4>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span className="font-medium bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                        {fwc.container_assignment?.container_type || 'Unknown'}
                      </span>
                      <span className="font-medium bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                        {fwc.delivery_type}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Revenue</div>
                    <div className="font-bold text-emerald-600 text-lg">Rp {(fwc.sell_price_snapshot || 0).toLocaleString('id-ID')}</div>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Info Barang */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Informasi Barang</h5>
                    <div className="space-y-3">
                      <div>
                        <span className="block text-xs text-slate-500">Komoditas</span>
                        <span className="font-semibold text-slate-900">{fwc.commodity || '-'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-xs text-slate-500">Volume</span>
                          <span className="font-semibold text-slate-900">{fwc.volume_cbm ? `${fwc.volume_cbm} CBM` : '-'}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-500">Berat</span>
                          <span className="font-semibold text-slate-900">{fwc.gross_weight_kg ? `${fwc.gross_weight_kg} Kg` : '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Rute & Trucking */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Timeline Pengiriman</h5>
                    
                    <div className="relative pl-5 border-l-2 border-indigo-100 space-y-4">
                      {/* Pickup */}
                      {['D2D', 'D2P'].includes(fwc.delivery_type) && (
                        <div className="relative">
                          <div className="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[27px] top-1 ring-4 ring-white" />
                          <div className="text-xs font-bold text-slate-800">Door Asal (Pickup)</div>
                          <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{fwc.pickup_address}</div>
                          
                          {fwc.pickup_wo && (
                            <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Truck className="w-3.5 h-3.5 text-slate-400" />
                                <Link href={`/sbu/trucking/work-orders/${fwc.pickup_wo.id}`} className="font-semibold text-indigo-600 hover:underline">
                                  {fwc.pickup_wo.wo_number}
                                </Link>
                              </div>
                              {getTruckingStatusBadge(fwc.pickup_wo.status)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Port & Kapal */}
                      <div className="relative">
                        <div className="absolute w-3 h-3 bg-sky-400 rounded-full -left-[27px] top-1 ring-4 ring-white" />
                        <div className="text-xs font-bold text-slate-800">Ocean Freight</div>
                        
                        {fwc.container_assignment?.consol ? (
                          <div className="mt-1 p-2 bg-sky-50 rounded border border-sky-100 text-xs">
                            <div className="font-semibold text-sky-800">{fwc.container_assignment.consol.origin_port} → {fwc.container_assignment.consol.destination_port}</div>
                            <div className="flex items-center gap-1 mt-1 text-sky-700">
                              <Anchor className="w-3 h-3" />
                              {fwc.container_assignment.consol.vessel_name} ({fwc.container_assignment.consol.voyage_number || '-'})
                            </div>
                            <div className="mt-1 pt-1 border-t border-sky-200/50">
                              <Link href={`/sbu/forwarding/consol/${fwc.container_assignment.consol.id}`} className="font-semibold text-indigo-600 hover:underline">
                                Consol: {fwc.container_assignment.consol.consol_number}
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-amber-600 bg-amber-50 p-1.5 rounded border border-amber-100 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Belum di-assign ke Consolidation/Kapal
                          </div>
                        )}
                      </div>

                      {/* Delivery */}
                      {['D2D', 'P2D'].includes(fwc.delivery_type) && (
                        <div className="relative">
                          <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[27px] top-1 ring-4 ring-white" />
                          <div className="text-xs font-bold text-slate-800">Door Tujuan (Delivery)</div>
                          <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{fwc.delivery_address}</div>
                          
                          {fwc.last_mile_wo && (
                            <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Truck className="w-3.5 h-3.5 text-slate-400" />
                                <Link href={`/sbu/trucking/work-orders/${fwc.last_mile_wo.id}`} className="font-semibold text-indigo-600 hover:underline">
                                  {fwc.last_mile_wo.wo_number}
                                </Link>
                              </div>
                              {getTruckingStatusBadge(fwc.last_mile_wo.status)}
                            </div>
                          )}
                        </div>
                      )}
                      
                    </div>
                  </div>
                </div>
                
                {fwc.is_deconsoled && (
                  <div className="bg-emerald-50 px-4 py-2 border-t border-emerald-100 text-xs font-medium text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Kontainer telah di-deconsol pada {new Date(fwc.deconsoled_at).toLocaleString('id-ID')}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
