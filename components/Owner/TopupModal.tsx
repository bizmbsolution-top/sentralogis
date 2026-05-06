import { useState, useEffect } from 'react';
import { injectTokensAction } from '@/lib/actions/tenantActions';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { Coins, X, Loader2, Info, MessageCircle, AlertCircle, Shield, CheckCircle2, ArrowUpRight } from 'lucide-react';

export default function TopupModal({ isOpen, onClose, tenant, onRefresh }: any) {
  const [amountReceived, setAmountReceived] = useState('');
  const [note, setNote] = useState('');
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [internalWA, setInternalWA] = useState('');

  const calculatedTokens = Math.floor((parseInt(amountReceived) || 0) / 1000);

  useEffect(() => {
    if (isOpen && tenant) {
      setAmountReceived('');
      setNote('');
      setIsRejectMode(false);
      setRejectionReason('');
      setInternalWA(tenant.whatsapp_snapshot || tenant.whatsapp || '');
    }
  }, [isOpen, tenant]);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRejectMode && !rejectionReason) return toast.error('Alasan penolakan wajib diisi');
    
    if (!isRejectMode && calculatedTokens <= 0) {
      return toast.error('Nominal diterima minimal Rp 1.000');
    }

    setLoading(true);
    try {
      // 1. Sinkronisasi WA ke Profil jika ada input baru/manual
      if (internalWA && internalWA !== tenant.whatsapp) {
        const { data: tData } = await supabase.from('tenants').select('user_id').eq('tenant_code', tenant.tenant_code).maybeSingle();
        const targetUid = tData?.user_id || tenant.user_id;
        
        if (targetUid) {
          // FIX: removed 'wh' typo
          await supabase.from('profiles').update({ whatsapp: internalWA }).eq('id', targetUid);
        }
      }

      // 2. Jalankan injectTokensAction
      const res = await injectTokensAction(
        tenant.tenant_code, 
        calculatedTokens, 
        note || `Top-up Rp ${amountReceived} -> ${calculatedTokens} token`,
        tenant.requestId,
        isRejectMode,
        rejectionReason
      );

      if (res.success) {
        toast.success(res.message);
        
        if (!isRejectMode) {
          const remarksSection = note ? `\n- Keterangan: ${note}` : '';
          const waMessage = `Halo ${tenant.name},\n\nTerima kasih, saldo Anda sudah terisi sebesar *${calculatedTokens} token*.\n\n*Detail Transaksi:*\n- Status: Berhasil Disetujui\n- Booking: ${tenant.requestAmount || '--'} TKN\n- Saldo Masuk: ${calculatedTokens} TKN${remarksSection}\n\nTerima kasih telah mempercayai Sentralogis!`;
          const encoded = encodeURIComponent(waMessage);
          window.open(`https://wa.me/${internalWA.replace(/\D/g, '') || ''}?text=${encoded}`, '_blank');
        }

        onRefresh();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses transaksi');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !tenant) return null;
  const isFromRequest = !!tenant.requestId;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className={`w-14 h-14 ${isRejectMode ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'} rounded-2xl flex items-center justify-center mx-auto mb-4 border shadow-sm`}>
            <Coins className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {isRejectMode ? 'Decline Request' : (isFromRequest ? 'Settlement Verification' : 'Manual Injection')}
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1">{tenant.name} • {tenant.tenant_code}</p>
        </div>

        {isFromRequest && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Booking</p>
              <p className="text-base font-bold text-slate-900">{tenant.requestAmount?.toLocaleString()} <span className="text-[10px] text-slate-400">TKN</span></p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transfer</p>
              <p className="text-base font-bold text-blue-600">Rp {tenant.requestPrice?.toLocaleString()}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleAction} className="space-y-5">
          {!isRejectMode ? (
            <div className="space-y-5">
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1">Nominal Diterima (Rp)</label>
                  <input 
                    type="text" required placeholder="0"
                    value={amountReceived ? parseInt(amountReceived).toLocaleString('id-ID') : ''} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setAmountReceived(val);
                    }}
                    className="w-full bg-white border border-slate-200 p-4 rounded-xl text-slate-900 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
               </div>

               <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Injection Yield</p>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{calculatedTokens} <span className="text-xs text-slate-400">TKN</span></p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-20" />
               </div>

               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1">Remarks / Internal Note</label>
                  <textarea 
                    value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="Reference, bank, or other notes..."
                    className="w-full bg-white border border-slate-200 p-3 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 min-h-[80px]"
                  />
               </div>

               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1">WhatsApp Identity</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" value={internalWA} onChange={(e) => setInternalWA(e.target.value)}
                      placeholder="62..."
                      className="flex-1 bg-white border border-slate-200 p-3 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                    />
                    <button 
                      type="button"
                      onClick={() => window.open(`https://wa.me/${internalWA.replace(/\D/g, '')}`, '_blank')}
                      className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>
               </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-red-600 ml-1">Reason for Rejection</label>
              <textarea 
                required value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Brief explanation..."
                className="w-full bg-white border border-red-200 p-4 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 min-h-[100px]"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            {!isRejectMode ? (
              <>
                <button type="button" onClick={() => setIsRejectMode(true)} className="px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all">Decline</button>
                <button 
                  type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Approve & Settle <ArrowUpRight className="w-4 h-4" /></>}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setIsRejectMode(false)} className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancel</button>
                <button 
                  type="submit" disabled={loading}
                  className="flex-[2] bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-600/20 flex items-center justify-center"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Rejection'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
