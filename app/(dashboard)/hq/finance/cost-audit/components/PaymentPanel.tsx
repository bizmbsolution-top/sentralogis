'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { Loader2, Upload } from 'lucide-react';
import UnifiedFinancePanel from '@/components/shared/UnifiedFinancePanel';
import PaymentModal from '@/components/shared/PaymentModal';

interface JobGroup {
  jo: any;
  costs: any[];
  margin: any;
}

interface Props {
  joList: JobGroup[];
  paymentMap: Record<string, any[]>;
  onRefresh: () => void;
}

type PayType = 'advance_driver' | 'pelunasan_driver' | 'advance_vendor' | 'pelunasan_vendor';

export default function PaymentPanel({ joList, paymentMap, onRefresh }: Props) {
  const { profile } = useAuth();
  const [payModal, setPayModal] = useState<{ jo: any; type: PayType; label: string; maxAmount: number } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const handleUploadProof = async (paymentId: string, file: File) => {
    setUploading(paymentId);
    const ext = file.name.split('.').pop();
    const path = `payment-proofs/${paymentId}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('payment-proofs').upload(path, file, { upsert: true });
    if (uploadErr) { toast.error('Gagal upload: ' + uploadErr.message); setUploading(null); return; }
    const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(path);
    const { error: updateErr } = await supabase.from('job_order_payments').update({ transfer_proof_url: urlData.publicUrl }).eq('id', paymentId);
    if (updateErr) { toast.error('Gagal simpan URL'); setUploading(null); return; }
    toast.success('Bukti transfer terupload');
    setUploading(null);
    onRefresh();
  };

  const handleVerify = async (paymentId: string) => {
    const { error } = await supabase.from('job_order_payments').update({
      status: 'verified',
      verified_by: profile?.id,
      verified_at: new Date().toISOString(),
    }).eq('id', paymentId);
    if (error) { toast.error('Gagal verifikasi'); return; }
    toast.success('Pembayaran diverifikasi');
    onRefresh();
  };

  return (
    <>
      <div className="border border-slate-200 bg-white">
        <div className="p-5">
          <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-4">Payment Status</p>
          <div className="space-y-6">
            {joList.map(jg => {
              const jo = jg.jo;
              const joPayments = paymentMap[jo.id] || [];
              return (
                <div key={jo.id} className="border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold text-gray-900 mb-3 uppercase">{jo.jo_number}</p>
                  <UnifiedFinancePanel
                    jo={jo}
                    payments={joPayments}
                    mode="hq"
                    onRefresh={onRefresh}
                    onPay={(type, label, maxAmount) => setPayModal({ jo, type: type as PayType, label, maxAmount })}
                    onUploadProof={(pId) => {
                      const input = document.createElement('input');
                      input.type = 'file'; input.accept = 'image/*,.pdf';
                      input.onchange = (e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleUploadProof(pId, f); };
                      input.click();
                    }}
                    onVerify={handleVerify}
                    uploading={uploading}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {payModal && (
        <PaymentModal
          jo={payModal.jo}
          paymentType={payModal.type}
          label={payModal.label}
          maxAmount={payModal.maxAmount}
          defaultPaidBy="hq"
          onClose={() => setPayModal(null)}
          onSuccess={() => { setPayModal(null); onRefresh(); }}
        />
      )}
    </>
  );
}
