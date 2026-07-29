'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useGroundPwaInstall } from '@/lib/ground/usePwaInstall';
import { Loader2, MapPin, Eye, EyeOff, Download } from 'lucide-react';

export default function GroundStaffLogin() {
  const router = useRouter();
  const { canInstall, isInstalled, install } = useGroundPwaInstall();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError(null);

    try {
      const email = username.includes('@') ? username : `${username}@ground.sentralogis.local`;
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authErr) throw new Error(authErr.message === 'Invalid login credentials' ? 'Username atau password salah' : authErr.message);

      const { data: profile } = await supabase
        .from('ground_staff_profiles')
        .select('*, tenant:tenants(name)')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('Akun Ground Staff tidak ditemukan');
      }

      router.push('/ground/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/30">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Ground Staff</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Sentralogis Field Operations</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="w-full h-12 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-slate-500"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full h-12 px-4 pr-12 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-slate-500"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-900/50 border border-rose-800 rounded-xl p-3">
              <p className="text-xs font-bold text-rose-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Masuk'}
          </button>
        </form>

        {canInstall && !isInstalled && (
          <button onClick={install}
            className="w-full h-10 mt-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border border-slate-700">
            <Download size={14} /> Install Aplikasi Ground Staff
          </button>
        )}

        <p className="text-center text-[10px] text-slate-600 font-bold mt-8 uppercase tracking-widest">
          Sentralogis &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
