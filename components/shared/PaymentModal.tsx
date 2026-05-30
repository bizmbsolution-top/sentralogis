'use client';

import { useState, useRef } from 'react';
import { X, Loader2, CheckSquare, Building, Users, Upload, Banknote } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';

const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

type PayType = 'advance_driver' | 'pelunasan_driver' | 'advance_vendor' | 'pelunasan_vendor';

interface PaymentModalProps {
  jo: any;
  paymentType: PayType;
  label: string;
  maxAmount: number;
  defaultPaidBy?: 'sbu' | 'hq';
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({ jo, paymentType, label, maxAmount, defaultPaidBy = 'hq', onClose, onSuccess }: PaymentModalProps) {
  const { profile } = useAuth();
  const [amount, setAmount] = useState(maxAmount);
  const [paidBy, setPaidBy] = useState<'sbu' | 'hq'>(defaultPaidBy);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (amount <= 0) { toast.error('Amount harus lebih dari 0'); return; }
    setSaving(true);

    // 1. Insert payment record
    const { data: inserted, error } = await supabase.from('job_order_payments').insert({
      job_order_id: jo.id,
      payment_type: paymentType,
      amount,
      paid_by: paidBy,
      paid_by_user: profile?.id,
      paid_at: new Date().toISOString(),
      notes: notes || null,
    }).select('id').single();

    if (error || !inserted) {
      toast.error('Gagal simpan: ' + (error?.message || 'unknown'));
      setSaving(false);
      return;
    }

    // 2. Upload bukti if file selected
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `payment-proofs/${inserted.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('payment-proofs').upload(path, file, { upsert: true });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(path);
        await supabase.from('job_order_payments').update({ transfer_proof_url: urlData.publicUrl }).eq('id', inserted.id);
      } else {
        toast.error('Upload bukti gagal: ' + uploadErr.message);
      }
    }

    toast.success('Pembayaran tercatat');
    setSaving(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md border border-gray-300 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase">Bayar {label}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900"><X size={18} /></button>
          </div>

          <p className="text-xs text-gray-600 mb-4">{jo.jo_number} • Maks: {fmt(maxAmount)}</p>

          <div className="space-y-4">
            {/* Amount */}
            <div>
              <p className="text-[10px] font-bold text-gray-600 uppercase mb-1">Amount</p>
              <input type="number" value={amount} max={maxAmount}
                onChange={e => setAmount(Math.min(Number(e.target.value), maxAmount))}
                className="w-full h-10 px-3 border border-gray-200 text-sm text-gray-900 outline-none focus:border-gray-400" />
            </div>

            {/* Paid By */}
            <div>
              <p className="text-[10px] font-bold text-gray-600 uppercase mb-1">Paid By</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setPaidBy('sbu')}
                  className={`w-full h-10 flex items-center justify-center gap-2 text-xs font-bold uppercase border transition-colors ${
                    paidBy === 'sbu'
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <Building size={14} /> SBU
                </button>
                <button
                  onClick={() => setPaidBy('hq')}
                  className={`w-full h-10 flex items-center justify-center gap-2 text-xs font-bold uppercase border transition-colors ${
                    paidBy === 'hq'
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <Users size={14} /> HQ
                </button>
              </div>
            </div>

            {/* Upload Bukti */}
            <div>
              <p className="text-[10px] font-bold text-gray-600 uppercase mb-1">Bukti Transfer</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-10 border border-dashed border-gray-300 bg-white hover:bg-gray-50 text-xs text-gray-600 flex items-center justify-center gap-2 transition-colors"
              >
                {file ? (
                  <span className="font-semibold text-gray-900 truncate max-w-[200px]">{file.name}</span>
                ) : (
                  <><Upload size={14} /> Pilih File</>
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>

            {/* Notes */}
            <div>
              <p className="text-[10px] font-bold text-gray-600 uppercase mb-1">Notes</p>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes..."
                className="w-full h-10 px-3 border border-gray-200 text-sm text-gray-900 outline-none focus:border-gray-400 placeholder-gray-400" />
            </div>

            {/* Payer info */}
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-3 border border-gray-100">
              <Banknote size={14} /> Paid by <span className="font-bold text-gray-800">{paidBy === 'hq' ? 'HQ Finance' : 'SBU'}</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button onClick={handleSubmit} disabled={amount <= 0 || saving}
                className="w-full h-10 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold uppercase flex items-center justify-center gap-2 shadow-sm">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckSquare size={14} />}
                Konfirmasi Bayar
              </Button>
              <Button onClick={onClose} variant="secondary" className="w-full h-10 text-xs font-bold uppercase bg-white border border-gray-200 text-gray-700 hover:bg-gray-50">
                Batal
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
