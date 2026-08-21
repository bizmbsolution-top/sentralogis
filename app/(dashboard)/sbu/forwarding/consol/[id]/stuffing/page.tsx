'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Loader2, Package, Save, AlertTriangle, CheckCircle2,
  Ship, Box, User, MapPin
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import type { Consolidation, ContainerAssignment } from '@/lib/domain/forwarding/types';

export default function StuffingManagerPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();

  const preSelectedContainer = searchParams.get('container');

  const [consol, setConsol] = useState<Consolidation | null>(null);
  const [containers, setContainers] = useState<ContainerAssignment[]>([]);
  const [unassignedItems, setUnassignedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const [selectedContainerId, setSelectedContainerId] = useState<string>(preSelectedContainer || '');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [sealNumber, setSealNumber] = useState('');
  const [blNumber, setBlNumber] = useState('');

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

      if (containersData && containersData.length > 0 && !preSelectedContainer) {
        setSelectedContainerId(containersData[0].id);
      } else if (preSelectedContainer) {
        setSelectedContainerId(preSelectedContainer);
      }

      const { data: allCi, error: allCiError } = await supabase
        .from('fw_container_items')
        .select('wo_item_id')
        .eq('tenant_id', tenantId)
        .in('container_assignment_id', (containersData || []).map(c => c.id));

      const assignedIds = new Set((allCi || []).map(ci => ci.wo_item_id));

      const { data: allItems, error: itemsError } = await supabase
        .from('fw_container_items')
        .select(`
          id, wo_item_id, volume_cbm, gross_weight_kg, packages, package_type,
          commodity, description, delivery_type,
          wo_item:wo_items!inner (
            id, item_code, status, wo_id,
            work_order:work_orders!inner (
              id, wo_number, customer_id, status, sbu_type,
              customer:md_entities!customer_id (id, name)
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .or(`is_deconsoled.eq.false,is_deconsoled.is.null`);

      if (itemsError) throw itemsError;

      const unassigned = (allItems || []).filter((item: any) => !assignedIds.has(item.wo_item_id));
      setUnassignedItems(unassigned);
      setSelectedItemIds(new Set());
    } catch (error: any) {
      console.error(error);
      toast.error('Gagal memuat data stuffing');
    } finally {
      setLoading(false);
    }
  }, [id, tenantId, router, preSelectedContainer]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleItem = (itemId: string) => {
    const newSet = new Set(selectedItemIds);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    setSelectedItemIds(newSet);
  };

  const handleSubmitStuffing = async () => {
    if (!selectedContainerId || selectedItemIds.size === 0) {
      toast.error('Pilih container dan minimal 1 item untuk di-stuff');
      return;
    }

    if (!tenantId || !profile?.id) return;
    setSubmitting(true);

    try {
      const { data: container, error: containerError } = await supabase
        .from('fw_container_assignments')
        .select('max_volume_cbm, container_type, status')
        .eq('id', selectedContainerId)
        .eq('tenant_id', tenantId)
        .single();

      if (containerError || !container) {
        toast.error('Container tidak ditemukan');
        setSubmitting(false);
        return;
      }

      if (container.status === 'stuffed' || container.status === 'shipped') {
        toast.error('Container ini sudah di-stuff / shipped');
        setSubmitting(false);
        return;
      }

      const selectedItems = unassignedItems.filter((item: any) => selectedItemIds.has(item.id));
      const totalVolume = selectedItems.reduce((sum: number, item: any) => sum + (item.volume_cbm || 0), 0);

      if (container.max_volume_cbm && totalVolume > container.max_volume_cbm) {
        toast.error(`Total volume (${totalVolume.toFixed(2)} CBM) melebihi kapasitas container (${container.max_volume_cbm} CBM)`);
        setSubmitting(false);
        return;
      }

      const res = await fetch(`/api/forwarding/consol/${id}/stuff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: profile.id,
          container_assignments: [
            {
              container_assignment_id: selectedContainerId,
              wo_item_ids: Array.from(selectedItemIds),
              seal_number: sealNumber || null,
              bl_number: blNumber || null
            }
          ]
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(`Stuffing berhasil! ${selectedItemIds.size} item di-assign ke container.`);
      setSelectedItemIds(new Set());
      setSealNumber('');
      setBlNumber('');
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Gagal menyimpan stuffing');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedContainer = containers.find(c => c.id === selectedContainerId);
  const selectedItemsData = unassignedItems.filter((item: any) => selectedItemIds.has(item.id));
  const totalSelectedVolume = selectedItemsData.reduce((sum: number, item: any) => sum + (item.volume_cbm || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-500 font-medium">Memuat Stuffing Manager...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/sbu/forwarding/consol/${id}`)} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Stuffing Manager</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
              <Ship className="w-3.5 h-3.5" />
              <span>{consol?.consol_number} â€” {consol?.vessel_name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSubmitStuffing}
            disabled={submitting || selectedItemIds.size === 0 || !selectedContainerId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Stuffing ({selectedItemIds.size})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-500" /> WO Items yang Belum Di-Assign
              </h3>
            </CardHeader>
            <CardContent className="pt-4">
              {unassignedItems.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Semua WO Items sudah di-assign ke container</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50/80 border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-semibold w-10"></th>
                        <th className="px-4 py-3 font-semibold">WO / Customer</th>
                        <th className="px-4 py-3 font-semibold">Delivery</th>
                        <th className="px-4 py-3 font-semibold text-center">Vol (CBM)</th>
                        <th className="px-4 py-3 font-semibold text-center">Berat (Kg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unassignedItems.map((item: any) => (
                        <tr
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                            selectedItemIds.has(item.id) ? 'bg-indigo-50/60' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedItemIds.has(item.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                            }`}>
                              {selectedItemIds.has(item.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">
                              <Link href={`/sbu/forwarding/wo/${item.wo_item.work_order.id}`} className="hover:underline text-indigo-700">
                                {item.wo_item.work_order.wo_number}
                              </Link>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <User className="w-3 h-3" /> {item.wo_item.work_order.customer?.name || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              item.delivery_type === 'port_to_door' ? 'bg-emerald-100 text-emerald-700' :
                              item.delivery_type === 'door_to_door' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-sky-100 text-sky-700'
                            }`}>
                              {item.delivery_type}
                            </span>
                            {item.delivery_address && (
                              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {item.delivery_address.substring(0, 30)}...
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-slate-700">{item.volume_cbm?.toFixed(2) || '-'}</td>
                          <td className="px-4 py-3 text-center font-medium text-slate-700">{item.gross_weight_kg?.toFixed(0) || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Box className="w-4 h-4 text-indigo-500" /> Pilih Container
              </h3>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {containers.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Belum ada container. Buat container terlebih dahulu.</p>
              ) : (
                containers.map((cont) => (
                  <div
                    key={cont.id}
                    onClick={() => setSelectedContainerId(cont.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedContainerId === cont.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">{cont.container_number}</div>
                        <div className="text-xs text-slate-500">{cont.container_type} {cont.max_volume_cbm ? `â€¢ ${cont.max_volume_cbm} CBM` : ''}</div>
                      </div>
                      <div>{getStatusBadge(cont.status || "")}</div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {selectedContainer && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Save className="w-4 h-4 text-emerald-500" /> Info Stuffing
                </h3>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seal Number</label>
                  <input
                    type="text"
                    value={sealNumber}
                    onChange={e => setSealNumber(e.target.value)}
                    placeholder="Opsional"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">BL Number</label>
                  <input
                    type="text"
                    value={blNumber}
                    onChange={e => setBlNumber(e.target.value)}
                    placeholder="Opsional"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-500 font-medium mb-1">Total Volume Terpilih</div>
                  <div className="text-lg font-bold text-slate-800">{totalSelectedVolume.toFixed(2)} CBM</div>
                  {selectedContainer.max_volume_cbm && (
                    <div className="text-xs text-slate-500 mt-1">
                      Kapasitas: {selectedContainer.max_volume_cbm} CBM
                      {totalSelectedVolume > selectedContainer.max_volume_cbm && (
                        <span className="text-rose-600 font-semibold ml-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Melebihi kapasitas!
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'open': return <span className="px-2 py-0.5 bg-sky-100 text-sky-700 rounded text-xs font-semibold">OPEN</span>;
    case 'stuffing': return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-semibold">STUFFING</span>;
    case 'shipped': return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">SHIPPED</span>;
    case 'arrived': return <span className="px-2 py-0.5 bg-fuchsia-100 text-fuchsia-700 rounded text-xs font-semibold">ARRIVED</span>;
    case 'deconsoled': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">DECONSOLED</span>;
    default: return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold">{status}</span>;
  }
}
