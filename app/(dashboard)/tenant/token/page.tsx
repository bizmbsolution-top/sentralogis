'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Coins,
  Zap,
  ArrowUpRight,
  ArrowRight,
  Copy,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wallet,
  CreditCard,
  ExternalLink,
  TrendingDown,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Ban,
  Truck,
  Warehouse,
  ShieldCheck,
  Globe,
  Loader2,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import { getTokenPrice } from '@/lib/actions/tokenPriceActions';
import { fetchTenantById } from '@/lib/actions/tenantActions';

const DEFAULT_PRICE_PER_TOKEN = 1000;

export default function TenantTokenPage() {
  const supabase = createClient()!;
  const { user, profile } = useAuth();
  const [tenant, setTenant] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [whatsapp, setWhatsapp] = useState('');
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pricePerToken, setPricePerToken] = useState(DEFAULT_PRICE_PER_TOKEN);

  useEffect(() => {
    fetchPrice();
  }, []);

  const fetchPrice = async () => {
    const result = await getTokenPrice();
    if (result.success) {
      setPricePerToken(result.price);
    }
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const tid = profile?.tenant_id;
      if (tid) {
        const tData = await fetchTenantById(tid);
        if (tData) {
          setTenant(tData);
          const { data: rData } = await supabase
            .from('topup_requests')
            .select('*')
            .eq('tenant_code', tData.tenant_code)
            .order('created_at', { ascending: false })
            .limit(20);
          setRequests(rData || []);
        }
      }
      if (profile) setWhatsapp(profile.whatsapp || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profile?.tenant_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleTopup = async () => {
    if (!whatsapp || whatsapp.length < 10) return toast.error('WhatsApp valid diperlukan');
    if (!amount || parseInt(amount) <= 0) return toast.error('Masukkan jumlah token');
    if (!file) return toast.error('Bukti transfer diperlukan');

    setUploading(true);
    try {
      if (whatsapp !== profile?.whatsapp) {
        await supabase.from('profiles').update({ whatsapp }).eq('id', user?.id);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${tenant.tenant_code}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('topup-proofs')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('topup-proofs')
        .getPublicUrl(fileName);

      const totalPay = parseInt(amount) * pricePerToken;
      const { error: reqError } = await supabase.from('topup_requests').insert({
        tenant_id: tenant.id,
        tenant_code: tenant.tenant_code,
        amount: parseInt(amount),
        total_price: totalPay,
        proof_url: publicUrl,
        status: 'pending',
      });
      if (reqError) throw reqError;

      const message = `Halo Admin Sentralogis,\n\nSaya ${profile?.full_name || 'User'} dari cluster ${tenant.tenant_code} ingin top-up token.\n\nRequest: ${amount} token\nTotal Transfer: Rp ${totalPay.toLocaleString()}\n\nBukti transfer terlampir di sistem.\n\nTerima kasih.`;
      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/6285218129978?text=${encoded}`, '_blank');

      toast.success('Request topup berhasil dikirim');
      setAmount('');
      setFile(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim request');
    } finally {
      setUploading(false);
    }
  };

  const calculatedPrice = (parseInt(amount) || 0) * pricePerToken;

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const totalTopup = requests
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400">Loading token dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Coins size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Token Management</p>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">Token Balance</h1>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Balance + Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Main Balance */}
          <Card className="md:col-span-2 p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-blue-100 uppercase tracking-wide mb-2">
                  Current Balance
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
                <h2 className={`text-4xl font-bold tracking-tight ${
                  (tenant?.token_balance || 0) <= 0 ? 'text-red-300' : ''
                }`}>
                  {(tenant?.token_balance || 0).toLocaleString('id-ID')}
                  <span className="text-lg font-medium text-blue-200 ml-2">TKN</span>
                </h2>
                <p className="text-xs text-blue-200 mt-2">Cluster: {tenant?.tenant_code || '—'}</p>
              </div>
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                <Zap size={24} className="text-white" />
              </div>
            </div>

            {/* Low balance warning */}
            {(tenant?.token_balance || 0) <= 5 && (
              <div className={`mt-4 p-3 rounded-xl flex items-start gap-2 ${
                (tenant?.token_balance || 0) <= 0
                  ? 'bg-red-500/20 border border-red-400/30'
                  : 'bg-yellow-400/20 border border-yellow-400/30'
              }`}>
                {(tenant?.token_balance || 0) <= 0
                  ? <Ban size={16} className="text-red-300 shrink-0 mt-0.5" />
                  : <AlertTriangle size={16} className="text-yellow-300 shrink-0 mt-0.5" />
                }
                <div>
                  <p className={`text-xs font-bold ${
                    (tenant?.token_balance || 0) <= 0 ? 'text-red-200' : 'text-yellow-200'
                  }`}>
                    {(tenant?.token_balance || 0) <= 0
                      ? 'Token Balance Habis'
                      : 'Token Hampir Habis'
                    }
                  </p>
                  <p className={`text-[10px] mt-0.5 ${
                    (tenant?.token_balance || 0) <= 0 ? 'text-red-300' : 'text-yellow-300'
                  }`}>
                    {(tenant?.token_balance || 0) <= 0
                      ? 'Segera lakukan top-up agar JO dapat berjalan.'
                      : `Sisa ${tenant?.token_balance} TKN. Segera top-up.`
                    }
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Stats */}
          <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                <Clock size={18} />
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-1">Pending Requests</p>
            <p className="text-xl font-semibold text-slate-900">{pendingCount}</p>
          </Card>

          <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-1">Total Topup</p>
            <p className="text-xl font-semibold text-slate-900">{totalTopup.toLocaleString('id-ID')}</p>
          </Card>
        </div>

        {/* Topup Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bank Info */}
          <Card className="p-6 border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <CreditCard size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Bank Transfer</h3>
                <p className="text-xs text-slate-400">Transfer ke rekening berikut</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">Bank Central Asia (BCA)</p>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xl font-bold text-slate-900">1234567890</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('1234567890');
                    toast.success('Nomor rekening disalin');
                  }}
                  className="p-2 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                >
                  <Copy size={14} />
                </button>
              </div>
              <p className="text-[10px] font-medium text-slate-500 uppercase">PT SENTRALOGIS LOGISTIK INDONESIA</p>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-[10px] font-medium text-blue-600">
                Reference: <span className="font-semibold">TOPUP {tenant?.tenant_code}</span>
              </p>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-amber-600" />
                <p className="text-xs font-semibold text-amber-700">Ketentuan</p>
              </div>
              <ul className="space-y-1 text-[10px] text-amber-600">
                <li>• 1 TKN = Rp 1.000</li>
                <li>• Verifikasi manual oleh admin</li>
                <li>• Token non-refundable</li>
              </ul>
            </div>
          </Card>

          {/* Topup Form */}
          <Card className="lg:col-span-2 p-6 border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                <Wallet size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Form Topup</h3>
                <p className="text-xs text-slate-400">Isi jumlah dan upload bukti transfer</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="WhatsApp"
                placeholder="0812XXXXXXXX"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                icon={<ExternalLink size={14} />}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Jumlah Token"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-700 ml-0.5">Total Bayar</p>
                  <div className="h-[42px] flex items-center px-4 bg-slate-50 rounded-lg border border-slate-200 text-sm font-semibold text-slate-900">
                    Rp {calculatedPrice.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-0.5">Bukti Transfer</label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center h-[42px] border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Upload size={14} />
                      {file ? file.name : 'Pilih file'}
                    </div>
                  </label>
                </div>
              </div>

              <Button
                onClick={handleTopup}
                loading={uploading}
                className="w-full py-3 text-sm font-medium rounded-lg"
                icon={<ArrowRight size={16} />}
              >
                Kirim Request Topup
              </Button>
            </div>
          </Card>
        </div>

        {/* Token Consumption History */}
        <ConsumptionHistory tenantCode={tenant?.tenant_code} />

        {/* History Table */}
        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Riwayat Topup</h3>
                <p className="text-xs text-slate-400 mt-0.5">Semua request topup token</p>
              </div>
              {requests.length > 0 && (
                <Badge variant={pendingCount > 0 ? 'warning' : 'success'}>
                  {pendingCount > 0 ? `${pendingCount} pending` : 'Semua verified'}
                </Badge>
              )}
            </div>
          </div>

          {requests.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <Coins size={40} className="text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">Belum ada riwayat topup</p>
              <p className="text-xs text-slate-400 mt-1">Request topup pertama Anda akan muncul di sini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                    <th className="px-5 py-3">Tanggal</th>
                    <th className="px-5 py-3 text-center">Jumlah</th>
                    <th className="px-5 py-3 text-center">Total</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {requests.map((req) => {
                    const statusConfig = {
                      pending: { label: 'Pending', variant: 'warning' as const, icon: Clock },
                      approved: { label: 'Approved', variant: 'success' as const, icon: CheckCircle2 },
                      rejected: { label: 'Rejected', variant: 'danger' as const, icon: AlertCircle },
                    };
                    const config = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = config.icon;

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-xs font-medium text-slate-900">
                            {new Date(req.created_at).toLocaleDateString('id-ID')}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(req.created_at).toLocaleTimeString('id-ID')}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="text-sm font-semibold text-slate-900">
                            {req.amount?.toLocaleString('id-ID')} TKN
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="text-sm font-medium text-slate-600">
                            Rp {req.total_price?.toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <StatusIcon size={12} />
                            <span className="text-xs font-medium">{config.label}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Token Consumption History */}
        <ConsumptionHistory tenantCode={tenant?.tenant_code} />
      </div>
    </div>
  );
}

function ConsumptionHistory({ tenantCode }: { tenantCode: string }) {
  const supabase = createClient()!;
  const [consumptions, setConsumptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantCode) return;
    const fetchData = async () => {
      const { data } = await supabase
        .from('token_transactions')
        .select('*')
        .eq('tenant_code', tenantCode)
        .eq('transaction_type', 'CONSUME')
        .order('created_at', { ascending: false })
        .limit(20);
      setConsumptions(data || []);
      setLoading(false);
    };
    fetchData();
  }, [tenantCode]);

  const SBU_ICON: Record<string, any> = {
    TRUCKING: Truck,
    WAREHOUSE: Warehouse,
    CLEARANCE: ShieldCheck,
    FORWARDING: Globe,
  };

  return (
    <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Riwayat Konsumsi Token</h3>
            <p className="text-xs text-slate-400 mt-0.5">Token terpakai per penyelesaian Job Order</p>
          </div>
          {consumptions.length > 0 && (
            <span className="text-xs font-bold text-slate-400">
              Total: {consumptions.reduce((s, c) => s + (c.amount || 0), 0).toLocaleString()} TKN
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : consumptions.length === 0 ? (
        <div className="p-12 flex flex-col items-center justify-center text-center">
          <TrendingDown size={40} className="text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600">Belum ada konsumsi token</p>
          <p className="text-xs text-slate-400 mt-1">Konsumsi token akan muncul setelah JO pertama selesai</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-medium text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">SBU</th>
                <th className="px-5 py-3">Deskripsi</th>
                <th className="px-5 py-3 text-center">Token</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {consumptions.map((tx) => {
                const sbu = tx.description?.split(' - ')[0] || '';
                const Icon = SBU_ICON[sbu] || Coins;
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-xs font-medium text-slate-900">
                        {new Date(tx.created_at).toLocaleDateString('id-ID')}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(tx.created_at).toLocaleTimeString('id-ID')}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Icon size={14} className="text-slate-600" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">{sbu}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{tx.description}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm font-bold text-rose-600">
                        -{tx.amount?.toLocaleString('id-ID')} TKN
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
