'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowRight, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface MouseStar {
  id: number;
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  opacity: number;
}

interface WalkingGlasses {
  id: number;
  x: number;
  y: number;
  speed: number;
  direction: number;
  size: number;
  glowIntensity: number;
  trail: { x: number; y: number; opacity: number }[];
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [cardGlowAngle, setCardGlowAngle] = useState(0);
  const { login, user, logout: signOut, loading: authLoading } = useAuth();
  const router = useRouter();

  const mouseStarsRef = useRef<MouseStar[]>([]);
  const walkingGlassesRef = useRef<WalkingGlasses[]>([]);
  const [renderStars, setRenderStars] = useState<MouseStar[]>([]);
  const [renderGlasses, setRenderGlasses] = useState<WalkingGlasses[]>([]);
  const animFrameRef = useRef<number>(0);
  const starIdRef = useRef(0);
  const glassesIdRef = useRef(0);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glasses: WalkingGlasses[] = [];
    for (let i = 0; i < 3; i++) {
      glasses.push({
        id: glassesIdRef.current++,
        x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
        y: 100 + Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080) * 0.8,
        speed: 0.3 + Math.random() * 0.5,
        direction: Math.random() > 0.5 ? 1 : -1,
        size: 20 + Math.random() * 15,
        glowIntensity: 0.5 + Math.random() * 0.5,
        trail: [],
      });
    }
    walkingGlassesRef.current = glasses;
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const animate = () => {
      mouseStarsRef.current = mouseStarsRef.current
        .map(star => ({
          ...star,
          x: star.x + star.vx,
          y: star.y + star.vy,
          vy: star.vy + 0.02,
          life: star.life - 1,
          opacity: Math.max(0, star.life / star.maxLife),
        }))
        .filter(star => star.life > 0);

      const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const h = typeof window !== 'undefined' ? window.innerHeight : 1080;
      walkingGlassesRef.current = walkingGlassesRef.current.map(g => {
        const newX = g.x + g.speed * g.direction;
        const newY = g.y + Math.sin(Date.now() * 0.002 + g.id) * 0.3;
        const newTrail = [...g.trail, { x: g.x, y: g.y, opacity: 0.6 }].slice(-8);
        const wrappedX = g.direction > 0 ? (newX > w + 50 ? -50 : newX) : (newX < -50 ? w + 50 : newX);
        return {
          ...g,
          x: wrappedX,
          y: Math.max(50, Math.min(h - 50, newY)),
          trail: newTrail,
          glowIntensity: 0.5 + Math.sin(Date.now() * 0.003 + g.id * 2) * 0.3,
        };
      });

      setRenderStars([...mouseStarsRef.current]);
      setRenderGlasses([...walkingGlassesRef.current]);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [mounted]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        const count = Math.min(Math.floor(dist / 8), 5);
        for (let i = 0; i < count; i++) {
          const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.5;
          const speed = 1 + Math.random() * 3;
          mouseStarsRef.current.push({
            id: starIdRef.current++,
            x: e.clientX + (Math.random() - 0.5) * 20,
            y: e.clientY + (Math.random() - 0.5) * 20,
            size: 1 + Math.random() * 2.5,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            life: 40 + Math.random() * 40,
            maxLife: 80,
            opacity: 1,
          });
        }
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }

      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050816] flex items-center justify-center">
      {/* Deep Space Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050816] via-[#0a0e27] to-[#0d1b3e]" />

        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[100px] transition-all duration-[2000ms] ease-out pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #6366f1 0%, #8b5cf6 30%, transparent 70%)',
            left: mousePos.x * 0.03 - 300,
            top: mousePos.y * 0.03 - 300,
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[80px] transition-all duration-[2500ms] ease-out pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #3b82f6 0%, #06b6d4 40%, transparent 70%)',
            right: mousePos.x * 0.02 - 200,
            bottom: mousePos.y * 0.02 - 200,
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-[60px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #ec4899 0%, #f43f5e 40%, transparent 70%)',
            left: '60%',
            top: '20%',
          }}
        />

        <div className="absolute inset-0">
          {mounted && Array.from({ length: 150 }).map((_, i) => (
            <div
              key={`bg-${i}`}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 1.5 + 0.5,
                height: Math.random() * 1.5 + 0.5,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.4 + 0.1,
                animation: `twinkle ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 5}s infinite`,
              }}
            />
          ))}
        </div>

        {renderStars.map(star => (
          <div
            key={star.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: star.size,
              height: star.size,
              left: star.x,
              top: star.y,
              opacity: star.opacity,
              background: `radial-gradient(circle, rgba(255,255,255,${star.opacity}) 0%, rgba(139,92,246,${star.opacity * 0.5}) 50%, transparent 100%)`,
              boxShadow: `0 0 ${star.size * 3}px rgba(139,92,246,${star.opacity * 0.5})`,
            }}
          />
        ))}

        {renderGlasses.map(g => (
          <div key={g.id} className="absolute pointer-events-none" style={{ left: g.x, top: g.y }}>
            {g.trail.map((t, i) => (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: g.size * 0.3,
                  height: g.size * 0.3,
                  left: (t.x - g.x),
                  top: (t.y - g.y),
                  opacity: t.opacity * (i / g.trail.length) * 0.3,
                  background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)',
                  filter: 'blur(2px)',
                }}
              />
            ))}
            <div
              className="relative"
              style={{
                transform: `scaleX(${g.direction})`,
                filter: `drop-shadow(0 0 ${8 + g.glowIntensity * 12}px rgba(96,165,250,${g.glowIntensity})) drop-shadow(0 0 ${15 + g.glowIntensity * 20}px rgba(139,92,246,${g.glowIntensity * 0.5}))`,
              }}
            >
              <svg width={g.size} height={g.size * 0.6} viewBox="0 0 40 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="url(#glassesGrad)" strokeWidth="1.5" fill="rgba(96,165,250,0.1)" />
                <circle cx="28" cy="12" r="9" stroke="url(#glassesGrad)" strokeWidth="1.5" fill="rgba(96,165,250,0.1)" />
                <path d="M19 12 Q20 10 21 12" stroke="url(#glassesGrad)" strokeWidth="1.5" fill="none" />
                <path d="M3 12 L0 10" stroke="url(#glassesGrad)" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M37 12 L40 10" stroke="url(#glassesGrad)" strokeWidth="1.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="glassesGrad" x1="0" y1="0" x2="40" y2="24">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="50%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        ))}

        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
      </div>

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
