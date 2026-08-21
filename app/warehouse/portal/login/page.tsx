'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Warehouse, Lock, Phone, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function WarehouseLoginPage() {
  const router = useRouter();
  const [wa, setWa] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wa || !pin) return toast.error('Isi nomor WA dan PIN');
    
    setLoading(true);
    try {
      const cleanWa = wa.replace(/\D/g, '');
      
      const { data, error } = await supabase
        .from('md_warehouse_staff')
        .select('*')
        .eq('whatsapp', cleanWa)
        .eq('pin', pin)
        .eq('is_active', true)
        .single();
        
      if (error || !data) {
        throw new Error('Nomor WA atau PIN salah, atau akun tidak aktif.');
      }
      
      // Setup session
      const staff = data as any;
      const sessionData = {
        staff_id: staff.id,
        tenant_id: staff.tenant_id,
        name: staff.name,
        whatsapp: staff.whatsapp,
        role: staff.role,
        roles: staff.roles && staff.roles.length > 0 ? staff.roles : [staff.role],
        warehouse_id: staff.warehouse_id
      };
      
      localStorage.setItem('sentralogis_wh_session', JSON.stringify(sessionData));
      
      toast.success(`Selamat datang, ${staff.name}`);
      router.push('/warehouse/portal');
    } catch (err: any) {
      toast.error(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-5 pt-safe-area-top pb-safe-area-bottom">
      {/* Back to Portal Hub Button */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 pt-safe-area-top">
        <Link href="/" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors bg-slate-900/90 hover:bg-slate-800 px-4 py-2 rounded-full backdrop-blur-md border border-slate-700 shadow-lg active:scale-95">
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider">Kembali ke Portal Hub</span>
        </Link>
      </div>

      <div className="w-full max-w-sm space-y-8 relative z-10">
        
        <div className="text-center space-y-2">
          <div className="mb-4 flex justify-center">
            <img src="/logo2sentralogis.png" alt="Sentralogis" className="h-16 w-auto drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Welcome to Warehouse Portal</h1>
          <p className="text-xs font-semibold text-slate-400">Enter your WhatsApp & Touch PIN to access inventory tools</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-2xl space-y-5">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-black text-slate-600 uppercase tracking-widest mb-1.5 block">Nomor WhatsApp</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  type="tel"
                  required
                  value={wa}
                  onChange={e => setWa(e.target.value)}
                  placeholder="08123456789"
                  className="w-full pl-10 h-12 sm:h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-base"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-black text-slate-600 uppercase tracking-widest mb-1.5 block">PIN Login</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  type="password"
                  required
                  maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="••••••"
                  className="w-full pl-10 h-12 sm:h-12 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center tracking-widest text-lg font-mono"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 !bg-blue-600 hover:!bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 text-sm mt-2 transition-all active:scale-95"
            loading={loading}
          >
            Masuk Portal
          </Button>
        </form>
        
        <p className="text-center text-sm font-bold text-slate-600 px-4">
          Gunakan PIN yang diberikan oleh Admin Gudang
        </p>
      </div>
      
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
