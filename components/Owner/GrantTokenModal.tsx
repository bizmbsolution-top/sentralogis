'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { Coins, X, Zap, ShieldCheck } from 'lucide-react';

interface GrantTokenModalProps {
  isOpen: boolean;
  tenant: { tenant_code: string; name: string; token_balance?: number } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GrantTokenModal({ isOpen, tenant, onClose, onSuccess }: GrantTokenModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !tenant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const tokenAmount = parseInt(amount);
    if (isNaN(tokenAmount) || tokenAmount <= 0) {
      toast.error('Masukkan jumlah token yang valid');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('grant_tokens_to_tenant', {
        p_tenant_code: tenant.tenant_code,
        p_token_amount: tokenAmount
      });

      if (error) throw error;

      const result = data as { success?: boolean; message?: string } | null;

      if (result?.success) {
        toast.success(result.message || 'Berhasil grant token!');
        onSuccess();
        onClose();
        setAmount('');
      } else {
        toast.error(result?.message || 'Gagal grant token');
      }
    } catch (err: any) {
      console.error('Grant error:', err);
      toast.error('Terjadi kesalahan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Grant Tokens</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 bg-slate-50 border-b border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Target Tenant</p>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900">{tenant.name}</h4>
              <p className="text-xs text-slate-500 font-mono">{tenant.tenant_code}</p>
            </div>
            {tenant.token_balance !== undefined && (
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Current</p>
                <p className="text-sm font-bold text-blue-600">{tenant.token_balance.toLocaleString()} TKN</p>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Jumlah Token
            </label>
            <div className="relative">
              <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="contoh: 500"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                required
                min="1"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-blue-700 leading-relaxed">
              Token akan langsung ditambahkan ke saldo tenant dan tercatat di sistem audit.
            </p>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Memproses...' : (
                <>
                  <ShieldCheck size={18} />
                  Grant Token
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
