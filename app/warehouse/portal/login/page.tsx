'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Warehouse, Lock, Phone } from 'lucide-react';
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
      const sessionData = {
        staff_id: data.id,
        tenant_id: data.tenant_id,
        name: data.name,
        whatsapp: data.whatsapp,
        role: data.role,
        warehouse_id: data.warehouse_id
      };
      
      localStorage.setItem('sentralogis_wh_session', JSON.stringify(sessionData));
      
      toast.success(`Selamat datang, ${data.name}`);
      router.push('/warehouse/portal');
    } catch (err: any) {
      toast.error(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 relative z-10">
        
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30 mb-6">
             <Warehouse size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Sentralogis <span className="text-blue-400">WH</span></h1>
          <p className="text-sm font-medium text-slate-400">Warehouse Staff Portal</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl space-y-5">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nomor WhatsApp</label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  type="tel"
                  required
                  value={wa}
                  onChange={e => setWa(e.target.value)}
                  placeholder="08123456789"
                  className="w-full pl-10 h-12 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1.5 block">PIN Login</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  type="password"
                  required
                  maxLength={6}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  placeholder="••••••"
                  className="w-full pl-10 h-12 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-center tracking-widest text-lg font-mono"
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
        
        <p className="text-center text-sm font-bold text-slate-500">
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
