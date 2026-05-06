'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  Coins, Zap, Info, Loader2, 
  AlertTriangle, ShieldCheck, Copy, 
  History as HistoryIcon, ArrowRight, Wallet,
  CreditCard, ExternalLink
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/Table';

export default function TenantTopupPage() {
  const { user, profile } = useAuth();
  const [tenant, setTenant] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const PRICE_PER_TOKEN = 1000;

  const fetchData = async () => {
    if (!user) return;
    try {
      const { data: tData } = await supabase.from('tenants').select('*').eq('user_id', user.id);
      if (tData && tData.length > 0) {
        setTenant(tData[0]);
        const { data: rData } = await supabase
          .from('topup_requests')
          .select('*')
          .eq('tenant_code', tData[0].tenant_code)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        setRequests(rData || []);
      }
      if (profile) setWhatsapp(profile.whatsapp || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user, profile]);

  const handleUploadAndNotify = async () => {
    if (!whatsapp || whatsapp.length < 10) return toast.error('Valid WhatsApp identity required');
    if (!amount || parseInt(amount) <= 0) return toast.error('Specify recharge amount');
    if (!file) return toast.error('Transfer proof required');
    
    setUploading(true);
    try {
      if (whatsapp !== profile?.whatsapp) {
        await supabase.from('profiles').update({ whatsapp }).eq('id', user?.id);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${tenant.tenant_code}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('topup-proofs').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('topup-proofs').getPublicUrl(fileName);

      const totalPay = parseInt(amount) * PRICE_PER_TOKEN;
      const { error: reqError } = await supabase.from('topup_requests').insert({
        tenant_id: tenant.id, tenant_code: tenant.tenant_code,
        amount: parseInt(amount), total_price: totalPay,
        proof_url: publicUrl, status: 'pending'
      });
      if (reqError) throw reqError;

      const message = `Halo Admin Sentralogis,\n\nSaya ${profile.full_name} dari cluster ${tenant.tenant_code} ingin top-up token.\n\nRequest: ${amount} token\nTotal Transfer: Rp ${totalPay.toLocaleString()}\n\nBukti transfer terlampir di sistem.\n\nTerima kasih.`;
      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/6285218129978?text=${encoded}`, '_blank');
      
      toast.success('Recharge Request Transmitted');
      setAmount('');
      setFile(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Transmission Failure');
    } finally {
      setUploading(false);
    }
  };

  const calculatedPrice = (parseInt(amount) || 0) * PRICE_PER_TOKEN;

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-6 animate-pulse">
       <div className="relative">
          <div className="w-12 h-12 border-4 border-slate-100 rounded-full" />
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Initializing Payment Gateway...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-slide-up">
      <Toaster position="top-right" />
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Energy Recharge Hub</h1>
          <p className="text-sm font-medium text-slate-500">Initiate token acquisition protocol and manage liquidity settlements.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">System Ready</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-8">
           {/* Current Level */}
           <Card className="bg-blue-50 border border-blue-100 shadow-2xl shadow-blue-500/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <Coins className="w-32 h-32 rotate-12 text-blue-900" />
              </div>
              <CardContent className="p-10 relative z-10">
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] italic mb-6">Current Energy Reserve</p>
                 <div className="flex items-baseline gap-4">
                    <h2 className="text-6xl font-black italic tracking-tighter text-blue-900">
                       {(tenant?.token_balance || 0).toLocaleString('id-ID')}
                    </h2>
                    <span className="text-xs font-bold text-blue-400 uppercase">TKN</span>
                 </div>
              </CardContent>
           </Card>

           {/* Policy Info */}
           <Card className="bg-amber-50 border-amber-100">
              <CardContent className="p-8 space-y-6">
                 <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Settlement Protocols</h3>
                 </div>
                 <ul className="space-y-4">
                    {[
                      'Exchange Rate: 1 TKN = Rp 1.000',
                      'Bank Statement verification required',
                      'Non-refundable operational credits',
                      'Manual audit for each transaction'
                    ].map((text, i) => (
                      <li key={i} className="flex gap-3 text-[11px] font-medium text-slate-600 italic">
                         <div className="w-1 h-1 rounded-full bg-amber-500 shrink-0 mt-2" />
                         {text}
                      </li>
                    ))}
                 </ul>
              </CardContent>
           </Card>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* Bank Info */}
           <Card>
              <CardHeader className="flex items-center gap-3">
                 <CreditCard className="w-5 h-5 text-blue-600" />
                 <h3 className="text-base font-bold text-slate-900">Payment Gateway</h3>
              </CardHeader>
              <CardContent className="space-y-8">
                 <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl group transition-all hover:border-blue-500/30">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Bank Central Asia (BCA)</p>
                    <div className="flex items-center justify-between mb-2">
                       <p className="text-2xl font-bold text-slate-900 tracking-tight">1234567890</p>
                       <button 
                        onClick={() => { navigator.clipboard.writeText('1234567890'); toast.success('Account Copied'); }}
                        className="p-2 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                       >
                          <Copy className="w-4 h-4" />
                       </button>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PT SENTRALOGIS LOGISTIK INDONESIA</p>
                 </div>
                 <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <p className="text-[10px] font-bold text-blue-600 leading-relaxed uppercase tracking-widest italic">
                       Reference: <span className="font-black">TOPUP {tenant?.tenant_code}</span>
                    </p>
                 </div>
              </CardContent>
           </Card>

           {/* Recharge Form */}
           <Card>
              <CardHeader className="flex items-center gap-3">
                 <Wallet className="w-5 h-5 text-slate-900" />
                 <h3 className="text-base font-bold text-slate-900">Recharge Protocol</h3>
              </CardHeader>
              <CardContent className="space-y-6">
                 <Input 
                  label="Verification WhatsApp"
                  placeholder="0812XXXXXXXX"
                  value={whatsapp} 
                  onChange={e => setWhatsapp(e.target.value)}
                  icon={<ExternalLink className="w-4 h-4" />}
                 />
                 <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Quantity"
                      type="number"
                      value={amount} 
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0"
                    />
                    <div className="space-y-1.5">
                       <p className="text-sm font-semibold text-slate-700 ml-0.5">Total Pay</p>
                       <div className="h-[46px] flex items-center px-4 bg-slate-50 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 italic">
                          Rp {calculatedPrice.toLocaleString()}
                       </div>
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 ml-0.5">Settlement Proof</label>
                    <input 
                      type="file" accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="w-full text-xs font-medium text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all"
                    />
                 </div>
                 <Button 
                  onClick={handleUploadAndNotify} 
                  loading={uploading}
                  className="w-full !py-6 text-sm font-bold !rounded-xl"
                  icon={<ArrowRight className="w-5 h-5" />}
                 >
                   Authorize Recharge
                 </Button>
              </CardContent>
           </Card>
        </div>
      </div>

      {/* History Table */}
      {requests.length > 0 && (
        <div className="space-y-6 pt-12 border-t border-slate-200">
          <div className="flex items-center gap-3 ml-2">
            <HistoryIcon className="w-5 h-5 text-slate-400" />
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest italic">Active Verification Queue</h3>
          </div>

          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Initialization</TableHead>
                  <TableHead className="text-center">Payload</TableHead>
                  <TableHead className="text-center">Settlement</TableHead>
                  <TableHead className="text-right">Node Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req, i) => (
                  <TableRow key={req.id || `req-${i}`}>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200">
                          <ShieldCheck className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                           <p className="text-xs font-bold text-slate-900">{new Date(req.created_at).toLocaleDateString()}</p>
                           <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">{new Date(req.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-bold text-slate-900">{req.amount.toLocaleString()} <span className="text-[10px] text-slate-400">TKN</span></span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-bold text-blue-600 italic">Rp {req.total_price?.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="warning">
                         VERIFYING NODE
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
