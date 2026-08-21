'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Plus, Box, Trash2, Save, Loader2,
  Ship, ChevronDown, ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { BoxAssignment, BoxItem } from '@/lib/domain/forwarding/types';
import Link from 'next/link';

export default function BoxManagerPage() {
  const { id: consolId, containerId } = useParams() as { id: string; containerId: string };
  const router = useRouter();
  const { profile } = useAuth();

  const [container, setContainer] = useState<any>(null);
  const [boxes, setBoxes] = useState<(BoxAssignment & { items: BoxItem[] })[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [expandedBoxes, setExpandedBoxes] = useState<Set<string>>(new Set());
  const [showCreateBox, setShowCreateBox] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);

  const [newBox, setNewBox] = useState({
    box_code: '',
    volume_cbm: '',
    colli: '',
    weight_kg: '',
    seal_number: ''
  });

  const [addItemForm, setAddItemForm] = useState({
    wo_item_id: '',
    quantity: 1,
    description: '',
    commodity: '',
    volume_cbm: '',
    gross_weight_kg: ''
  });

  useEffect(() => {
    if (profile?.tenant_id) setTenantId(profile.tenant_id);
  }, [profile]);

  const fetchData = useCallback(async () => {
    if (!consolId || !containerId || !tenantId) return;
    setLoading(true);

    try {
      const { data: containerData, error: containerError } = await supabase
        .from('fw_container_assignments')
        .select('*')
        .eq('id', containerId)
        .eq('tenant_id', tenantId)
        .single();

      if (containerError || !containerData) {
        toast.error('Container tidak ditemukan');
        router.push(`/sbu/forwarding/consol/${consolId}`);
        return;
      }
      setContainer(containerData);

      const { data: boxesData, error: boxesError } = await (supabase
        .from('fw_box_assignments' as any) as any)
        .select('*')
        .eq('container_assignment_id', containerId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (boxesError) throw boxesError;

      const boxesWithItems = await Promise.all(
        (boxesData || []).map(async (box: any) => {
          const { data: boxItems } = await (supabase
            .from('fw_box_items' as any) as any)
            .select(`
              id, quantity, description, commodity, volume_cbm, gross_weight_kg,
              wo_item:wo_items!inner (
                id, item_code, status,
                work_order:work_orders!inner (
                  id, wo_number, customer:md_entities!customer_id (id, name)
                )
              )
            `)
            .eq('box_assignment_id', box.id)
            .eq('tenant_id', tenantId);

          return { ...box, items: boxItems || [] };
        })
      );

      setBoxes(boxesWithItems);

      const assignedWoItemIds = new Set(
        boxesWithItems.flatMap(b => b.items.map((i: any) => i.wo_item_id))
      );

      const { data: allContainerItems } = await supabase
        .from('fw_container_items')
        .select(`
          id, wo_item_id, volume_cbm, gross_weight_kg, packages, package_type,
          commodity, description,
          wo_item:wo_items!inner (
            id, item_code, status,
            work_order:work_orders!inner (
              id, wo_number, customer:md_entities!customer_id (id, name)
            )
          )
        `)
        .eq('container_assignment_id', containerId)
        .eq('tenant_id', tenantId);

      const available = (allContainerItems || []).filter((item: any) => !assignedWoItemIds.has(item.wo_item_id));
      setAvailableItems(available);
    } catch (error: any) {
      console.error(error);
      toast.error('Gagal memuat data box');
    } finally {
      setLoading(false);
    }
  }, [consolId, containerId, tenantId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !profile?.id) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/forwarding/container/${containerId}/box`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: profile.id,
          box_code: newBox.box_code,
          volume_cbm: newBox.volume_cbm ? Number(newBox.volume_cbm) : null,
          colli: newBox.colli ? Number(newBox.colli) : null,
          weight_kg: newBox.weight_kg ? Number(newBox.weight_kg) : null,
          seal_number: newBox.seal_number || null
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(`Box ${newBox.box_code} berhasil dibuat`);
      setNewBox({ box_code: '', volume_cbm: '', colli: '', weight_kg: '', seal_number: '' });
      setShowCreateBox(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Gagal membuat box');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItemToBox = async (boxId: string) => {
    if (!tenantId || !profile?.id || !addItemForm.wo_item_id) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/forwarding/box/${boxId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: profile.id,
          wo_item_id: addItemForm.wo_item_id,
          quantity: addItemForm.quantity,
          description: addItemForm.description || null,
          commodity: addItemForm.commodity || null,
          volume_cbm: addItemForm.volume_cbm ? Number(addItemForm.volume_cbm) : null,
          gross_weight_kg: addItemForm.gross_weight_kg ? Number(addItemForm.gross_weight_kg) : null
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Item berhasil ditambahkan ke box');
      setAddItemForm({ wo_item_id: '', quantity: 1, description: '', commodity: '', volume_cbm: '', gross_weight_kg: '' });
      setSelectedBoxId(null);
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Gagal menambahkan item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveItemFromBox = async (boxId: string, woItemId?: string) => {
    if (!tenantId) return;
    if (!confirm('Hapus item ini dari box?')) return;

    try {
      const res = await fetch(`/api/forwarding/box/${boxId}/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          wo_item_id: woItemId || null
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Item berhasil dihapus dari box');
      fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Gagal menghapus item');
    }
  };

  const toggleBox = (boxId: string) => {
    const newSet = new Set(expandedBoxes);
    if (newSet.has(boxId)) {
      newSet.delete(boxId);
    } else {
      newSet.add(boxId);
    }
    setExpandedBoxes(newSet);
  };

  const calculateBoxTotals = (box: BoxAssignment & { items: BoxItem[] }) => {
    const totalColli = box.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalVolume = box.items.reduce((sum, item) => sum + (item.volume_cbm || 0), 0);
    const totalWeight = box.items.reduce((sum, item) => sum + (item.gross_weight_kg || 0), 0);
    return { totalColli, totalVolume, totalWeight };
  };

  const manifestSummary = boxes.reduce(
    (acc, box) => {
      const totals = calculateBoxTotals(box);
      acc.boxes += 1;
      acc.colli += totals.totalColli;
      acc.volume += totals.totalVolume;
      acc.weight += totals.totalWeight;
      return acc;
    },
    { boxes: 0, colli: 0, volume: 0, weight: 0 }
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-500 font-medium">Memuat Box Manager...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/sbu/forwarding/consol/${consolId}`)} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Box Manager</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
              <Ship className="w-3.5 h-3.5" />
              <span>Container {container?.container_number} ({container?.container_type})</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowCreateBox(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Buat Box Baru
          </Button>
          <Link href={`/sbu/forwarding/consol/${consolId}`}>
            <Button variant="secondary">Kembali ke Consol</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-slate-800">{manifestSummary.boxes}</div>
            <div className="text-xs text-slate-500 font-medium">Total Box</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-indigo-600">{manifestSummary.colli}</div>
            <div className="text-xs text-slate-500 font-medium">Total Colli</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-emerald-600">{manifestSummary.volume.toFixed(2)}</div>
            <div className="text-xs text-slate-500 font-medium">Total CBM</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-amber-600">{manifestSummary.weight.toFixed(0)}</div>
            <div className="text-xs text-slate-500 font-medium">Total Kg</div>
          </CardContent>
        </Card>
      </div>

      {showCreateBox && (
        <Card className="border-indigo-200 shadow-sm bg-indigo-50/30">
          <CardHeader className="pb-3 border-b border-indigo-100">
              <h3 className="text-base font-bold flex items-center gap-2 text-indigo-800">
                <Plus className="w-4 h-4" /> Buat Box Baru
              </h3>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleCreateBox} className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kode Box *</label>
                <input
                  type="text"
                  required
                  value={newBox.box_code}
                  onChange={e => setNewBox({ ...newBox, box_code: e.target.value })}
                  placeholder="BOX-001"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Volume (CBM)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newBox.volume_cbm}
                  onChange={e => setNewBox({ ...newBox, volume_cbm: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Colli</label>
                <input
                  type="number"
                  value={newBox.colli}
                  onChange={e => setNewBox({ ...newBox, colli: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Weight (Kg)</label>
                <input
                  type="number"
                  value={newBox.weight_kg}
                  onChange={e => setNewBox({ ...newBox, weight_kg: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreateBox(false)}>
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {boxes.length === 0 ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-8 text-center">
              <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Belum ada box di container ini</p>
              <p className="text-slate-400 text-sm mt-1">Klik "Buat Box Baru" untuk memulai packing.</p>
            </CardContent>
          </Card>
        ) : (
          boxes.map((box) => {
            const totals = calculateBoxTotals(box);
            const isExpanded = expandedBoxes.has(box.id);
            const isAddingItem = selectedBoxId === box.id;

            return (
              <Card key={box.id} className="border-slate-200 shadow-sm">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                  onClick={() => toggleBox(box.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      {box.box_code}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{box.box_code}</div>
                      <div className="text-xs text-slate-500">
                        {box.items.length} item • {totals.totalColli} colli • {totals.totalVolume.toFixed(2)} CBM
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <div className="font-semibold text-slate-700">{totals.totalWeight.toFixed(0)} Kg</div>
                      <div className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        box.status === 'packed' ? 'bg-amber-100 text-amber-700' :
                        box.status === 'stuffed' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {box.status.toUpperCase()}
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Informasi Box</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Kode Box:</span>
                            <span className="font-semibold text-slate-900">{box.box_code}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Colli:</span>
                            <span className="font-semibold text-slate-900">{box.colli || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Volume:</span>
                            <span className="font-semibold text-slate-900">{box.volume_cbm ? `${box.volume_cbm} CBM` : '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Weight:</span>
                            <span className="font-semibold text-slate-900">{box.weight_kg ? `${box.weight_kg} Kg` : '-'}</span>
                          </div>
                          {box.seal_number && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Seal:</span>
                              <span className="font-semibold text-slate-900">{box.seal_number}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Packing List</h4>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-48 overflow-y-auto">
                          {box.items.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-2">Belum ada item di box ini</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead className="text-slate-500 border-b border-slate-200">
                                <tr>
                                  <th className="text-left py-1">Item</th>
                                  <th className="text-center py-1">Qty</th>
                                  <th className="text-right py-1">Colli</th>
                                  <th className="text-right py-1">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {box.items.map((item) => (
                                  <tr key={item.id}>
                                    <td className="py-1.5">
                                      <div className="font-medium text-slate-900">{item.wo_item?.work_order?.wo_number || '-'}</div>
                                      <div className="text-slate-500">{item.commodity || item.description || 'Item'}</div>
                                    </td>
                                    <td className="text-center py-1.5">{item.quantity}</td>
                                    <td className="text-right py-1.5">{item.quantity}</td>
                                    <td className="text-right py-1.5">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveItemFromBox(box.id, item.wo_item_id); }}
                                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                        title="Hapus"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </div>

                    {isAddingItem ? (
                      <Card className="border-indigo-200 bg-indigo-50/30">
                        <CardContent className="p-4">
                          <h4 className="text-sm font-bold text-indigo-800 mb-3">Tambah Item ke {box.box_code}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pilih Item</label>
                              <select
                                value={addItemForm.wo_item_id}
                                onChange={e => setAddItemForm({ ...addItemForm, wo_item_id: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                              >
                                <option value="">-- Pilih WO Item --</option>
                                {availableItems.map((item) => (
                                  <option key={item.wo_item_id} value={item.wo_item_id}>
                                    {item.wo_item?.work_order?.wo_number} - {item.commodity || item.description || 'Item'}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Qty</label>
                              <input
                                type="number"
                                min="1"
                                value={addItemForm.quantity}
                                onChange={e => setAddItemForm({ ...addItemForm, quantity: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Volume</label>
                              <input
                                type="number"
                                step="0.01"
                                value={addItemForm.volume_cbm}
                                onChange={e => setAddItemForm({ ...addItemForm, volume_cbm: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Weight (Kg)</label>
                              <input
                                type="number"
                                value={addItemForm.gross_weight_kg}
                                onChange={e => setAddItemForm({ ...addItemForm, gross_weight_kg: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                              />
                            </div>
                            <div className="flex items-end gap-2">
                              <Button
                                onClick={() => handleAddItemToBox(box.id)}
                                disabled={submitting || !addItemForm.wo_item_id}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              </Button>
                              <Button variant="secondary" onClick={() => { setSelectedBoxId(null); setAddItemForm({ wo_item_id: '', quantity: 1, description: '', commodity: '', volume_cbm: '', gross_weight_kg: '' }); }}>
                                Batal
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedBoxId(box.id)}
                        className="text-xs"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Item
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
