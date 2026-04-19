'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Truck, Ship, LayoutGrid, ArrowRight, Lock, Mail, ChevronRight, BarChart3, Globe2, RefreshCw } from 'lucide-react';
import { createClient } from "@/lib/supabase/client";
import toast, { Toaster } from "react-hot-toast";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LandingLoginPage() {
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [isLoggingIn, setIsLoggingIn] = useState(false);
   const [isInitialChecking, setIsInitialChecking] = useState(true);
   const [showSplash, setShowSplash] = useState(false);
   const [tenantName, setTenantName] = useState('Enterprise Partner');

   const router = useRouter();
   const supabase = createClient();

   const performRedirect = (role: string, sbuAccess: any) => {
      const normalizedRole = (role || '').trim().toLowerCase();
      let normalizedSbuAccess: string[] = [];
      if (Array.isArray(sbuAccess)) {
         normalizedSbuAccess = sbuAccess.map(s => String(s).trim().toLowerCase());
      }

      // Give enough time for splash animation
      setTimeout(() => {
         let targetPath = "/admin"; // Default fallback
         
         const isFinance = normalizedRole.startsWith('finance');
         const isTruckingAdmin = normalizedRole === 'cs_trucking' || normalizedRole === 'sbu_trucking';
         const isCustomsAdmin = normalizedRole === 'cs_customs';
         const isForwardingAdmin = normalizedRole === 'cs_forwarding';
         const isCoreAdmin = ['superadmin', 'admin', 'cs', 'director'].includes(normalizedRole);

         // 1. Finance always go to finance
         if (isFinance) {
            targetPath = "/finance";
         } 
         // 2. Explicit SBU Roles (Highest Priority for Ops)
         else if (isTruckingAdmin || (normalizedSbuAccess.includes('trucking') && normalizedSbuAccess.length === 1)) {
            targetPath = "/sbu/trucking";
         }
         else if (isCustomsAdmin || (normalizedSbuAccess.includes('clearances') && normalizedSbuAccess.length === 1)) {
            targetPath = "/sbu/clearances";
         }
         else if (isForwardingAdmin || (normalizedSbuAccess.includes('forwarding') && normalizedSbuAccess.length === 1)) {
            targetPath = "/sbu/forwarding"; 
         }
         // 3. Multi-SBU Access
         else if (normalizedSbuAccess.length > 1) {
            targetPath = "/sbu-launchpad";
         }
         // 4. Core Team
         else if (isCoreAdmin) {
            targetPath = "/admin";
         }
         // 5. Catch-all for other users (usually to a simple dashboard or admin)
         else {
            targetPath = "/admin";
         }

         router.push(targetPath);
         if (targetPath !== '/') {
            toast.loading(`Navigating to ${targetPath.toUpperCase()}`, { duration: 2000 });
         }
      }, 2000);
   };

   useEffect(() => {
      const checkSession = async () => {
         try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
               const { data: profile } = await supabase
                  .from('profiles')
                  .select('role, sbu_access, organizations(name)')
                  .eq('id', session.user.id)
                  .single();
               
               if (profile) {
                  setTenantName((profile as any).organizations?.name || 'Enterprise Partner');
                  setShowSplash(true);
                  performRedirect(profile.role, profile.sbu_access || []);
               }
            }
         } catch (err) {
            console.error("Session check error:", err);
         } finally {
            setIsInitialChecking(false);
         }
      };
      checkSession();
   }, []);

   const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoggingIn(true);
      
      try {
         const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
         });

         if (error) throw error;

         // Immediately show splash
         setShowSplash(true);
         
         const { data: profile } = await supabase
            .from('profiles')
            .select('role, sbu_access, organizations(name)')
            .eq('id', data.user.id)
            .single();

         toast.success("Identity Verified. Welcome.");
         
         if (profile) {
            setTenantName((profile as any).organizations?.name || 'Enterprise Partner');
            performRedirect(profile.role, profile.sbu_access || []);
         } else {
            performRedirect('admin', []);
         }
      } catch (error: any) {
         toast.error(error.message || "Login failed");
         setIsLoggingIn(false);
      }
   };

   if (isInitialChecking) {
      return (
         <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 border border-white/5 shadow-2xl">
               <img src="/sentralogis_logo.svg" alt="Sentralogis" className="w-10 h-10 object-contain" />
            </div>
            <div className="flex items-center gap-2">
               <RefreshCw className="w-3 h-3 text-emerald-500 animate-spin" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic outline-none">
                  Syncing Secure Node...
               </span>
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500/30 overflow-x-hidden font-sans">
         <Toaster position="top-right" />

         {/* SPLASH SCREEN ANIMATION */}
         {showSplash && (
            <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden">
               <style dangerouslySetInnerHTML={{ __html: `
                  @keyframes glow-pulse {
                    0% { filter: drop-shadow(0 0 5px rgba(16, 185, 129, 0.4)); transform: scale(1); }
                    50% { filter: drop-shadow(0 0 30px rgba(16, 185, 129, 0.8)); transform: scale(1.05); }
                    100% { filter: drop-shadow(0 0 5px rgba(16, 185, 129, 0.4)); transform: scale(1); }
                  }
                  .animate-glow {
                    animation: glow-pulse 2s infinite ease-in-out;
                  }
               `}} />
               {/* Background Decorative Blur */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-emerald-500/10 blur-[150px] rounded-full animate-pulse" />
               
               <div className="relative z-10 flex flex-col items-center space-y-8 animate-in fade-in zoom-in duration-700">
                  {/* Animated Logo */}
                  <div className="relative">
                     <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-ping duration-1000" />
                     <div className="w-32 h-32 flex items-center justify-center relative">
                        <img 
                          src="/sentralogis_logo.svg" 
                          alt="Sentralogis Logo" 
                          className="w-full h-full object-contain animate-glow"
                        />
                     </div>
                  </div>

                  <div className="text-center space-y-4">
                     <h2 className="text-4xl lg:text-5xl font-black italic tracking-tighter uppercase">
                        Welcome Back<span className="text-emerald-500">.</span>
                     </h2>
                     <div className="inline-flex flex-col items-center">
                        <p className="text-emerald-400 text-xl lg:text-3xl font-black uppercase tracking-tight italic text-shadow-glow">
                           {tenantName}
                        </p>
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent mt-2 rounded-full transform scale-x-0 animate-in slide-in-from-left duration-1000 fill-mode-forwards" />
                     </div>
                  </div>

                  <div className="flex flex-col items-center gap-3 pt-8">
                     <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">
                           Connecting to Operational Cockpit
                        </span>
                     </div>
                     <div className="w-48 h-[2px] bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 animate-progress origin-left" />
                     </div>
                  </div>
               </div>
            </div>
         )}
         {/* DYNAMIC BACKGROUND GRAVITY */}
         <div className="fixed inset-0 z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse decoration-delay-1000" />
            <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-purple-500/5 blur-[100px] rounded-full" />
         </div>

         <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
            
            {/* LEFT SIDE: BRANDING & VISION */}
            <div className="hidden lg:flex lg:w-[60%] p-16 flex-col justify-between relative overflow-hidden">
               <div className="space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                        <ShieldCheck className="w-8 h-8 text-white" />
                     </div>
                     <span className="text-3xl font-black italic tracking-tighter uppercase">Sentralogis<span className="text-emerald-500">.</span></span>
                  </div>
                  
                  <div className="pt-20 space-y-4">
                     <h1 className="text-5xl font-black italic tracking-tighter leading-tight uppercase">
                        The Future of <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">Consolidated</span> <br />
                        Logistics.
                     </h1>
                     <p className="max-w-xl text-slate-400 text-lg font-medium leading-relaxed">
                        Sentralogis OS is an enterprise-grade ecosystem designed to orchestrate SBU Trucking, Clearances, and Finance into a single, seamless digital pipeline.
                     </p>
                  </div>

                  <div className="grid grid-cols-3 gap-8 pt-16">
                     <div className="space-y-3 p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-default group">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                           <LayoutGrid className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-sm uppercase tracking-widest">Unified Ops</h4>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">SBU-focused dashboards with real-time tactical synchronization.</p>
                     </div>
                     <div className="space-y-3 p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-default group">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                           <Globe2 className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-sm uppercase tracking-widest">Global Reach</h4>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">International standards for Clearances, Forwarding & Trucking.</p>
                     </div>
                     <div className="space-y-3 p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-default group">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                           <BarChart3 className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-sm uppercase tracking-widest">Fin-Tech</h4>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">Automated ledgering, invoicing, and profit analysis per WO.</p>
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-12 text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">
                  <div className="flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                     Enterprise Grade
                  </div>
                  <div>Security Certified</div>
                  <div>Jakarta, ID</div>
               </div>
            </div>

            {/* RIGHT SIDE: LOGIN FORM */}
            <div className="flex-1 flex items-center justify-center p-6 relative">
               <div className="w-full max-w-md space-y-10 relative">
                  
                  {/* MOBILE BRANDING */}
                  <div className="lg:hidden flex flex-col items-center gap-4 mb-10">
                     <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl">
                        <ShieldCheck className="w-10 h-10 text-white" />
                     </div>
                     <h2 className="text-3xl font-black italic tracking-tighter uppercase">Sentralogis<span className="text-emerald-500 font-black">.</span></h2>
                  </div>

                  <div className="bg-slate-900/50 backdrop-blur-2xl p-10 lg:p-12 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
                     <div className="space-y-2 text-center lg:text-left">
                        <h2 className="text-3xl font-black italic tracking-tighter uppercase italic">Access Portal</h2>
                        <p className="text-slate-500 text-xs font-bold font-mono tracking-tight underline decoration-emerald-500/30">OPERATIONAL CONTROL GATEWAY SYSTEM v4.0</p>
                     </div>

                     <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Official Email Address</label>
                              <div className="relative group">
                                 <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-600 group-focus-within:text-emerald-500 transition-colors">
                                    <Mail className="w-4 h-4" />
                                 </div>
                                 <input 
                                    type="email" 
                                    required
                                    placeholder="name@sentralogis.com" 
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-700"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                 />
                              </div>
                           </div>

                           <div className="space-y-2">
                              <div className="flex justify-between items-center ml-1">
                                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Access Password</label>
                                 <Link href="#" className="text-[9px] font-black text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors">Forgot Access?</Link>
                              </div>
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
                        </div>

                        <button 
                           type="submit"
                           disabled={isLoggingIn}
                           className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white py-6 rounded-2xl text-xs font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98]"
                        >
                           {isLoggingIn ? (
                              <div className="flex items-center gap-3 animate-pulse">
                                 Authenticating System...
                              </div>
                           ) : (
                              <>
                                 Enter Operational Cockpit <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                              </>
                           )}
                        </button>
                     </form>

                     <div className="pt-6 border-t border-white/5 text-center space-y-3">
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">New Transporter? <button className="text-emerald-500 hover:underline">Apply for Partnership</button></p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          Need Access? <Link href="/signup" className="text-emerald-500 hover:underline">Request Authorized Account</Link>
                        </p>
                     </div>
                  </div>

                  <div className="text-center">
                     <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.5em] italic">
                        @2026 powered by mbsolutions
                     </p>
                  </div>
               </div>
            </div>

         </div>
      </div>
   );
}