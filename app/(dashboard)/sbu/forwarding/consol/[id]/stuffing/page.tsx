'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Loader2, Package, Save, AlertTriangle, CheckCircle2,
  Ship, Box, User, MapPin
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import type { ForwardingConsolidationDetail } from '@/lib/actions/forwardingActions';
import type { ForwardingContainerAssignment } from '@/lib/domain/forwarding/types';
import { getConsolidationDetail, stuffContainer } from '@/lib/actions/forwardingActions';

export default function StuffingManagerPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();

  const preSelectedContainer = searchParams.get('container');

  const [consol, setConsol] = useState<ForwardingConsolidationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedContainerId, setSelectedContainerId] = useState<string>(preSelectedContainer || '');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [sealNumber, setSealNumber] = useState('');
  const [blNumber, setBlNumber] = useState('');

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getConsolidationDetail(id);
      setConsol(data);
    } catch (error: any) {
      console.error(error);
      toast.error('Gagal memuat data stuffing');
    } finally {
      setLoading(false);
    }
  }, [id]);

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

    setSubmitting(true);
    try {
      const result = await stuffContainer(
        id,
        selectedContainerId,
        [...selectedItemIds],
        sealNumber || null,
        blNumber || null,
      );

      if (!result.success) throw new Error(result.error);

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

  const selectedContainer = consol?.containers?.find(c => c.id === selectedContainerId);
  const unassignedItems = consol?.items?.filter((item: any) => !consol?.containers?.some(c => c.id !== item.container_assignment_id)) || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-500 font-medium">Memuat data stuffing...</p>
      </div>
    );
  }

  if (!consol) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-800">Konsolidasi Tidak Ditemukan</h2>
        <Button onClick={() => router.push(`/sbu/forwarding/consol/${id}`)} className="mt-4">Kembali</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stuffing Manager</h1>
          <p className="text-slate-500 text-sm mt-1">{consol.consol_number} — {consol.vessel_name}</p>
        </div>
        <Link href={`/sbu/forwarding/consol/${id}`}>
          <Button variant="secondary">Kembali ke Detail</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kiri: Container Selection */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold">Pilih Container</h3>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {consol.containers?.map((container) => (
                <div
                  key={container.id}
                  onClick={() => setSelectedContainerId(container.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedContainerId === container.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="font-semibold text-sm">{container.container_number}</div>
                  <div className="text-xs text-slate-500">{container.container_type}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Kanan: Items Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold">Pilih Item untuk di-Stuff</h3>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {unassignedItems.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedItemIds.has(item.id)
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">{item.wo_item?.item_code || item.id}</div>
                        <div className="text-xs text-slate-500">
                          {item.commodity || '-'} | {item.volume_cbm || 0} CBM | {item.gross_weight_kg || 0} Kg
                        </div>
                      </div>
                      {selectedItemIds.has(item.id) && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Seal Number (opsional)"
              value={sealNumber}
              onChange={(e) => setSealNumber(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="BL Number (opsional)"
              value={blNumber}
              onChange={(e) => setBlNumber(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
            <Button
              onClick={handleSubmitStuffing}
              disabled={submitting || !selectedContainerId || selectedItemIds.size === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Simpan Stuffing
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
