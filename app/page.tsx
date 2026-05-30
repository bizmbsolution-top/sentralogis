"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Cpu, 
  Users, 
  ShieldAlert, 
  Mail, 
  Lock, 
  ChevronRight, 
  ArrowRight, 
  Copy, 
  Check, 
  ExternalLink,
  Zap,
  Award,
  ShieldCheck,
  RefreshCw,
  Eye,
  MessageSquare,
  Smartphone,
  Radio,
  Bot,
  Radar,
  Timer,
  TowerControl,
  Send,
  Bell,
  BarChart3,
  Truck,
  Package
} from 'lucide-react';
import toast, { Toaster } from "react-hot-toast";

export default function SentralogisCosmicLanding() {
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText("info@sentralogis.com");
    setCopied(true);
    toast.success("Alamat email disalin ke papan klip!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Interactive Mouse Particles Canvas Loop
  useEffect(() => {
    const canvas = document.getElementById("cosmic-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      baseAlpha: number;
    }> = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Spawn many stars for a rich galaxy feel (hilir mudik)
    const particleCount = Math.min(500, Math.floor((canvas.width * canvas.height) / 2500));
    const colors = ["#00E5FF", "#FF7043", "#00E676", "#818CF8", "#F8FAFC", "#E879F9", "#FBBF24", "#FB7185", "#34D399", "#60A5FA"];

    for (let i = 0; i < particleCount; i++) {
      const isBright = Math.random() < 0.15;
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        // Faster initial velocity for active movement
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        size: isBright ? Math.random() * 2.5 + 1.2 : Math.random() * 1.4 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: isBright ? Math.random() * 0.8 + 0.2 : Math.random() * 0.5 + 0.1,
        baseAlpha: isBright ? Math.random() * 0.8 + 0.2 : Math.random() * 0.5 + 0.1,
      });
    }

    let mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render vivid cosmic spotlight glow around the cursor
      if (mouse.x > -500) {
        const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 400);
        grad.addColorStop(0, "rgba(139, 92, 246, 0.18)");
        grad.addColorStop(0.25, "rgba(6, 182, 212, 0.10)");
        grad.addColorStop(0.5, "rgba(236, 72, 153, 0.06)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Draw connection lines between nearby particles for constellation effect
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.save();
            ctx.globalAlpha = (1 - dist / 100) * 0.08;
            ctx.strokeStyle = "#818CF8";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // Render drifting and magnetic particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce actively on boundaries to keep them "hilir mudik"
        if (p.x < 0 || p.x > canvas.width) {
          p.vx *= -1;
          p.x = Math.max(0, Math.min(canvas.width, p.x));
        }
        if (p.y < 0 || p.y > canvas.height) {
          p.vy *= -1;
          p.y = Math.max(0, Math.min(canvas.height, p.y));
        }

        // Strong magnetic attraction to cursor
        if (mouse.x > -500) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 350) {
            const force = (350 - dist) / 350;
            p.vx += (dx / dist) * force * 0.08;
            p.vy += (dy / dist) * force * 0.08;
            p.alpha = Math.min(1, p.baseAlpha + force * 0.7);
          } else {
            p.alpha += (p.baseAlpha - p.alpha) * 0.02;
          }
        } else {
          p.alpha += (p.baseAlpha - p.alpha) * 0.02;
        }

        // Maintain constant active speed
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 2.5) {
          // Clamp max speed
          p.vx = (p.vx / speed) * 2.5;
          p.vy = (p.vy / speed) * 2.5;
        } else if (speed < 0.5) {
          // Give them a kick if they slow down too much
          p.vx += (Math.random() - 0.5) * 0.5;
          p.vy += (Math.random() - 0.5) * 0.5;
        }

        // Add some random walk jitter for chaotic space feel
        p.vx += (Math.random() - 0.5) * 0.05;
        p.vy += (Math.random() - 0.5) * 0.05;

        // Draw the star with glow
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = p.size > 1.2 ? 15 : 6;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200 relative">
      <Toaster position="top-right" />
      
      {/* 1. FIXED FULL-COLOR GALAXY BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Deep space base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0118] via-[#050d1a] to-[#030712]" />
        
        {/* Massive colorful nebula clouds */}
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full bg-purple-700/20 blur-[180px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[10%] right-[-15%] w-[50%] h-[50%] rounded-full bg-blue-600/15 blur-[160px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[45%] rounded-full bg-pink-600/12 blur-[200px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[10%] right-[5%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[150px] animate-pulse" style={{ animationDuration: '7s' }} />
        <div className="absolute top-[40%] left-[30%] w-[35%] h-[30%] rounded-full bg-amber-500/8 blur-[140px] animate-pulse" style={{ animationDuration: '9s' }} />
        <div className="absolute top-[5%] left-[50%] w-[25%] h-[25%] rounded-full bg-emerald-500/8 blur-[120px] animate-pulse" style={{ animationDuration: '11s' }} />
      </div>
      
      {/* Interactive star canvas on top of galaxy */}
      <canvas id="cosmic-canvas" className="fixed inset-0 pointer-events-none z-[1]" />

      {/* 2. WORLD-CLASS GLASSMORPHIC NAVIGATION BAR */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/30 border-b border-white/[0.06] px-6 py-4 flex justify-between items-center shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/30 via-purple-500/20 to-pink-500/30 blur-lg rounded-full animate-pulse" />
            <img src="/sentralogis_logo.png" alt="Sentralogis" className="h-9 w-auto relative z-10 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
          </div>
          <span className="text-xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300 drop-shadow-[0_0_20px_rgba(139,92,246,0.4)]" style={{ textShadow: '0 0 30px rgba(6,182,212,0.3), 0 0 60px rgba(139,92,246,0.15)' }}>
            Sentralogis
          </span>
          <span className="text-[9px] font-black tracking-widest bg-purple-950/50 text-purple-300 px-2 py-0.5 border border-purple-500/30 rounded-full hidden sm:inline-block shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            GALAXY ORBIT
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-bold tracking-widest uppercase text-slate-400">
          <a href="#" className="hover:text-slate-100 transition-colors">BERANDA</a>
          <a href="#features" className="hover:text-slate-100 transition-colors">FITUR & EKOSISTEM</a>
          <a href="#contact" className="hover:text-slate-100 transition-colors">KONTAK</a>
        </nav>

        <div className="flex items-center gap-4">
          <a 
            href="/login"
            className="relative group overflow-hidden border border-cyan-500/30 bg-cyan-950/20 text-[#00E5FF] hover:text-white px-5 py-2.5 text-xs font-black tracking-widest uppercase rounded-full shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)] transition-all hover:shadow-[0_0_20px_1px_rgba(6,182,212,0.5)] active:scale-95"
          >
            <span className="relative z-10 flex items-center gap-2">
              PORTAL LOGIN <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-indigo-600 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 -z-0" />
          </a>
        </div>
      </header>

      {/* 3. HERO & TELEMETRY SECTION */}
      <section className="relative z-10 pt-40 pb-20 px-6 max-w-5xl mx-auto flex flex-col items-center justify-center text-center min-h-[90vh]">
        
        <div className="space-y-10 w-full flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-[#FF7043]/10 text-[#FF7043] text-xs sm:text-sm font-black tracking-widest uppercase px-5 py-2.5 border border-[#FF7043]/20 rounded-full shadow-[0_0_15px_rgba(255,112,67,0.1)]"
          >
            <Sparkles className="w-4 h-4 animate-spin duration-3000" />
            // PLATFORM RANTAI PASOK KELAS ELITE
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[1.05] uppercase w-full"
          >
            Orkestrasi <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] via-emerald-300 to-[#FF7043] drop-shadow-[0_2px_15px_rgba(6,182,212,0.2)]">
              Universe Logistik
            </span> <br className="hidden sm:block" />
            Perusahaan Anda
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-base sm:text-xl font-medium max-w-3xl mx-auto leading-relaxed"
          >
            Hubungkan aset fisik makro, otomasi keuangan instan, dan portofolio kompetensi nyata SDM ke dalam satu sistem kendali terpusat yang glowing, modern, dan tak tertandingi.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-5 justify-center mt-6 w-full max-w-md mx-auto sm:max-w-none"
          >
            <a href="mailto:info@sentralogis.com" className="inline-block w-full sm:w-auto">
              <button className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-[#00E5FF] to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 hover:text-black font-black text-sm uppercase tracking-widest rounded-full shadow-[0_0_30px_-5px_rgba(6,182,212,0.6)] hover:shadow-[0_0_30px_2px_rgba(6,182,212,0.8)] active:scale-95 transition-all">
                KONSULTASI GRATIS &rarr;
              </button>
            </a>
            
            <a href="#features" className="inline-block w-full sm:w-auto">
              <button className="w-full sm:w-auto px-10 py-5 bg-slate-900/50 hover:bg-slate-800/80 text-[#00E5FF] hover:text-white font-black text-sm uppercase tracking-widest rounded-full border border-cyan-500/20 shadow-sm active:scale-95 transition-all">
                PELAJARI FITUR &darr;
              </button>
            </a>
          </motion.div>
        </div>

      </section>

      {/* 4. FITUR UNGGULAN — MODERN BENTO GRID SHOWCASE */}
      <section id="features" className="py-32 px-6 max-w-7xl mx-auto space-y-20 relative z-10">
        
        {/* Section Header */}
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-purple-950/50 text-purple-300 text-xs font-black tracking-widest uppercase px-4 py-2 border border-purple-500/20 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.1)]">
            <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
            // SENTRALOGIS CAPABILITIES MATRIX
          </div>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-none">
            Fitur Unggulan{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300">
              Sentralogis
            </span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed max-w-2xl mx-auto">
            Ekosistem terintegrasi yang menghubungkan kecerdasan operasional, komunikasi real-time, dan otomasi penuh untuk mengoptimalkan seluruh rantai pasok Anda.
          </p>
        </div>

        {/* BENTO GRID — 6 Feature Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* ═══ FEATURE 1: SLA Performance ═══ */}
          <motion.div 
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="group relative rounded-3xl border border-white/[0.06] bg-gradient-to-br from-slate-950/80 to-slate-900/40 backdrop-blur-xl p-7 flex flex-col gap-5 overflow-hidden hover:border-amber-500/30 transition-all duration-500 shadow-lg hover:shadow-[0_0_40px_-10px_rgba(251,191,36,0.15)]"
          >
            {/* Glow orb */}
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.15)] group-hover:shadow-[0_0_30px_rgba(251,191,36,0.25)] transition-shadow">
                <Timer className="w-7 h-7" />
              </div>
              <span className="text-[9px] font-mono font-black text-amber-400/60 tracking-widest uppercase bg-amber-950/30 px-2.5 py-1 rounded-full border border-amber-500/10">CORE</span>
            </div>

            <div className="space-y-2.5 relative z-10">
              <h3 className="text-xl font-black uppercase text-white tracking-tight group-hover:text-amber-100 transition-colors">
                SLA Performance
              </h3>
              <p className="text-slate-400 text-[13px] font-medium leading-relaxed">
                Tingkatkan kinerja SDM secara terukur melalui <span className="text-amber-400 font-bold">Service Level Agreement</span> yang terotomasi. Setiap aktivitas driver, tally, dan admin tercatat sebagai skor performa yang mendorong kompetisi sehat antar tim lapangan.
              </p>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 space-y-2.5">
              {["Skor performa terukur per individu", "Target SLA configurable per operasi", "Reward & recognition sistem otomatis"].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-950/50 border border-amber-500/25 flex items-center justify-center text-amber-400 text-[10px]">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* ═══ FEATURE 2: Chat Panel Internal ═══ */}
          <motion.div 
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="group relative rounded-3xl border border-white/[0.06] bg-gradient-to-br from-slate-950/80 to-slate-900/40 backdrop-blur-xl p-7 flex flex-col gap-5 overflow-hidden hover:border-cyan-500/30 transition-all duration-500 shadow-lg hover:shadow-[0_0_40px_-10px_rgba(6,182,212,0.15)]"
          >
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-cyan-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_30px_rgba(6,182,212,0.25)] transition-shadow">
                <MessageSquare className="w-7 h-7" />
              </div>
              <span className="text-[9px] font-mono font-black text-cyan-400/60 tracking-widest uppercase bg-cyan-950/30 px-2.5 py-1 rounded-full border border-cyan-500/10">COMM</span>
            </div>

            <div className="space-y-2.5 relative z-10">
              <h3 className="text-xl font-black uppercase text-white tracking-tight group-hover:text-cyan-100 transition-colors">
                Chat Panel Internal
              </h3>
              <p className="text-slate-400 text-[13px] font-medium leading-relaxed">
                Panel komunikasi internal yang <span className="text-cyan-400 font-bold">fokus ke setiap order</span>. Tim operasional, driver, dan warehouse dapat berdiskusi langsung di konteks order tanpa berpindah aplikasi. Setiap percakapan terikat pada nomor order untuk traceability penuh.
              </p>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 space-y-2.5">
              {["Thread diskusi per order number", "Lampiran foto & dokumen langsung", "Notifikasi real-time ke semua pihak"].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-950/50 border border-cyan-500/25 flex items-center justify-center text-cyan-400 text-[10px]">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* ═══ FEATURE 3: WhatsApp Integration ═══ */}
          <motion.div 
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="group relative rounded-3xl border border-white/[0.06] bg-gradient-to-br from-slate-950/80 to-slate-900/40 backdrop-blur-xl p-7 flex flex-col gap-5 overflow-hidden hover:border-emerald-500/30 transition-all duration-500 shadow-lg hover:shadow-[0_0_40px_-10px_rgba(52,211,153,0.15)]"
          >
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-emerald-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-600/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.15)] group-hover:shadow-[0_0_30px_rgba(52,211,153,0.25)] transition-shadow">
                <Smartphone className="w-7 h-7" />
              </div>
              <span className="text-[9px] font-mono font-black text-emerald-400/60 tracking-widest uppercase bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-500/10">DRIVER</span>
            </div>

            <div className="space-y-2.5 relative z-10">
              <h3 className="text-xl font-black uppercase text-white tracking-tight group-hover:text-emerald-100 transition-colors">
                WhatsApp untuk Driver
              </h3>
              <p className="text-slate-400 text-[13px] font-medium leading-relaxed">
                Driver cukup menggunakan <span className="text-emerald-400 font-bold">WhatsApp</span> untuk mengirim POD (Proof of Delivery), foto bukti muat/bongkar, dan update status. Informasi langsung tersinkron ke dashboard dan diteruskan ke pelanggan secara otomatis.
              </p>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 space-y-2.5">
              {["Kirim POD via WhatsApp instan", "Auto-sync ke dashboard operasional", "Notifikasi otomatis ke pelanggan"].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-950/50 border border-emerald-500/25 flex items-center justify-center text-emerald-400 text-[10px]">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* ═══ FEATURE 4: Realtime Updating ═══ */}
          <motion.div 
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="group relative rounded-3xl border border-white/[0.06] bg-gradient-to-br from-slate-950/80 to-slate-900/40 backdrop-blur-xl p-7 flex flex-col gap-5 overflow-hidden hover:border-violet-500/30 transition-all duration-500 shadow-lg hover:shadow-[0_0_40px_-10px_rgba(139,92,246,0.15)]"
          >
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/10 text-violet-400 flex items-center justify-center border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.15)] group-hover:shadow-[0_0_30px_rgba(139,92,246,0.25)] transition-shadow">
                <Radio className="w-7 h-7" />
              </div>
              <span className="text-[9px] font-mono font-black text-violet-400/60 tracking-widest uppercase bg-violet-950/30 px-2.5 py-1 rounded-full border border-violet-500/10">LIVE</span>
            </div>

            <div className="space-y-2.5 relative z-10">
              <h3 className="text-xl font-black uppercase text-white tracking-tight group-hover:text-violet-100 transition-colors">
                Realtime Updating
              </h3>
              <p className="text-slate-400 text-[13px] font-medium leading-relaxed">
                Semua perubahan status order, posisi armada, dan informasi muatan <span className="text-violet-400 font-bold">ter-update secara real-time</span> tanpa perlu refresh. Pelanggan Anda mendapat visibilitas penuh dari muat hingga bongkar, setiap saat, dari mana saja.
              </p>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 space-y-2.5">
              {["Live tracking posisi armada", "Push notification status berubah", "Customer portal self-service"].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-950/50 border border-violet-500/25 flex items-center justify-center text-violet-400 text-[10px]">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* ═══ FEATURE 5: Otomatis Penugasan ═══ */}
          <motion.div 
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="group relative rounded-3xl border border-white/[0.06] bg-gradient-to-br from-slate-950/80 to-slate-900/40 backdrop-blur-xl p-7 flex flex-col gap-5 overflow-hidden hover:border-rose-500/30 transition-all duration-500 shadow-lg hover:shadow-[0_0_40px_-10px_rgba(244,63,94,0.15)]"
          >
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-rose-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-600/10 text-rose-400 flex items-center justify-center border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.15)] group-hover:shadow-[0_0_30px_rgba(244,63,94,0.25)] transition-shadow">
                <Bot className="w-7 h-7" />
              </div>
              <span className="text-[9px] font-mono font-black text-rose-400/60 tracking-widest uppercase bg-rose-950/30 px-2.5 py-1 rounded-full border border-rose-500/10">AUTO</span>
            </div>

            <div className="space-y-2.5 relative z-10">
              <h3 className="text-xl font-black uppercase text-white tracking-tight group-hover:text-rose-100 transition-colors">
                Otomatis Penugasan
              </h3>
              <p className="text-slate-400 text-[13px] font-medium leading-relaxed">
                Sistem <span className="text-rose-400 font-bold">smart dispatch</span> yang secara otomatis menugaskan order ke driver terbaik berdasarkan lokasi, reputasi, ketersediaan armada, dan kapasitas muatan. Mengurangi waktu idle dan meningkatkan utilisasi fleet secara drastis.
              </p>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 space-y-2.5">
              {["Auto-match driver & order optimal", "Pertimbangan reputasi & proximity", "Reduce idle time armada drastis"].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-950/50 border border-rose-500/25 flex items-center justify-center text-rose-400 text-[10px]">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* ═══ FEATURE 6: Intelligence Towers ═══ */}
          <motion.div 
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="group relative rounded-3xl border border-white/[0.06] bg-gradient-to-br from-slate-950/80 to-slate-900/40 backdrop-blur-xl p-7 flex flex-col gap-5 overflow-hidden hover:border-sky-500/30 transition-all duration-500 shadow-lg hover:shadow-[0_0_40px_-10px_rgba(14,165,233,0.15)]"
          >
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-sky-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-600/10 text-sky-400 flex items-center justify-center border border-sky-500/20 shadow-[0_0_20px_rgba(14,165,233,0.15)] group-hover:shadow-[0_0_30px_rgba(14,165,233,0.25)] transition-shadow">
                <TowerControl className="w-7 h-7" />
              </div>
              <span className="text-[9px] font-mono font-black text-sky-400/60 tracking-widest uppercase bg-sky-950/30 px-2.5 py-1 rounded-full border border-sky-500/10">INTEL</span>
            </div>

            <div className="space-y-2.5 relative z-10">
              <h3 className="text-xl font-black uppercase text-white tracking-tight group-hover:text-sky-100 transition-colors">
                Intelligence Towers
              </h3>
              <p className="text-slate-400 text-[13px] font-medium leading-relaxed">
                <span className="text-sky-400 font-bold">Pusat komando visual</span> untuk memonitor seluruh operasi logistik dari satu layar. Visualisasi peta armada, bottleneck warehouse, dan analitik performa SDM dalam satu dashboard menara pengawas yang intuitif dan actionable.
              </p>
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 space-y-2.5">
              {["Bird-eye view seluruh operasi", "Heatmap bottleneck & anomali", "KPI dashboard SDM & armada"].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs font-bold text-slate-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-950/50 border border-sky-500/25 flex items-center justify-center text-sky-400 text-[10px]">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

        </div>

        {/* ═══ HORIZONTAL ORBIT SEPARATOR ═══ */}
        <div className="relative flex items-center justify-center py-6">
          <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
          <div className="relative bg-slate-950 px-6">
            <div className="flex items-center gap-3 text-[10px] font-mono font-black tracking-widest text-slate-500 uppercase">
              <span className="w-2 h-2 rounded-full bg-purple-500/50 animate-pulse" />
              ECOSYSTEM OVERVIEW
              <span className="w-2 h-2 rounded-full bg-cyan-500/50 animate-pulse" />
            </div>
          </div>
        </div>

        {/* ═══ ECOSYSTEM FLOW VISUALIZER ═══ */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5 blur-xl" />
          
          <div className="relative rounded-3xl border border-white/[0.06] bg-slate-950/60 backdrop-blur-xl p-8 sm:p-12 overflow-hidden">
            {/* Background grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
              
              {/* Step 1 */}
              <div className="text-center space-y-3 group flex-1">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500/15 to-indigo-600/5 border border-indigo-500/20 flex items-center justify-center group-hover:border-indigo-400/40 transition-colors shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                  <Send className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase text-indigo-400 tracking-wide">Data Masuk</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">Order dibuat</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center text-slate-600">
                <ChevronRight className="w-4 h-4 animate-pulse" />
              </div>

              {/* Step 2 */}
              <div className="text-center space-y-3 group flex-1">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500/15 to-cyan-600/5 border border-cyan-500/20 flex items-center justify-center group-hover:border-cyan-400/40 transition-colors shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                  <Bot className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase text-cyan-400 tracking-wide">AI Dispatch</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">Pembagian tugas otomatis</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center text-slate-600">
                <ChevronRight className="w-4 h-4 animate-pulse" />
              </div>

              {/* Step 3 */}
              <div className="text-center space-y-3 group flex-1">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center group-hover:border-emerald-400/40 transition-colors shadow-[0_0_20px_rgba(52,211,153,0.1)]">
                  <Smartphone className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase text-emerald-400 tracking-wide">Eksekusi Lapangan</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">via WhatsApp</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center text-slate-600">
                <ChevronRight className="w-4 h-4 animate-pulse" />
              </div>

              {/* Step 4 */}
              <div className="text-center space-y-3 group flex-1">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/20 flex items-center justify-center group-hover:border-amber-400/40 transition-colors shadow-[0_0_20px_rgba(251,191,36,0.1)]">
                  <TowerControl className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase text-amber-400 tracking-wide">Intelligence Towers</h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">Monitor hasil real-time</p>
                </div>
              </div>

            </div>

            {/* Bottom tagline */}
            <div className="relative z-10 text-center mt-10 pt-6 border-t border-white/5">
              <p className="text-[13px] text-slate-400 font-medium leading-relaxed max-w-4xl mx-auto">
                <span className="text-white font-bold tracking-wide">Alur Ekosistem (Ecosystem Flow):</span> Secara praktis, ekosistem ini bergerak dari <span className="text-indigo-400 font-bold">Data Masuk</span> (order dibuat) ➔ <span className="text-cyan-400 font-bold">AI Dispatch</span> (pembagian tugas otomatis) ➔ <span className="text-emerald-400 font-bold">Eksekusi Lapangan via WhatsApp</span> (driver bekerja) ➔ bermuara di <span className="text-amber-400 font-bold">Intelligence Towers</span> (manajemen & klien memonitor hasil secara real-time).
              </p>
            </div>
          </div>
        </div>

      </section>

      {/* 6. GLOWING NEBULA EMAIL CTA SECTION */}
      <section id="contact" className="py-36 px-6 relative z-10 overflow-hidden border-t border-white/5">
        
        {/* Massive back nebula */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none -z-0" />
        
        <div className="max-w-4xl mx-auto text-center space-y-10 relative z-10">
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#FF7043]/10 text-[#FF7043] text-xs font-black tracking-widest uppercase px-4 py-2 border border-[#FF7043]/20 rounded-full">
              <Mail className="w-3.5 h-3.5" />
              // HUBUNGI KAMI UNTUK DUKUNGAN KELAS ELITE
            </div>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white leading-none">
              Siap Memulai Orbit Rantai Pasok Anda?
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base font-medium leading-relaxed">
              Tinggalkan cara logistik konvensional yang inefisien. Jadwalkan demo operasional kustom khusus untuk perusahaan Anda secara langsung via email.
            </p>
          </div>

          {/* Glowing central email glass card */}
          <div className="max-w-md mx-auto rounded-3xl border border-white/10 bg-slate-950/60 p-8 shadow-[0_0_50px_-10px_rgba(99,102,241,0.2)] hover:border-cyan-500/30 transition-all flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/50 text-[#00E5FF] flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Mail className="w-7 h-7" />
            </div>

            <div className="space-y-1 text-center">
              <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest">OFFICIAL PARTNER CONTACT</span>
              <p className="text-xl sm:text-2xl font-black text-[#00E5FF] tracking-tight hover:underline cursor-pointer select-all">
                info@sentralogis.com
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              {/* Direct Mail mailto button */}
              <a 
                href="mailto:info@sentralogis.com?subject=Permintaan%20Demo%20SaaS%20Sentralogis"
                className="flex-1"
              >
                <button className="w-full py-3.5 bg-gradient-to-r from-[#00E5FF] to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 hover:text-black font-black text-xs uppercase tracking-widest rounded-full shadow-lg active:scale-95 transition-all">
                  KIRIM EMAIL &rarr;
                </button>
              </a>

              {/* Copy Email widget */}
              <button 
                onClick={copyEmail}
                className="flex-1 py-3.5 bg-slate-900/80 hover:bg-slate-800/80 text-white font-black text-xs uppercase tracking-widest rounded-full border border-white/5 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#00E676]" /> SALIN BERHASIL
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> SALIN ALAMAT
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer Logo & Copyright info */}
          <div className="flex flex-col items-center justify-center gap-4 pt-16 border-t border-white/5 mt-24 text-slate-500">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 via-purple-500/10 to-pink-500/20 blur-md rounded-full" />
              <img src="/sentralogis_logo.png" alt="Sentralogis" className="h-8 w-auto relative z-10 opacity-70 drop-shadow-[0_0_8px_rgba(6,182,212,0.3)] hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
              © 2026 Sentralogis.com | Powered by MBsolutions. All Rights Reserved.
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}