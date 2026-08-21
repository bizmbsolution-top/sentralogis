'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Warehouse, CheckCircle2, ArrowRight, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function InternalMovementTaskPage() {
  const params = useParams();
  const rawId = params?.id;
  const movementId = Array.isArray(rawId) ? rawId[0] : (rawId || '');
  const router = useRouter();
  const [mov, setMov] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (!movementId) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase
        .from('wh_internal_movements' as any) as any)
        .select(`
          id, quantity, movement_date, status, notes,
          product:product_sku_id(name, sku_code),
          from_location:from_location_id(code),
          to_location:to_location_id(code)
        `)
        .eq('id', movementId)
        .single();
      setMov(data);
      setLoading(false);
    })();
  }, [movementId]);

  const finish = async () => {
    setExecuting(true);
    try {
      const { error } = await supabase.rpc('execute_internal_movement', {
        p_movement_id: movementId,
      });
      if (error) throw error;
      toast.success('Movement berhasil dieksekusi!');
      router.push('/warehouse/portal');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengeksekusi movement');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (!mov) {
    return (
      <div className="p-10 text-center">
        <XCircle size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="font-bold text-slate-500">Movement tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
          <Warehouse size={24} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900">Internal Movement</h1>
          <p className="text-sm text-slate-500 font-medium">Eksekusi pemindahan stok</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 space-y-4">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Produk</span>
            <p className="font-black text-slate-900 text-lg">{mov.product?.name || '-'}</p>
            <p className="text-xs font-mono text-slate-500">{mov.product?.sku_code || '-'}</p>
          </div>

          <div className="flex items-center gap-3 py-3">
            <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Dari</span>
              <p className="font-black text-slate-900 text-base mt-1">{mov.from_location?.code || '-'}</p>
            </div>
            <ArrowRight size={20} className="text-slate-300 shrink-0" />
            <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Ke</span>
              <p className="font-black text-slate-900 text-base mt-1">{mov.to_location?.code || '-'}</p>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-center">
            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Jumlah</span>
            <p className="text-3xl font-black text-emerald-700 mt-1">{mov.quantity}</p>
          </div>

          {mov.notes && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Catatan</span>
              <p className="text-sm font-medium text-slate-700 mt-0.5">{mov.notes}</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={finish}
            disabled={executing || mov.status !== 'PENDING'}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-xl text-base font-black flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
          >
            {executing ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <CheckCircle2 size={20} />
            )}
            {mov.status !== 'PENDING' ? 'Selesai' : 'Selesaikan Tugas'}
          </button>
        </div>
      </div>
    </div>
  );
}
