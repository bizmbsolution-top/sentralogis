'use client';

import React, { useState } from 'react';
import { 
  X, 
  Edit2, 
  Loader2, 
  DollarSign, 
  FileText, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface EditAddCostModalProps {
  item: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAddCostModal({ item, onClose, onSuccess }: EditAddCostModalProps) {
  const [loading, setLoading] = useState(false);

  // Form State
  const [costType, setCostType] = useState(item.cost_type);
  const [amount, setAmount] = useState(item.amount.toString());
  const [description, setDescription] = useState(item.description || '');
  const [chargeType, setChargeType] = useState<'reimbursement' | 'surcharge'>(item.charge_type || 'reimbursement');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return toast.error('Jumlah biaya tidak valid');

    try {
      setLoading(true);

      const { error } = await supabase
        .from('extra_costs')
        .update({
          cost_type: costType,
          charge_type: chargeType,
          amount: Number(amount),
          description: description,
          is_billable: true,
          status: 'need_approval', // Editing will reset it to need_approval
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;

      try {
        await (supabase.from("notifications" as any) as any).insert({
          tenant_id: item?.job_orders?.tenant_id || (await supabase.auth.getUser()).data.user?.user_metadata?.tenant_id,
          role: "hq_finance",
          title: "Need Approval Add Cost",
          message: `Biaya tambahan diperbarui & diajukan untuk JO ${item?.job_orders?.jo_number || item?.jo_id}`,
          type: "add_cost",
          is_read: false,
          metadata: { link: "/hq/finance/cost-audit?sbu=TRUCKING" }
        });
      } catch (e) {
        console.error("Notification insert error", e);
      }

      toast.success('Data berhasil diperbarui');
      onSuccess();
    } catch (err: any) {
      console.error('Update Error:', err);
      toast.error(err.message || 'Gagal memperbarui data');
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
            <div className="bg-amber-500 p-2.5 rounded-xl text-white shadow-lg shadow-amber-500/20">
              <Edit2 size={20} />
            </div>
            <div>
              <h3 className="text-white font-black text-lg italic uppercase tracking-tight">Edit Trip Charges</h3>
              <p className="text-amber-400 text-[9px] font-black uppercase tracking-[0.2em] mt-0.5 italic">Update Draft Record</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3">
            <AlertTriangle className="text-amber-600 shrink-0" size={18} />
            <div>
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Job Order Reference</p>
              <p className="text-xs font-bold text-amber-900">{item.job_orders?.jo_number}</p>
            </div>
          </div>

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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

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

          <div className="flex gap-3 pt-4">
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
              className="flex-1 h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-slate-900/20"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <span className="flex items-center gap-2"><CheckCircle size={14} /> Update Cost</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
