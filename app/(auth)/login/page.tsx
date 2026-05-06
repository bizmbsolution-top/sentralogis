'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock, ShieldCheck } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('[LoginPage] Attempting login for:', email);
      const { error } = await login(email, password);
      
      if (error) {
        console.error('[LoginPage] Login failed with error:', JSON.stringify(error, null, 2));
      }
    } catch (err: any) {
      console.error('[LoginPage] Unexpected catch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Toaster position="top-right" />
      <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 w-full max-w-md p-10 space-y-8 animate-slide-up border border-slate-100">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg mb-4">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic">SENTRALOGIS</h1>
          <p className="text-sm font-medium text-slate-400 uppercase tracking-[0.2em] italic">Identity Console</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <Input
              label="Enterprise Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sentralogis.com"
              icon={<Mail className="w-4 h-4 text-slate-400" />}
              required
            />
            <div className="space-y-1.5">
               <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Security Password</label>
               <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-600 transition-colors">
                     <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all text-sm font-medium"
                    required
                  />
               </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full !py-7 !bg-slate-900 hover:!bg-slate-800 !rounded-2xl shadow-xl shadow-slate-900/10"
            loading={loading}
          >
            Authorize & Access Dashboard
          </Button>
        </form>

        <div className="pt-8 text-center border-t border-slate-100">
           <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] italic">
              Encrypted via Sentralogis Core v2.4
           </p>
        </div>
      </div>
    </div>
  );
}
