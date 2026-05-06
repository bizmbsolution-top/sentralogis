'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  Coins, Lock, Loader2, 
  ShieldCheck, Mail, Info, LayoutGrid,
  User, ArrowRight, RefreshCcw, Activity, Key, Shield,
  History, ArrowUpRight, ArrowDownRight, Clock
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';

export default function TenantDashboard() {
  const { user, profile } = useAuth();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [editWhatsApp, setEditWhatsApp] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: tData } = await supabase.from('tenants').select('*').eq('user_id', user.id).single();
      setTenant(tData);
      setEditName(tData?.admin_full_name || '');
      setEditWhatsApp(profile?.whatsapp || '');
    } catch (err) {
      console.error('Sync Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user, profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      // Update profile table
      const { error: pError } = await supabase
        .from('profiles')
        .update({ full_name: editName, whatsapp: editWhatsApp })
        .eq('id', user?.id);
      
      if (pError) throw pError;

      // Update tenant table if needed (redundancy)
      await supabase
        .from('tenants')
        .update({ admin_full_name: editName })
        .eq('user_id', user?.id);

      toast.success('Identity Updated Successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Update Failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6 animate-pulse">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-slate-100 rounded-full" />
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Synchronizing Identity...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-slide-up">
      <Toaster position="top-right" />
      
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
           <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white text-3xl font-black italic shadow-2xl shadow-blue-500/20">
             {editName?.substring(0,1).toUpperCase() || 'U'}
           </div>
           <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">{editName || 'Administrator'}</h1>
              <p className="text-sm font-medium text-slate-500">Managing <span className="text-blue-600 font-bold">{tenant?.name}</span> ({tenant?.tenant_code})</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="info" className="!px-4 !py-2 !text-[10px]">
             {tenant?.subscription_tier?.toUpperCase()} CLUSTER
           </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile/Identity Form */}
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader className="flex items-center gap-3">
               <User className="w-5 h-5 text-slate-900" />
               <h3 className="text-base font-bold text-slate-900">Administrator Identity</h3>
            </CardHeader>
            <CardContent>
               <form onSubmit={handleUpdateProfile} className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Input 
                      label="Full Name"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Your authorized name"
                      icon={<User className="w-4 h-4" />}
                    />
                    <Input 
                      label="WhatsApp ID"
                      value={editWhatsApp}
                      onChange={e => setEditWhatsApp(e.target.value)}
                      placeholder="e.g. 0812XXXXXXXX"
                      icon={<Activity className="w-4 h-4" />}
                    />
                    <div className="space-y-1.5">
                       <label className="text-sm font-semibold text-slate-700 ml-0.5">Primary Email</label>
                       <div className="h-[46px] flex items-center px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-500 italic">
                         {profile?.email}
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-sm font-semibold text-slate-700 ml-0.5">Cluster Access Code</label>
                       <div className="h-[46px] flex items-center px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-blue-600 italic uppercase">
                         {tenant?.tenant_code}
                       </div>
                    </div>
                 </div>
                 <div className="flex justify-end pt-4">
                    <Button type="submit" loading={updating} icon={<RefreshCcw className="w-4 h-4" />}>
                      Update Identity
                    </Button>
                 </div>
               </form>
            </CardContent>
          </Card>

          {/* Security Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="hover:border-blue-200 transition-all group">
                <CardContent className="p-8 space-y-4">
                   <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Key className="w-6 h-6" />
                   </div>
                   <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Access Key</h3>
                   <p className="text-xs text-slate-500 leading-relaxed font-medium">Your current session is secured with RSA-256 encryption. Last login from Jakarta, ID.</p>
                </CardContent>
             </Card>
             <Card className="hover:border-emerald-200 transition-all group">
                <CardContent className="p-8 space-y-4">
                   <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <Shield className="w-6 h-6" />
                   </div>
                   <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Node Security</h3>
                   <p className="text-xs text-slate-500 leading-relaxed font-medium">Cluster node <strong>{tenant?.tenant_code}</strong> is currently active and healthy within the network.</p>
                </CardContent>
             </Card>
          </div>
        </div>

        {/* Energy Sidecard */}
        <div className="space-y-8">
           <Card className="bg-blue-50 border border-blue-100 shadow-2xl shadow-blue-500/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Coins className="w-32 h-32 rotate-12 text-blue-900" />
              </div>
              <CardContent className="p-10 relative z-10">
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] italic mb-8">Available Energy Reserve</p>
                 <div className="flex items-baseline gap-4 mb-10">
                    <h2 className="text-7xl font-black text-blue-900 tracking-tighter italic">
                       {(tenant?.token_balance || 0).toLocaleString('id-ID')}
                    </h2>
                    <span className="text-xs font-bold text-blue-400 uppercase">TKN</span>
                 </div>
                 <a href="/tenant/topup">
                    <Button variant="primary" className="w-full !py-6 !rounded-xl !bg-blue-600 hover:!bg-blue-700 border-none group" icon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}>
                      Manage Liquidity
                    </Button>
                 </a>
              </CardContent>
           </Card>

           <Card>
              <CardHeader className="flex items-center gap-3">
                 <Activity className="w-5 h-5 text-blue-600" />
                 <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Cluster Vitals</h3>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <span>Node Latency</span>
                       <span className="text-emerald-500">2ms</span>
                    </div>
                    <ProgressBar progress={98} />
                 </div>
                 <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <span>Energy Consumption</span>
                       <span className="text-blue-500">Low</span>
                    </div>
                    <ProgressBar progress={12} />
                 </div>
                 <div className="pt-4 border-t border-slate-100 flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase italic">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Protocol v5.0 Active
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      {/* Token Milestones Section for Tenant */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 ml-2">
          <History className="w-5 h-5 text-slate-400" />
          <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest italic">Token Milestones & Audit Trail</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <TenantHistorySection tenantCode={tenant?.tenant_code} />
        </div>
      </div>
    </div>
  );
}

function TenantHistorySection({ tenantCode }: { tenantCode: string }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantCode) {
      const fetchHistory = async () => {
        const { data } = await supabase
          .from('token_transactions')
          .select('*')
          .eq('tenant_code', tenantCode)
          .order('created_at', { ascending: false })
          .limit(10);
        setTransactions(data || []);
        setLoading(false);
      };
      fetchHistory();
    }
  }, [tenantCode]);

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing logs...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {transactions.length > 0 ? transactions.map((tx) => (
        <Card key={tx.id} className="border-slate-100 hover:border-slate-200 transition-all">
          <CardContent className="p-5 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              tx.transaction_type === 'TOPUP' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {tx.transaction_type === 'TOPUP' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-black text-slate-900 tracking-tight">
                  {tx.transaction_type === 'TOPUP' ? '+' : '-'}{tx.amount.toLocaleString()} TKN
                </p>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <Clock size={10} />
                  {new Date(tx.created_at).toLocaleDateString('id-ID')}
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 leading-relaxed italic truncate">
                {tx.description}
              </p>
            </div>
          </CardContent>
        </Card>
      )) : (
        <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Node transaction history empty</p>
        </div>
      )}
    </div>
  );
}
