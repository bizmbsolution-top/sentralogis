'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Loader2, 
  DollarSign, 
  FileText, 
  Truck,
  CheckCircle,
  TrendingDown,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface AddCostModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function AddCostModal({ onClose, onSuccess }: AddCostModalProps) {
  const [loading, setLoading] = useState(false);
  const [jos, setJos] = useState<any[]>([]);
  const [fetchingJos, setFetchingJos] = useState(true);

  // Form State
  const [selectedJoId, setSelectedJoId] = useState('');
  const [costType, setCostType] = useState('unloading');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [chargeType, setChargeType] = useState<'reimbursement' | 'surcharge'>('reimbursement');

  useEffect(() => {
    fetchCompletedJos();
  }, []);

  const fetchCompletedJos = async () => {
    try {
      setFetchingJos(true);
      const { data, error } = await supabase
        .from('job_orders')
        .select('id, jo_number, purchase_price, base_price, driver_share_percentage')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJos(data || []);
    } catch (err) {
      console.error('Error fetching JOs:', err);
      toast.error('Gagal memuat daftar Job Order');
    } finally {
      setFetchingJos(false);
    }
  };

  const selectedJO = jos.find(j => j.id === selectedJoId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJoId) return toast.error('Pilih Job Order terlebih dahulu');
    if (!amount || isNaN(Number(amount))) return toast.error('Jumlah biaya tidak valid');

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('add_costs')
        .insert({
          job_order_id: selectedJoId,
          cost_type: costType,
          charge_type: chargeType,
          amount: Number(amount),
          description: description,
          is_billable: true, // Always true for surcharge/reimbursement
          status: 'need_approval', // Trip charges to customer always need CS/Finance approval
          created_by: user?.id
        });

      if (error) throw error;

      toast.success('Add Cost berhasil ditambahkan');
      onSuccess();
    } catch (err: any) {
      console.error('Submit Error:', err);
      toast.error(err.message || 'Gagal menambahkan Add Cost');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-slate-900 px-8 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-600/20">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="text-white font-black text-lg italic uppercase tracking-tight">Create Trip Charges</h3>
              <p className="text-blue-400 text-[9px] font-black uppercase tracking-[0.2em] mt-0.5 italic">Finance Entry Console</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Job Order Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
              <Truck size={12} className="text-blue-600" /> Select Completed Job Order
            </label>
            <select 
              className="w-full h-12 bg-slate-50 border-transparent rounded-2xl px-4 text-sm font-black text-slate-900 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
              value={selectedJoId}
              onChange={(e) => setSelectedJoId(e.target.value)}
              required
              disabled={fetchingJos}
            >
              <option value="">-- PILIH JO --</option>
              {jos.map(jo => (
                <option key={jo.id} value={jo.id}>{jo.jo_number}</option>
              ))}
            </select>
            {fetchingJos && <p className="text-[8px] font-black text-blue-500 uppercase italic animate-pulse px-1">Loading fleet records...</p>}
          </div>

          {/* REFERENCE: PURCHASE PRICE */}
          {selectedJO?.purchase_price > 0 && (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-start gap-4">
              <div className="bg-white p-2 rounded-xl text-blue-600 shadow-sm">
                <TrendingDown size={18} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">💰 Harga Beli (Vendor Agreement)</p>
                <p className="text-lg font-black text-slate-900 tracking-tight italic">{formatRupiah(selectedJO.purchase_price)}</p>
                <p className="text-[9px] font-bold text-slate-400 mt-1 flex items-center gap-1 uppercase italic">
                  <Info size={10} /> Gunakan sebagai referensi saat input biaya tambahan
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <FileText size={12} className="text-blue-600" /> Cost Type
              </label>
              <select 
                className="w-full h-12 bg-slate-50 border-transparent rounded-2xl px-4 text-sm font-black text-slate-900 focus:bg-white transition-all outline-none"
                value={costType}
                onChange={(e) => setCostType(e.target.value)}
              >
                <option value="unloading">Unloading / Kuli</option>
                <option value="port_ticket">Tiket Pelabuhan</option>
                <option value="overnight">Overnight / Nginap</option>
                <option value="waiting">Waiting Time</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <DollarSign size={12} className="text-blue-600" /> Amount (Rp)
              </label>
              <Input 
                type="number"
                placeholder="0"
                className="h-12 bg-slate-50 border-transparent rounded-2xl px-4 font-black text-sm"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description / Notes</label>
            <textarea 
              className="w-full p-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold text-slate-600 focus:bg-white transition-all outline-none min-h-[80px]"
              placeholder="Detail biaya..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Charge Type Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipe Tagihan ke Customer</label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${chargeType === 'reimbursement' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <input 
                    type="radio" 
                    name="chargeType"
                    value="reimbursement"
                    checked={chargeType === 'reimbursement'}
                    onChange={() => setChargeType('reimbursement')}
                    className="hidden"
                  />
                  <span className={`text-[11px] font-black uppercase tracking-tight ${chargeType === 'reimbursement' ? 'text-emerald-700' : 'text-slate-600'}`}>
                    Reimbursement
                  </span>
                  {chargeType === 'reimbursement' && <CheckCircle size={16} className="text-emerald-500" />}
                </div>
                <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase">
                  At-Cost. Diganti full ke driver. Tidak dipotong komisi perusahaan.
                </p>
              </label>

              <label className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${chargeType === 'surcharge' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <input 
                    type="radio" 
                    name="chargeType"
                    value="surcharge"
                    checked={chargeType === 'surcharge'}
                    onChange={() => setChargeType('surcharge')}
                    className="hidden"
                  />
                  <span className={`text-[11px] font-black uppercase tracking-tight ${chargeType === 'surcharge' ? 'text-blue-700' : 'text-slate-600'}`}>
                    Surcharge
                  </span>
                  {chargeType === 'surcharge' && <CheckCircle size={16} className="text-blue-500" />}
                </div>
                <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase">
                  Extra Revenue. Tunduk pada persentase bagi hasil driver.
                </p>
              </label>
            </div>
          </div>

          {/* Simulasi Bagi Hasil */}
          {chargeType === 'surcharge' && selectedJO && Number(amount) > 0 && (
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em] mb-3">Estimasi Bagi Hasil Surcharge</p>
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driver Payout ({selectedJO.driver_share_percentage}%)</span>
                <span className="text-sm font-black text-emerald-400 italic">
                  {formatRupiah(Number(amount) * (Number(selectedJO.driver_share_percentage) / 100))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company Margin ({100 - Number(selectedJO.driver_share_percentage)}%)</span>
                <span className="text-sm font-black text-blue-400 italic">
                  {formatRupiah(Number(amount) * ((100 - Number(selectedJO.driver_share_percentage)) / 100))}
                </span>
              </div>
            </div>
          )}

          {chargeType === 'reimbursement' && Number(amount) > 0 && (
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-[9px] text-emerald-400 font-black uppercase tracking-[0.2em] mb-2">Estimasi Reimbursement</p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driver Payout (Full 100%)</span>
                <span className="text-sm font-black text-emerald-400 italic">
                  {formatRupiah(Number(amount))}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose}
              className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <span className="flex items-center gap-2"><CheckCircle size={14} /> Submit Cost</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
