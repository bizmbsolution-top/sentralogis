"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Mail, Lock, User, ArrowRight, RefreshCw } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      toast.success("Pendaftaran berhasil! Silakan login.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Gagal melakukan pendaftaran");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 selection:bg-emerald-500/30 font-sans">
      <Toaster position="top-right" />
      
      {/* Background Effect */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full animate-pulse decoration-delay-1000" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500 rounded-[2rem] shadow-2xl shadow-emerald-500/20 mb-4 transform hover:scale-110 transition-transform cursor-pointer">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">Initialize Identity<span className="text-emerald-500">.</span></h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] font-mono">Sentralogis Gateway Security v4.5</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Legal Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-emerald-500 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Authorized Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-emerald-500 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                    placeholder="name@sentralogis.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Access Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-emerald-500 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-sm font-black focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700 tracking-[0.3em]"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white py-6 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-4 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] mt-4"
            >
              {loading ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> Provisioning Credentials...</>
              ) : (
                <><ArrowRight className="w-5 h-5" /> Execute Registration</>
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              Already have authorization? <Link href="/login" className="text-emerald-500 hover:underline">Access Portal</Link>
            </p>
          </div>
        </div>

        <div className="text-center opacity-40">
           <p className="text-[9px] font-black uppercase tracking-[0.5em]">&copy; 2026 PT Sentral Logistik Indonesia</p>
        </div>
      </div>
    </div>
  );
}
