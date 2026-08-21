'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Ship, MapPin, Calendar, Loader2, Package, CheckCircle2,
  XCircle, AlertTriangle, ArrowRight, Box, FileText, Truck
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Consolidation, ContainerAssignment } from '@/lib/domain/forwarding/types';
import Link from 'next/link';

export default function ConsolidationDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { profile } = useAuth();

  const [consol, setConsol] = useState<Consolidation | null>(null);
  const [containers, setContainers] = useState<ContainerAssignment[]>([]);
  const [unassignedItems, setUnassignedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deconsolLoading, setDeconsolLoading] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.tenant_id) setTenantId(profile.tenant_id);
  }, [profile]);

  const fetchData = useCallback(async () => {
    if (!id || !tenantId) return;
    setLoading(true);

    try {
      const { data: consolData, error: consolError } = await supabase
        .from('fw_consolidations')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (consolError || !consolData) {
        toast.error('Konsolidasi tidak ditemukan');
        router.push('/sbu/forwarding/consol');
        return;
      }
      setConsol(consolData as unknown as Consolidation);

      const { data: containersData, error: containersError } = await supabase
        .from('fw_container_assignments')
        .select('*')
        .eq('consolidation_id', id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (containersError) throw containersError;
      setContainers((containersData || []) as unknown as ContainerAssignment[]);

      const assignedWoItemIds = (containersData || []).flatMap(c => {
        if (!c.id) return [];
        return [];
      });

      const { data: allItems, error: itemsError } = await supabase
        .from('fw_container_items')
        .select(`
          id, wo_item_id, volume_cbm, gross_weight_kg, packages, package_type,
          commodity, description, delivery_type, delivery_address,
          is_deconsoled, deconsoled_at, goods_received_at,
          wo_item:wo_items!inner (
            id, item_code, status, wo_id,
            work_order:work_orders!inner (
              id, wo_number, customer_id, status, sbu_type,
              customer:md_entities!customer_id (id, name)
            )
          )
        `)
        .eq('tenant_id', tenantId);

      if (itemsError) throw itemsError;

      const assignedItemIds = new Set<string>();
      const { data: allContainerItems, error: allCiError } = await supabase
        .from('fw_container_items')
        .select('wo_item_id')
        .eq('tenant_id', tenantId)
        .in('container_assignment_id', (containersData || []).map(c => c.id));

      if (!allCiError && allContainerItems) {
        allContainerItems.forEach(ci => assignedItemIds.add(ci.wo_item_id));
      }

      const unassigned = (allItems || []).filter((item: any) => !assignedItemIds.has(item.wo_item_id));
      setUnassignedItems(unassigned);
    } catch (error: any) {
      console.error(error);
      toast.error('Gagal memuat detail konsolidasi');
    } finally {
      setLoading(false);
    }
  }, [id, tenantId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeconsol = async () => {
    if (!consol || !tenantId || !profile?.id) return;
    setDeconsolLoading(true);

    try {
      const res = await fetch(`/api/forwarding/consol/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, user_id: profile.id })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(`Deconsol berhasil! ${data.delivery_wo_ids?.length || 0} delivery WO dibuat.`);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Gagal deconsol');
    } finally {
      setDeconsolLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <span className="px-2.5 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold">OPEN</span>;
      case 'stuffing': return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">STUFFING</span>;
      case 'shipped': return <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">SHIPPED</span>;
      case 'arrived': return <span className="px-2.5 py-1 bg-fuchsia-100 text-fuchsia-700 rounded-full text-xs font-semibold">ARRIVED</span>;
      case 'deconsol_done': return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">DECONSOL</span>;
      case 'closed': return <span className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-semibold">CLOSED</span>;
      default: return <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">{status}</span>;
    }
  };

  const getContainerStatusBadge = (status: string) => {
    switch (status) {
      case 'empty': return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold">EMPTY</span>;
      case 'stuffed': return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-semibold">STUFFED</span>;
      case 'shipped': return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">SHIPPED</span>;
      case 'arrived': return <span className="px-2 py-0.5 bg-fuchsia-100 text-fuchsia-700 rounded text-xs font-semibold">ARRIVED</span>;
      case 'deconsoled': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">DECONSOLED</span>;
      case 'returned': return <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs font-semibold">RETURNED</span>;
      default: return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold">{status}</span>;
    }
  };

  const calculateFillRate = () => {
    if (containers.length === 0) return 0;
    const stuffed = containers.filter(c => c.status === 'stuffed' || c.status === 'shipped' || c.status === 'arrived' || c.status === 'deconsoled').length;
    return Math.round((stuffed / containers.length) * 100);
  };

  const canStuff = consol?.status === 'open' || consol?.status === 'stuffing';
  const canDeconsol = consol?.status === 'arrived' || consol?.status === 'shipped';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-500 font-medium">Memuat detail konsolidasi...</p>
      </div>
    );
  }

  if (!consol) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-800">Konsolidasi Tidak Ditemukan</h2>
        <Button onClick={() => router.back()} className="mt-4">Kembali</Button>
      </div>
    );
  }

  const fillRate = calculateFillRate();
  const unassignedCount = unassignedItems.length;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{consol.consol_number}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
              <Ship className="w-3.5 h-3.5" />
              <span>{consol.vessel_name} {consol.voyage_number ? `(V.${consol.voyage_number})` : ''}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(consol.status || "")}
          {canStuff && (
            <Link href={`/sbu/forwarding/consol/${id}/stuffing`}>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                <Package className="w-4 h-4 mr-2" /> Stuffing Manager
              </Button>
            </Link>
          )}
          {canDeconsol && (
            <Button
              onClick={handleDeconsol}
              disabled={deconsolLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {deconsolLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Deconsol
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Ship className="w-4 h-4 text-indigo-500" /> Info Kapal & Rute
              </h3>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <div className="text-xs text-slate-500 font-medium">Rute</div>
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  {consol.origin_port} <ArrowRight className="w-3.5 h-3.5 text-slate-400" /> {consol.destination_port}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Shipping Line</div>
                <div className="font-semibold text-slate-900">{consol.shipping_line_name || '-'}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> ETD
                  </div>
                  <div className="font-semibold text-slate-900">
                    {consol.etd ? new Date(consol.etd).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> ETA
                  </div>
                  <div className="font-semibold text-slate-900">
                    {consol.eta ? new Date(consol.eta).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </div>
                </div>
              </div>
              {consol.actual_etd && (
                <div>
                  <div className="text-xs text-slate-500 font-medium">Actual ETD</div>
                  <div className="font-semibold text-slate-900">{new Date(consol.actual_etd).toLocaleString('id-ID')}</div>
                </div>
              )}
              {consol.actual_eta && (
                <div>
                  <div className="text-xs text-slate-500 font-medium">Actual ETA</div>
                  <div className="font-semibold text-slate-900">{new Date(consol.actual_eta).toLocaleString('id-ID')}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Box className="w-4 h-4 text-indigo-500" /> Ringkasan Container
              </h3>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <div className="text-xs text-slate-500 font-medium mb-2">Fill Rate</div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${fillRate}%` }}
                  />
                </div>
                <div className="text-right text-xs font-semibold text-slate-600 mt-1">{fillRate}%</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                  <div className="text-2xl font-bold text-slate-800">{containers.length}</div>
                  <div className="text-xs text-slate-500">Total Container</div>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-center">
                  <div className="text-2xl font-bold text-amber-700">{containers.filter(c => c.status === 'stuffed').length}</div>
                  <div className="text-xs text-amber-600">Stuffed</div>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-center">
                  <div className="text-2xl font-bold text-indigo-700">{containers.filter(c => c.status === 'shipped' || c.status === 'arrived').length}</div>
                  <div className="text-xs text-indigo-600">Shipped/Arrived</div>
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
                  <div className="text-2xl font-bold text-emerald-700">{containers.filter(c => c.status === 'deconsoled').length}</div>
                  <div className="text-xs text-emerald-600">Deconsoled</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Box className="w-4 h-4 text-indigo-500" /> Daftar Container
              </h3>
            </CardHeader>
            <CardContent className="pt-4">
              {containers.length === 0 ? (
                <div className="text-center py-8">
                  <Box className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Belum ada container di konsolidasi ini</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50/80 border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Container</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 font-semibold">Seal / BL</th>
                        <th className="px-4 py-3 font-semibold text-center">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {containers.map((cont) => (
                        <tr key={cont.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-semibold text-slate-900">{cont.container_number}</td>
                          <td className="px-4 py-3">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-semibold text-slate-600">{cont.container_type}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {cont.seal_number ? <div>Seal: {cont.seal_number}</div> : <div className="text-slate-400">-</div>}
                            {cont.bl_number ? <div>BL: {cont.bl_number}</div> : null}
                          </td>
                          <td className="px-4 py-3 text-center">{getContainerStatusBadge(cont.status || "")}</td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/sbu/forwarding/consol/${id}/stuffing?container=${cont.id}`}>
                              <Button variant="secondary" size="sm" className="text-xs h-8">
                                Detail <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {unassignedCount > 0 && (
            <Card className="border-amber-200 shadow-sm bg-amber-50/30">
              <CardHeader className="pb-3 border-b border-amber-100">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="w-4 h-4" /> WO Items Belum Di-Assign ({unassignedCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-amber-700 bg-amber-50/80 border-b border-amber-200 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-semibold">WO Number</th>
                        <th className="px-4 py-3 font-semibold">Customer</th>
                        <th className="px-4 py-3 font-semibold">Delivery Type</th>
                        <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {unassignedItems.map((item: any) => (
                        <tr key={item.id} className="hover:bg-amber-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <Link href={`/sbu/forwarding/wo/${item.wo_item.work_order.id}`} className="font-semibold text-indigo-700 hover:underline">
                              {item.wo_item.work_order.wo_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">{item.wo_item.work_order.customer?.name || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="bg-white border border-amber-200 px-2 py-0.5 rounded text-xs font-semibold text-amber-700">{item.delivery_type}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/sbu/forwarding/consol/${id}/stuffing`}>
                              <Button variant="secondary" size="sm" className="text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-100">
                                Assign <ArrowRight className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
