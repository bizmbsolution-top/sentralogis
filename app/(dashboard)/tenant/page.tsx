'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { fetchTenantById } from '@/lib/actions/tenantActions';
import { 
  Coins, Lock, Loader2, 
  ShieldCheck, Mail, Info, LayoutGrid,
  User, ArrowRight, RefreshCcw, Activity, Key, Shield,
  History, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle, Ban
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
      const tid = profile?.tenant_id;
      if (tid) {
        const tData = await fetchTenantById(tid);
        setTenant(tData);
      }
      setEditName(profile?.full_name || '');
      setEditWhatsApp(profile?.whatsapp || '');
    } catch (err) {
      console.error('Sync Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user, profile?.tenant_id]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      // [AI] Only update profiles table — tenants table has no admin_full_name column
      const { error: pError } = await supabase
        .from('profiles')
        .update({ full_name: editName, whatsapp: editWhatsApp || null })
        .eq('id', user?.id);
      
      if (pError) throw pError;

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
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black italic shadow-xl shadow-blue-500/20">
             {editName?.substring(0,1).toUpperCase() || 'U'}
           </div>
           <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">{editName || 'Administrator'}</h1>
              <p className="text-xs font-medium text-slate-500">Managing <span className="text-blue-600 font-bold">{tenant?.name}</span> ({tenant?.tenant_code})</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="info" className="!px-3 !py-1.5 !text-[10px] font-bold">
             {tenant?.subscription_tier?.toUpperCase()} CLUSTER
           </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile/Identity Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex items-center gap-2 py-4">
               <User className="w-4 h-4 text-slate-900" />
               <h3 className="text-sm font-bold text-slate-900">Administrator Identity</h3>
            </CardHeader>
            <CardContent className="pb-6">
               <form onSubmit={handleUpdateProfile} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                       <label className="text-xs font-semibold text-slate-700 ml-0.5">Primary Email</label>
                       <div className="h-[40px] flex items-center px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 italic">
                         {profile?.email}
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-xs font-semibold text-slate-700 ml-0.5">Cluster Access Code</label>
                       <div className="h-[40px] flex items-center px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-blue-600 italic uppercase">
                         {tenant?.tenant_code}
                       </div>
                    </div>
                 </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" loading={updating} icon={<RefreshCcw className="w-4 h-4" />}>
                      Update Identity
                    </Button>
                 </div>
               </form>
            </CardContent>
          </Card>

          {/* Security Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Card className="hover:border-blue-200 transition-all group">
                <CardContent className="p-5 space-y-3">
                   <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Key className="w-5 h-5" />
                   </div>
                   <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Access Key</h3>
                   <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Your current session is secured with RSA-256 encryption. Last login from Jakarta, ID.</p>
                </CardContent>
             </Card>
             <Card className="hover:border-emerald-200 transition-all group">
                <CardContent className="p-5 space-y-3">
                   <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <Shield className="w-5 h-5" />
                   </div>
                   <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Node Security</h3>
                   <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Cluster node <strong>{tenant?.tenant_code}</strong> is currently active and healthy within the network.</p>
                </CardContent>
             </Card>
          </div>
        </div>

        {/* Energy Sidecard */}
        <div className="space-y-6">
           <Card className="bg-blue-50 border border-blue-100 shadow-xl shadow-blue-500/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                 <Coins className="w-24 h-24 rotate-12 text-blue-900" />
              </div>
               <CardContent className="p-6 relative z-10">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest italic mb-6">
                    Available Energy Reserve
                    {(tenant?.token_balance || 0) <= 5 && (
                      <span className={`ml-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        (tenant?.token_balance || 0) <= 0
                          ? 'bg-red-500 text-white'
                          : 'bg-yellow-400 text-yellow-900'
                      }`}>
                        {(tenant?.token_balance || 0) <= 0 ? 'HABIS' : 'KRITIS'}
                      </span>
                    )}
                  </p>
                  <div className="flex items-baseline gap-3 mb-8">
                      <h2 className={`text-2xl md:text-3xl font-semibold tracking-tight italic ${
                        (tenant?.token_balance || 0) <= 0
                          ? 'text-red-600'
                          : (tenant?.token_balance || 0) <= 5
                          ? 'text-yellow-600'
                          : 'text-blue-900'
                      }`}>
                        {(tenant?.token_balance || 0).toLocaleString('id-ID')}
                     </h2>
                     <span className="text-[10px] font-bold text-blue-400 uppercase">TKN</span>
                  </div>

                  {/* Low balance warning */}
                  {(tenant?.token_balance || 0) <= 5 && (
                    <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 ${
                      (tenant?.token_balance || 0) <= 0
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      {(tenant?.token_balance || 0) <= 0
                        ? <Ban size={16} className="text-red-500 shrink-0 mt-0.5" />
                        : <AlertTriangle size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                      }
                      <div>
                        <p className={`text-xs font-bold ${
                          (tenant?.token_balance || 0) <= 0 ? 'text-red-700' : 'text-yellow-700'
                        }`}>
                          {(tenant?.token_balance || 0) <= 0
                            ? 'Token Balance Habis'
                            : 'Token Hampir Habis'
                          }
                        </p>
                        <p className={`text-[10px] mt-0.5 ${
                          (tenant?.token_balance || 0) <= 0 ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {(tenant?.token_balance || 0) <= 0
                            ? 'Saldo token habis. JO baru tidak dapat berjalan hingga top-up dilakukan.'
                            : `Sisa ${tenant?.token_balance} TKN. Segera lakukan top-up.`
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  <a href="/tenant/topup">
                     <Button variant="primary" className="w-full !py-4 !rounded-xl !bg-blue-600 hover:!bg-blue-700 border-none group text-sm" icon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}>
                       Manage Liquidity
                     </Button>
                  </a>
               </CardContent>
           </Card>

           <Card>
              <CardHeader className="flex items-center gap-2 py-4">
                 <Activity className="w-4 h-4 text-blue-600" />
                 <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Cluster Vitals</h3>
              </CardHeader>
              <CardContent className="space-y-5 pb-5">
                 <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       <span>Node Latency</span>
                       <span className="text-emerald-500">2ms</span>
                    </div>
                    <ProgressBar value={98} max={100} />
                 </div>
                 <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                       <span>Energy Consumption</span>
                       <span className="text-blue-500">Low</span>
                    </div>
                    <ProgressBar value={12} max={100} />
                 </div>
                 <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase italic">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Protocol v5.0 Active
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>

      {/* Token Milestones Section for Tenant */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 ml-1">
          <History className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest italic">Token Milestones & Audit Trail</h3>
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
          <CardContent className="p-4 flex items-start gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              tx.transaction_type === 'TOPUP' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {tx.transaction_type === 'TOPUP' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-bold text-slate-900 tracking-tight">
                  {tx.transaction_type === 'TOPUP' ? '+' : '-'}{tx.amount.toLocaleString()} TKN
                </p>
                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <Clock size={10} />
                  {new Date(tx.created_at).toLocaleDateString('id-ID')}
                </div>
              </div>
              <p className="text-[11px] font-medium text-slate-500 leading-relaxed italic truncate">
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
