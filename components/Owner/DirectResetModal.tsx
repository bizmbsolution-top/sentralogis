'use client';

import { useState } from 'react';
import { adminResetPasswordDirect } from '@/lib/actions/tenantActions';
import toast from 'react-hot-toast';
import { Key, X, Loader2 } from 'lucide-react';

export default function DirectResetModal({ isOpen, onClose, tenant }: any) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !tenant) return null;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error('Min. 6 characters');
    
    setLoading(true);
    try {
      await adminResetPasswordDirect(tenant.admin_email, newPassword);
      toast.success('Password Updated Successfully');
      onClose();
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Reset Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <Key className="text-blue-500 w-6 h-6" />
          </div>
          <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Executive Override</h2>
          <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase italic">Manually set password for {tenant.name}</p>
        </div>

        <form onSubmit={handleReset} className="space-y-6">
          <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Target Account</p>
            <p className="text-xs font-bold text-white italic">{tenant.admin_email}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">New Security Key</label>
            <input 
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="ENTER NEW PASSWORD"
              className="w-full bg-slate-950 border border-white/5 p-4 rounded-xl text-white text-xs outline-none focus:border-blue-500 font-bold tracking-widest"
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl text-[10px] font-black uppercase italic tracking-widest transition-all shadow-lg shadow-blue-600/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Override'}
          </button>
        </form>
      </div>
    </div>
  );
}
