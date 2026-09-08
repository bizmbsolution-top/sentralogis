'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Ship, MapPin, Calendar, Loader2, Package, CheckCircle2,
  XCircle, AlertTriangle, ArrowRight, Box, FileText, Truck
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { ForwardingConsolidationDetail } from '@/lib/actions/forwardingActions';
import Link from 'next/link';
import { getConsolidationDetail, deconsolConsolidation } from '@/lib/actions/forwardingActions';

export default function ConsolidationDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { profile } = useAuth();

  const [consol, setConsol] = useState<ForwardingConsolidationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deconsolLoading, setDeconsolLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getConsolidationDetail(id);
      setConsol(data);
    } catch (error: any) {
      console.error(error);
      toast.error('Gagal memuat detail konsolidasi');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeconsol = async () => {
    if (!consol || !profile?.id) return;
    setDeconsolLoading(true);

    try {
      const result = await deconsolConsolidation(consol.id);
      if (!result.success) throw new Error(result.error);

      toast.success(`Deconsol berhasil! ${result.data?.delivery_jobs_count || 0} delivery WO dibuat.`);
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
      default: return <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">{status || 'UNKNOWN'}</span>;
    }
  };

  const getContainerStatusBadge = (status: string) => {
    switch (status) {
      case 'empty': return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold">EMPTY</span>;
      case 'stuffed': return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-semibold">STUFFED</span>;
      case 'shipped': return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">SHIPPED</span>;
      case 'arrived': return <span className="px-2 py-0.5 bg-fuchsia--100 text-fuchsia-700 rounded text-xs font-semibold">ARRIVED</span>;
      case 'deconsoled': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">DECONSOLED</span>;
      case 'returned': return <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs font-semibold">RETURNED</span>;
      default: return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold">{status || 'N/A'}</span>;
    }
  };

  const calculateFillRate = () => {
    if (!consol?.containers || consol.containers.length === 0) return 0;
    const stuffed = consol.containers.filter(c => c.status === 'stuffed' || c.status === 'shipped' || c.status === 'arrived' || c.status === 'deconsoled').length;
    return Math.round((stuffed / consol.containers.length) * 100);
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

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{consol.consol_number}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
              <Ship className="w-3.5 h-3.5" />
              <span>{consol.vessel_name} {consol.voyage_number ? `(${consol.voyage_number})` : ''}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(consol.status || 'open')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kiri: Info Konsolidasi */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Ship className="w-4 h-4 text-indigo-500" /> Informasi Konsolidasi
              </h3>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <div className="text-xs text-slate-500 font-medium">Rute</div>
                <div className="font-semibold text-slate-900">{consol.origin_port} → {consol.destination_port}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">ETD / ETA</div>
                <div className="font-semibold text-slate-900">
                  {consol.etd ? new Date(consol.etd).toLocaleDateString('id-ID') : '-'} / {consol.eta ? new Date(consol.eta).toLocaleDateString('id-ID') : '-'}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Shipping Line</div>
                <div className="font-semibold text-slate-900">{consol.shipping_line_name || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Fill Rate</div>
                <div className="font-semibold text-slate-900">{calculateFillRate()}%</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kanan: Container & Items */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Box className="w-5 h-5 text-indigo-500" /> Container Assignments
            </h3>
            <div className="flex gap-2">
              {canStuff && (
                <Link href={`/sbu/forwarding/consol/${consol.id}/stuffing`}>
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    <Package className="w-4 h-4 mr-1" /> Stuffing
                  </Button>
                </Link>
              )}
              {canDeconsol && (
                <Button size="sm" onClick={handleDeconsol} disabled={deconsolLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {deconsolLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  Deconsol
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {consol.containers?.map((container) => (
              <Card key={container.id} className="border-slate-200 shadow-sm">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                        {container.container_number}
                      </span>
                      <span className="font-bold text-slate-800">{container.container_type}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Seal: {container.seal_number || '-'} | BL: {container.bl_number || '-'}
                    </div>
                  </div>
                  <div>{getContainerStatusBadge(container.status || 'empty')}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
