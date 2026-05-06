"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ShieldCheck, Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      setSent(true);
      toast.success("Security Link Dispatched to " + email);
    } catch (error: any) {
      toast.error(error.message || "Protocol Failure: Link not sent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black italic tracking-tighter uppercase">Identity Recovery</h2>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-2xl p-10 lg:p-12 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
          {sent ? (
            <div className="text-center space-y-6 animate-in zoom-in duration-500">
               <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
               </div>
               <div className="space-y-2">
                  <h3 className="text-2xl font-black italic tracking-tighter uppercase">Protocol Initialized</h3>
                  <p className="text-slate-400 text-xs font-bold leading-relaxed italic">
                    Check your official email inbox for the secure access restoration link.
                  </p>
               </div>
               <Link 
                 href="/login"
                 className="block w-full py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic"
               >
                 Return to Portal
               </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1 text-center">
                <h3 className="text-xl font-black italic tracking-tighter uppercase">Secure Reset Dispatch</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Identity Verification Required</p>
              </div>

              <form onSubmit={handleReset} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Official Identity Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      type="email" 
                      required
                      placeholder="admin@sentralogis.com" 
                      className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold outline-none focus:border-emerald-500/50 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white py-6 rounded-2xl text-xs font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/20"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Request Secure Link <ArrowRight className="w-5 h-5" /></>}
                </button>
              </form>

              <div className="pt-6 border-t border-white/5 text-center">
                <Link href="/login" className="text-[9px] font-black text-emerald-500 hover:underline uppercase tracking-widest italic">
                  Back to Gateway
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
