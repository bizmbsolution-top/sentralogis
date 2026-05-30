'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowRight, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';



export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cardGlowAngle, setCardGlowAngle] = useState(0);
  const { login, user, logout: signOut, loading: authLoading } = useAuth();
  const cardRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!mounted) return;
    let angle = 0;
    const interval = setInterval(() => {
      angle = (angle + 2) % 360;
      setCardGlowAngle(angle);
    }, 50);
    return () => clearInterval(interval);
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
          toast.error(error.message || 'Login gagal');
        }
      }
      // [AI] Navigation handled by AuthProvider onAuthStateChange
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050816] flex items-center justify-center">
      
      {/* Exit Button */}
      <div className="absolute top-6 left-6 z-50">
        <a href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span className="text-xs font-bold uppercase tracking-wider">Kembali ke Website</span>
        </a>
      </div>

      {/* 1. FIXED FULL-COLOR GALAXY BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none">
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
      <canvas id="cosmic-canvas" className="absolute inset-0 pointer-events-none z-[1]" />

      {/* Login Form */}
      <div className="w-full flex items-center justify-center p-6 sm:p-8 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          <div className="relative" ref={cardRef}>
            <div
              className="absolute -inset-[2px] rounded-[2rem] opacity-70"
              style={{
                background: `conic-gradient(from ${cardGlowAngle}deg, #3b82f6, #8b5cf6, #ec4899, #06b6d4, #3b82f6)`,
                filter: 'blur(4px)',
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'exclude',
                WebkitMaskComposite: 'xor',
                padding: '2px',
              }}
            />

            <div
              className="absolute -inset-4 rounded-[2.5rem] opacity-30 blur-2xl"
              style={{
                background: `conic-gradient(from ${cardGlowAngle}deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3), rgba(236,72,153,0.3), rgba(6,182,212,0.3), rgba(59,130,246,0.3))`,
                animation: 'glowPulse 3s ease-in-out infinite',
              }}
            />

            <div className="relative backdrop-blur-2xl bg-white/[0.05] border border-white/[0.1] rounded-[2rem] p-8 sm:p-10 shadow-2xl overflow-hidden">
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  background: `linear-gradient(${cardGlowAngle}deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)`,
                }}
              />

              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {mounted && Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={`particle-${i}`}
                    className="absolute rounded-full"
                    style={{
                      width: 2 + Math.random() * 3,
                      height: 2 + Math.random() * 3,
                      left: `${10 + Math.random() * 80}%`,
                      top: `${10 + Math.random() * 80}%`,
                      background: `radial-gradient(circle, rgba(96,165,250,0.6) 0%, transparent 70%)`,
                      animation: `floatParticle ${4 + Math.random() * 6}s ease-in-out ${Math.random() * 3}s infinite`,
                    }}
                  />
                ))}
              </div>

              {/* Form Header with Logo */}
              <div className="text-center mb-8 relative z-10">
                <div className="flex items-center justify-center gap-3 mb-6">
                  <img src="/sentralogis_logo.svg" alt="Sentralogis" className="h-14 w-auto drop-shadow-lg" />
                  <span className="text-white font-black text-2xl tracking-tight">SENTRALOGIS</span>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white/60 text-xs font-medium tracking-wide">Platform Active — v2.6</span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Welcome Back</h2>
                <p className="mt-2 text-sm text-white/40">Sign in to your workspace</p>
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
                      className="w-full pl-12 pr-4 py-4 bg-white/[0.06] border border-white/[0.1] rounded-xl outline-none text-white placeholder-white/25 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
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
                      className="w-full pl-12 pr-14 py-4 bg-white/[0.06] border border-white/[0.1] rounded-xl outline-none text-white placeholder-white/25 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-3 group relative overflow-hidden"
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

              <div className="mt-8 pt-6 border-t border-white/[0.08] text-center relative z-10">
                <p className="text-[10px] text-white/25 font-medium uppercase tracking-[0.2em]">
                  Secured by Sentralogis Core v2.6
                </p>
              </div>
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
