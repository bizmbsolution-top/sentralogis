'use client';

import { useState, useEffect } from 'react';
import { 
  Coins, 
  Loader2, 
  Save, 
  History, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  ChevronRight,
  ArrowLeft,
  Truck,
  Warehouse,
  ShieldCheck,
  Globe,
  Sliders
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '@/lib/hooks/useAuth';
import { getTokenPrice, getTokenPriceHistory, updateTokenPrice } from '@/lib/actions/tokenPriceActions';
import { getSbuTokenRates, updateSbuTokenRate } from '../actions';

const SBU_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  TRUCKING:  { icon: Truck,      color: 'text-blue-600',   bg: 'bg-blue-50' },
  WAREHOUSE: { icon: Warehouse,  color: 'text-amber-600',  bg: 'bg-amber-50' },
  CLEARANCE: { icon: ShieldCheck,color: 'text-emerald-600', bg: 'bg-emerald-50' },
  FORWARDING:{ icon: Globe,      color: 'text-indigo-600',  bg: 'bg-indigo-50' },
};

export default function SettingsPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'price' | 'history' | 'sbu'>('price');
  const [currentPrice, setCurrentPrice] = useState(1000);
  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // SBU rates state
  const [sbuRates, setSbuRates] = useState<any[]>([]);
  const [sbuLoading, setSbuLoading] = useState(false);
  const [sbuSaving, setSbuSaving] = useState<string | null>(null);
  const [editRates, setEditRates] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPrice();
  }, []);

  const fetchPrice = async () => {
    setLoading(true);
    try {
      const result = await getTokenPrice();
      if (result.success) {
        setCurrentPrice(result.price);
        setNewPrice(result.price.toString());
      }
    } catch (err) {
      toast.error('Gagal memuat harga token');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const result = await getTokenPriceHistory();
      if (result.success) {
        setHistory(result.data || []);
      }
    } catch (err) {
      toast.error('Gagal memuat riwayat');
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchSbuRates = async () => {
    setSbuLoading(true);
    try {
      const result = await getSbuTokenRates();
      if (result.success) {
        setSbuRates(result.data);
        const rates: Record<string, string> = {};
        result.data.forEach((r: any) => { rates[r.sbu_type] = r.tokens_per_jo.toString(); });
        setEditRates(rates);
      }
    } catch (err) {
      toast.error('Gagal memuat tarif SBU');
    } finally {
      setSbuLoading(false);
    }
  };

  const handleSavePrice = async () => {
    const priceNum = parseInt(newPrice);
    if (!priceNum || priceNum <= 0) {
      toast.error('Masukkan harga yang valid');
      return;
    }
    if (priceNum === currentPrice) {
      toast.error('Harga sama dengan harga saat ini');
      return;
    }

    setSaving(true);
    try {
      const result = await updateTokenPrice({
        newPrice: priceNum,
        reason: reason || 'Price update',
        userId: profile?.id
      });

      if (result.success) {
        toast.success(result.message);
        setCurrentPrice(priceNum);
        setReason('');
        fetchPrice();
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSbuRate = async (sbuType: string) => {
    const val = parseInt(editRates[sbuType]);
    if (!val || val <= 0) {
      toast.error('Masukkan jumlah token yang valid');
      return;
    }
    setSbuSaving(sbuType);
    try {
      const result = await updateSbuTokenRate({
        sbuType,
        tokensPerJo: val,
        userId: profile?.id
      });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    } finally {
      setSbuSaving(null);
    }
  };

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab; label: string; icon: any }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        if (id === 'history') fetchHistory();
        if (id === 'sbu') fetchSbuRates();
        if (id === 'price') fetchPrice();
      }}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        activeTab === id 
          ? 'bg-slate-900 text-white shadow-sm' 
          : 'text-slate-500 hover:bg-slate-50'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Kelola konfigurasi sistem Sentralogis</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 w-fit flex-wrap">
        <TabButton id="price" label="Token Price" icon={Coins} />
        <TabButton id="history" label="Price History" icon={History} />
        <TabButton id="sbu" label="SBU Token Rates" icon={Sliders} />
      </div>

      {/* Token Price Tab */}
      {activeTab === 'price' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Price Card */}
          <Card className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Coins className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Current Token Price</h3>
                  <p className="text-xs text-slate-500">Harga per token saat ini</p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-black text-slate-900 tracking-tight">
                    {formatRupiah(currentPrice)}
                  </span>
                  <span className="text-sm font-bold text-slate-400">/ token</span>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Active since {new Date().toLocaleDateString('id-ID')}</span>
              </div>
            </div>
          </Card>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card className="bg-white border-slate-200">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp size={18} className="text-emerald-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exchange Rate</span>
                </div>
                <p className="text-lg font-black text-slate-900">1 TKN = {formatRupiah(currentPrice)}</p>
              </div>
            </Card>

            <Card className="bg-amber-50 border-amber-100">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle size={18} className="text-amber-600" />
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Note</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Perubahan harga hanya berlaku untuk top-up baru. Saldo existing tidak terpengaruh.
                </p>
              </div>
            </Card>
          </div>

          {/* Update Price Form */}
          <Card className="lg:col-span-3">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Save className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Update Token Price</h3>
                  <p className="text-xs text-slate-500">Ubah harga token untuk top-up baru</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    New Price (IDR)
                  </label>
                  <Input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="1000"
                    className="text-lg font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Reason / Notes
                  </label>
                  <Input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Inflation adjustment"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleSavePrice}
                    loading={saving}
                    disabled={parseInt(newPrice) === currentPrice || !newPrice}
                    className="w-full h-12 font-bold"
                  >
                    <Save size={16} />
                    Update Price
                  </Button>
                </div>
              </div>

              {parseInt(newPrice) !== currentPrice && newPrice && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <span className="font-bold">Preview:</span> Harga akan berubah dari{' '}
                    <span className="font-black">{formatRupiah(currentPrice)}</span> menjadi{' '}
                    <span className="font-black">{formatRupiah(parseInt(newPrice) || 0)}</span>
                    {parseInt(newPrice) > currentPrice ? (
                      <span className="text-emerald-600 font-bold ml-1">↑ +{formatRupiah(parseInt(newPrice) - currentPrice)}</span>
                    ) : (
                      <span className="text-rose-600 font-bold ml-1">↓ -{formatRupiah(currentPrice - parseInt(newPrice))}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Price History Tab */}
      {activeTab === 'history' && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <History size={20} className="text-slate-500" />
              <h3 className="text-base font-bold text-slate-900">Price Change History</h3>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <History size={40} className="text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400">No price changes yet</p>
                <p className="text-xs text-slate-300 mt-1">Price history will appear here after updates</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((tx, i) => (
                  <div key={tx.id || i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        tx.new_price > tx.old_price ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                      }`}>
                        <TrendingUp size={18} className={tx.new_price > tx.old_price ? '' : 'rotate-180'} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {formatRupiah(tx.old_price)} → {formatRupiah(tx.new_price)}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(tx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          {tx.changed_by?.full_name && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <User size={12} />
                              {tx.changed_by.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {tx.reason && (
                        <p className="text-xs text-slate-500 italic max-w-[200px] truncate">{tx.reason}</p>
                      )}
                      <span className={`text-xs font-bold ${
                        tx.new_price > tx.old_price ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.new_price > tx.old_price ? '+' : ''}{formatRupiah(tx.new_price - tx.old_price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* SBU Token Rates Tab */}
      {activeTab === 'sbu' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Sliders className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">SBU Token Consumption Rates</h3>
                  <p className="text-xs text-slate-500">Atur jumlah token yang dibakar per penyelesaian Job Order per SBU</p>
                </div>
              </div>

              {sbuLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                </div>
              ) : sbuRates.length === 0 ? (
                <div className="text-center py-12">
                  <Sliders size={40} className="text-slate-200 mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-400">No rates configured</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sbuRates.map((rate) => {
                    const cfg = SBU_ICONS[rate.sbu_type] || { icon: Coins, color: 'text-slate-600', bg: 'bg-slate-50' };
                    const Icon = cfg.icon;
                    const isSaving = sbuSaving === rate.sbu_type;
                    return (
                      <div key={rate.id} className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cfg.bg} ${cfg.color}`}>
                            <Icon size={24} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{rate.sbu_type}</h4>
                            <p className="text-xs text-slate-400">Tokens per completed Job Order</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const current = parseInt(editRates[rate.sbu_type]) || 1;
                                if (current > 1) setEditRates(prev => ({ ...prev, [rate.sbu_type]: (current - 1).toString() }));
                              }}
                              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition-all"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              value={editRates[rate.sbu_type] || rate.tokens_per_jo}
                              onChange={(e) => setEditRates(prev => ({ ...prev, [rate.sbu_type]: e.target.value }))}
                              className="w-16 text-center text-lg font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-purple-500/20"
                              min="1"
                            />
                            <button
                              onClick={() => {
                                const current = parseInt(editRates[rate.sbu_type]) || 1;
                                setEditRates(prev => ({ ...prev, [rate.sbu_type]: (current + 1).toString() }));
                              }}
                              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition-all"
                            >
                              +
                            </button>
                          </div>
                          <Button
                            onClick={() => handleSaveSbuRate(rate.sbu_type)}
                            loading={isSaving}
                            disabled={parseInt(editRates[rate.sbu_type]) === rate.tokens_per_jo || !editRates[rate.sbu_type]}
                            size="sm"
                          >
                            <Save size={14} />
                            Simpan
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-amber-50 border-amber-100">
            <div className="p-5 flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-slate-900 mb-1">Informasi</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Perubahan tarif token berlaku untuk Job Order yang selesai setelah perubahan disimpan.
                  JO yang sudah selesai sebelumnya tidak terpengaruh.
                  Tarif saat ini: <strong>TRUCKING {sbuRates.find((r: any) => r.sbu_type === 'TRUCKING')?.tokens_per_jo || 2}</strong>,
                  <strong> WAREHOUSE {sbuRates.find((r: any) => r.sbu_type === 'WAREHOUSE')?.tokens_per_jo || 1}</strong>,
                  <strong> CLEARANCE {sbuRates.find((r: any) => r.sbu_type === 'CLEARANCE')?.tokens_per_jo || 2}</strong>,
                  <strong> FORWARDING {sbuRates.find((r: any) => r.sbu_type === 'FORWARDING')?.tokens_per_jo || 1}</strong> token/JO.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
