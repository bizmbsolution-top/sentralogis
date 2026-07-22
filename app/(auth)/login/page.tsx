'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowRight, LogIn, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import LanguageSelector from '@/components/LanguageSelector';



export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cardGlowRef = useRef<HTMLDivElement>(null);
  const outerGlowRef = useRef<HTMLDivElement>(null);
  const { login, user, logout: signOut, loading: authLoading } = useAuth();

  // Interactive Mouse Particles Canvas Loop
  useEffect(() => {
    const canvas = document.getElementById("cosmic-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Array<{
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
    const isMobile = canvas.width < 768;
    const particleCount = isMobile
      ? Math.min(60, Math.floor((canvas.width * canvas.height) / 12000))
      : Math.min(200, Math.floor((canvas.width * canvas.height) / 5000));
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

    const mouse = { x: -1000, y: -1000 };

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

    // Pre-render glow texture for fast drawing
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 32;
    glowCanvas.height = 32;
    const gCtx = glowCanvas.getContext("2d");
    if (gCtx) {
      const grad = gCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, "rgba(255,255,255,0.15)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      gCtx.fillStyle = grad;
      gCtx.fillRect(0, 0, 32, 32);
    }

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

      // Draw connection lines between nearby particles (skip on mobile for performance)
      if (!isMobile) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
              ctx.save();
              ctx.globalAlpha = (1 - dist / 120) * 0.06;
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
          p.vx = (p.vx / speed) * 2.5;
          p.vy = (p.vy / speed) * 2.5;
        } else if (speed < 0.5) {
          p.vx += (Math.random() - 0.5) * 0.5;
          p.vy += (Math.random() - 0.5) * 0.5;
        }

        // Add some random walk jitter for chaotic space feel
        p.vx += (Math.random() - 0.5) * 0.05;
        p.vy += (Math.random() - 0.5) * 0.05;

        // Draw the star (no shadowBlur for performance)
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Add glow only for bright stars using pre-rendered texture
        if (p.size > 1.5) {
          ctx.globalAlpha = p.alpha * 0.5;
          ctx.drawImage(glowCanvas, p.x - 16, p.y - 16, 32, 32);
        }
      });

      ctx.globalAlpha = 1;
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

  useEffect(() => {
    if (!mounted) return;
    let angle = 0;
    const animate = () => {
      angle = (angle + 1) % 360;
      if (cardGlowRef.current) {
        cardGlowRef.current.style.transform = `rotate(${angle}deg)`;
      }
      requestAnimationFrame(animate);
    };
    const rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [mounted]);

  const floatingParticles = useMemo(() => {
    if (!mounted) return [];
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      width: 2 + ((i * 7 + 3) % 5),
      height: 2 + ((i * 11 + 5) % 5),
      left: `${10 + ((i * 37 + 13) % 80)}%`,
      top: `${10 + ((i * 23 + 7) % 80)}%`,
      duration: 4 + ((i * 3 + 1) % 7),
      delay: ((i * 2 + 1) % 4),
    }));
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);

    try {
      const { error } = await login(email, password);
      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          toast.error('Email atau password salah');
        } else if (error.message?.includes('Email not confirmed')) {
          toast.error('Email belum dikonfirmasi. Cek inbox Anda.');
        } else if (error.message?.includes('Too many requests')) {
          toast.error('Terlalu banyak percobaan. Tunggu sebentar.');
        } else {
          const safeMsg = typeof error.message === 'string'
            ? error.message.replace(/["'`]/g, '\\$&')
            : 'Login gagal';
          toast.error(safeMsg);
        }
      } else {
        // Successful login – let AuthProvider handle navigation via auth state change
        // No manual router navigation needed here
      }
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050816] flex items-center justify-center">
      
      {/* Exit Button */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 pt-safe-area-top">
        <a href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-95">
          <ArrowRight className="w-4 h-4 rotate-180 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider">Kembali ke Portal Hub</span>
        </a>
      </div>

      {/* Language Selector */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 pt-safe-area-top">
        <LanguageSelector />
      </div>

      {/* 1. FIXED FULL-COLOR GALAXY BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Deep space base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0118] via-[#050d1a] to-[#030712]" />
        
        {/* Reduced nebula clouds for performance */}
        <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] rounded-full bg-purple-700/15 blur-[100px]" />
        <div className="absolute top-[15%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[15%] w-[50%] h-[40%] rounded-full bg-pink-600/10 blur-[100px]" />
      </div>
      
      {/* Interactive star canvas on top of galaxy */}
      <canvas id="cosmic-canvas" className="absolute inset-0 pointer-events-none z-[1]" />

      {/* Login Form */}
      <div className="w-full flex items-center justify-center p-5 sm:p-8 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          <div className="relative">
            <div
              ref={cardGlowRef}
              className="absolute -inset-[2px] rounded-[2rem] opacity-70"
              style={{
                background: `conic-gradient(from 0deg, #3b82f6, #8b5cf6, #ec4899, #06b6d4, #3b82f6)`,
                filter: 'blur(4px)',
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'exclude',
                WebkitMaskComposite: 'xor',
                padding: '2px',
              }}
            />

            <div
              ref={outerGlowRef}
              className="absolute -inset-4 rounded-[2.5rem] opacity-30 blur-2xl"
              style={{
                background: `conic-gradient(from 0deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3), rgba(236,72,153,0.3), rgba(6,182,212,0.3), rgba(59,130,246,0.3))`,
                animation: 'glowPulse 3s ease-in-out infinite',
              }}
            />

            <div className="relative backdrop-blur-2xl bg-white/[0.05] border border-white/[0.1] rounded-[2rem] p-6 sm:p-10 shadow-2xl overflow-hidden">
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)`,
                }}
              />

              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {floatingParticles.map((p) => (
                  <div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                      width: p.width,
                      height: p.height,
                      left: p.left,
                      top: p.top,
                      background: `radial-gradient(circle, rgba(96,165,250,0.6) 0%, transparent 70%)`,
                      animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite`,
                    }}
                  />
                ))}
              </div>

              {/* Form Header */}
              <div className="text-center mb-8 relative z-10 space-y-2">
                <div className="mb-4 flex justify-center">
                  <img src="/logo2sentralogis.png" alt="Sentralogis" className="h-16 w-auto drop-shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Welcome to Management Portal</h1>
                <p className="text-xs font-semibold text-slate-400">Sign in with your corporate credentials to access Executive Backoffice & Command Center</p>
              </div>

              {user && !authLoading && (
                <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider mb-1">Active Session</p>
                  <p className="text-sm text-white font-medium">{user.email}</p>
                  <div className="flex gap-3 mt-3">
                    <button
                      type="button"
                      onClick={signOut}
                      className="text-xs text-white/50 hover:text-white transition-colors underline underline-offset-2"
                    >
                      Sign out & switch account
                    </button>
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-5 relative z-10" autoComplete="off">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">
                    Email
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400 transition-colors">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      autoComplete="email"
                      className="w-full pl-12 pr-4 py-4 sm:py-4 bg-white/[0.06] border border-white/[0.1] rounded-xl outline-none text-white placeholder-white/25 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all text-base"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      autoComplete="current-password"
                      className="w-full pl-12 pr-14 py-4 sm:py-4 bg-white/[0.06] border border-white/[0.1] rounded-xl outline-none text-white placeholder-white/25 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all text-base"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-3 group relative overflow-hidden text-base"
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)`,
                      animation: 'buttonShimmer 2s ease-in-out infinite',
                    }}
                  />
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                      <span className="relative z-10">Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span className="relative z-10">Sign In</span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform relative z-10" />
                    </>
                  )}
                </button>
              </form>

              
            </div>
          </div>

          <p className="text-center mt-8 text-xs text-white/20 font-medium">
            © 2026 Sentralogis. All rights reserved.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.6; }
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.02); }
        }

        @keyframes floatParticle {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          25% { transform: translateY(-10px) translateX(5px); opacity: 0.6; }
          50% { transform: translateY(-5px) translateX(-5px); opacity: 0.4; }
          75% { transform: translateY(-15px) translateX(3px); opacity: 0.5; }
        }

        @keyframes buttonShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes shootingStar {
          0% { opacity: 0; transform: translateX(0) rotate(15deg); }
          3% { opacity: 0.6; }
          10% { opacity: 0; transform: translateX(250px) rotate(15deg); }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
