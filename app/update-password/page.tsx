"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ShieldCheck, Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      toast.success("Password updated successfully!");
      setTimeout(() => router.push('/'), 3000);
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase">Set New Access Credentials</h2>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
          {success ? (
            <div className="text-center space-y-6">
               <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
               </div>
               <div className="space-y-2">
                  <h2 className="text-2xl font-black italic tracking-tighter uppercase">Success!</h2>
                  <p className="text-slate-400 text-xs font-bold leading-relaxed">
                    Your password has been securely updated. Redirecting to login...
                  </p>
               </div>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Secure Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-emerald-500 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••••••" 
                      className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-sm font-black focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700 tracking-[0.3em]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-emerald-500 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••••••" 
                      className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-sm font-black focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700 tracking-[0.3em]"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white py-6 rounded-2xl text-xs font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-3 transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Finalize Access Update <ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
