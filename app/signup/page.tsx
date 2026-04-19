"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Mail, Lock, User, ArrowRight, RefreshCw, Building2, ChevronLeft } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      
      // 1. Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Gagal membuat akun.");

      // 2. Create Organization (Multi-tenant)
      const { data: orgData, error: orgError } = await (supabase.from('organizations') as any)
        .insert([{ name: companyName }])
        .select()
        .single();
      
      // If error (table doesn't exist yet), we log it but proceed to profile update
      // This is a safety fall-back if migration hasn't run
      if (orgError) {
         console.warn("Organization table potentially missing or error:", orgError.message);
      }

      // 3. Update Profile (Role: admin_company)
      const { error: profileError } = await (supabase.from('profiles') as any)
        .upsert({
          id: authData.user.id,
          full_name: fullName,
          email: email,
          role: 'admin_company',
          organization_id: orgData?.id || null,
          is_active: true
        });

      if (profileError) throw profileError;

      toast.success("Registrasi Organisasi berhasil! Silakan login untuk konfigurasi lanjutan.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Gagal melakukan registrasi organisasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05080F] text-white flex items-center justify-center p-6 selection:bg-emerald-500/30">
      <Toaster position="top-right" />
      
      {/* Background Effect */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse decoration-delay-1000" />
      </div>

      <div className="relative z-10 w-full max-w-[480px]">
        {/* Navigation Action */}
        <Link href="/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest mb-8 group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Kembali ke Login
        </Link>

        <div className="mb-10 text-center md:text-left">
          <div className="flex justify-center md:justify-start mb-6">
            <img src="/logo.svg" alt="Logo" className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(0,112,192,0.2)]" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-2">Registrasi<span className="text-emerald-500">.</span></h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] font-mono">Pendaftaran Entitas Bisnis Baru</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nama Lengkap Admin</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-emerald-500 transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#05080F]/50 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                    placeholder="Contoh: John Doe"
                  />
                </div>
              </div>

              {/* Company Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nama Perusahaan / Entitas</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-emerald-500 transition-colors">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-[#05080F]/50 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                    placeholder="Contoh: PT Transportasi Jaya"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Korespondensi Resmi</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-emerald-500 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#05080F]/50 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                    placeholder="admin@perusahaan.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kata Sandi Akses</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-emerald-500 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#05080F]/50 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-sm font-black focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700 tracking-[0.35em]"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-18 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-[2.2rem] text-xs font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-4 transition-all shadow-[0_15px_40px_rgba(16,185,129,0.15)] active:scale-[0.98] mt-4"
            >
              {loading ? (
                <><RefreshCw className="w-5 h-5 animate-spin" /> Sedang Memproses...</>
              ) : (
                <><ArrowRight className="w-5 h-5" /> Selesaikan Pendaftaran</>
              )}
            </button>
          </form>

          <div className="pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              Sudah memiliki akses? <Link href="/login" className="text-emerald-500 hover:text-emerald-400 font-black">Masuk Portal</Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-12 opacity-30">
           <p className="text-[9px] font-black uppercase tracking-[0.4em] italic text-slate-500">Powered by sentralogis.com</p>
        </div>
      </div>
    </div>
  );
}
