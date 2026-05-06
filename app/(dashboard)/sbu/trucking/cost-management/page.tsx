'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Banknote, 
  Search, 
  Filter, 
  Loader2, 
  Wallet,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ExternalLink,
  CreditCard,
  Building2,
  User,
  Image as ImageIcon,
  Send,
  Receipt
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast, Toaster } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SBUCostManagementPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'driver' | 'vendor'>('driver');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch Job Orders with status accepted/in_progress that need payment
      const { data: jos, error } = await supabase
        .from('job_orders')
        .select(`
          *,
          drivers:driver_id (*),
          transporter:md_entities!transporter_id (name),
          wo_items:wo_item_id (*)
        `)
        .in('status', ['accepted', 'in_progress', 'completed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(jos || []);
    } catch (err: any) {
      toast.error('Gagal memuat data pembayaran');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleMarkAsPaid = async (item: any) => {
    try {
      setUploading(true);
      const { error } = await supabase
        .from('job_orders')
        .update({ 
          billing_status: 'paid',
          // In a real app, we would also update a separate payments table
        })
        .eq('id', item.id);

      if (error) throw error;
      toast.success('Pembayaran berhasil dikonfirmasi');
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      toast.error('Gagal memperbarui status');
    } finally {
      setUploading(false);
    }
  };

  const filteredData = data.filter(item => {
    const isVendor = !!item.transporter_id;
    const isDriver = !item.transporter_id;
    const matchesTab = activeTab === 'driver' ? isDriver : isVendor;
    const matchesSearch = item.jo_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.drivers?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen bg-[#F8FAFC]">
      <Toaster position="top-right" />
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-slate-900/20 rotate-3 group hover:rotate-0 transition-transform duration-500">
            <Banknote size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Cost Management</h1>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
              <CreditCard size={12} /> Disbursement & Payout Console
            </p>
          </div>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setActiveTab('driver')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'driver' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Driver Payouts
          </button>
          <button 
            onClick={() => setActiveTab('vendor')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'vendor' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Vendor Payments
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Sidebar Filters */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 border-slate-100 shadow-sm rounded-[2rem] bg-white">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Quick Search</h3>
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search JO or Name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-slate-50 border-transparent rounded-2xl text-xs font-black focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
              />
            </div>

            <div className="bg-slate-900 rounded-[2rem] p-6 text-white overflow-hidden relative group">
               <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <Wallet size={120} />
               </div>
               <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Total Outstanding</p>
               <h4 className="text-2xl font-black italic tracking-tighter">
                  {formatRupiah(filteredData.reduce((acc, curr) => acc + (activeTab === 'driver' ? (curr.base_price * (curr.driver_share_percentage / 100)) : curr.purchase_price), 0))}
               </h4>
               <div className="mt-4 flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[8px] font-black uppercase tracking-widest">
                     {filteredData.length} Items Pending
                  </Badge>
               </div>
            </div>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="w-12 h-12 text-slate-200 animate-spin" />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Scanning Disbursement Requests...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-100 p-20 flex flex-col items-center justify-center text-center">
               <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={40} className="text-slate-200" />
               </div>
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">All Clear</h3>
               <p className="text-xs text-slate-300 font-bold mt-2">No pending payments for {activeTab}s.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredData.map((item) => {
                const payoutAmount = activeTab === 'driver' 
                  ? (item.base_price * (item.driver_share_percentage / 100))
                  : item.purchase_price;

                return (
                  <div key={item.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all group">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                       <div className="flex gap-6">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${activeTab === 'driver' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                             {activeTab === 'driver' ? <User size={24} /> : <Building2 size={24} />}
                          </div>
                          <div className="space-y-1">
                             <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-slate-200 italic">
                                   {item.jo_number}
                                </Badge>
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">{new Date(item.created_at).toLocaleDateString()}</span>
                             </div>
                             <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                             {activeTab === 'driver' ? item.drivers?.name : item.transporter?.name}
                             </h3>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} className="text-amber-500" /> Status: {item.status.replace(/_/g, ' ')}
                             </p>
                          </div>
                       </div>

                       <div className="flex flex-col items-end justify-center">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Amount to Pay</p>
                          <h4 className="text-2xl font-black text-slate-900 italic tracking-tighter">
                             {formatRupiah(payoutAmount)}
                          </h4>
                          {activeTab === 'driver' && (
                             <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1">
                                {item.driver_share_percentage}% of {formatRupiah(item.base_price)}
                             </p>
                          )}
                       </div>

                       <div className="flex items-center gap-3 border-l border-slate-100 pl-6">
                          <Button 
                            onClick={() => setSelectedItem(item)}
                            className="h-14 px-8 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-slate-900/10 transition-all flex items-center gap-2"
                          >
                             Process <ArrowUpRight size={14} />
                          </Button>
                       </div>
                    </div>

                    {/* Bank Info Reveal on Hover */}
                    <div className="mt-6 pt-6 border-t border-slate-50 flex flex-wrap gap-8 opacity-40 group-hover:opacity-100 transition-opacity">
                       <div className="flex items-center gap-3">
                          <CreditCard size={14} className="text-slate-400" />
                          <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bank Name</p>
                             <p className="text-[10px] font-black text-slate-700 uppercase italic">{item.drivers?.bank_name || item.transporter?.bank_name || '-'}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <Receipt size={14} className="text-slate-400" />
                          <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Account Number</p>
                             <p className="text-[10px] font-black text-slate-700 uppercase italic">{item.drivers?.bank_account_number || item.transporter?.bank_account_number || '-'}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <User size={14} className="text-slate-400" />
                          <div>
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Beneficiary Name</p>
                             <p className="text-[10px] font-black text-slate-700 uppercase italic">{item.drivers?.bank_account_name || item.transporter?.bank_account_name || '-'}</p>
                          </div>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                 <div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tight leading-none">Execute Payment</h3>
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-2">Authorization Routine</p>
                 </div>
                 <button onClick={() => setSelectedItem(null)} className="w-12 h-12 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                    <Clock size={24} className="rotate-45" />
                 </button>
              </div>

              <div className="p-8 space-y-6">
                 <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 flex justify-between items-center">
                    <div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Disbursement</p>
                       <h4 className="text-3xl font-black text-slate-900 italic tracking-tighter">
                          {formatRupiah(activeTab === 'driver' 
                            ? (selectedItem.base_price * (selectedItem.driver_share_percentage / 100))
                            : selectedItem.purchase_price)}
                       </h4>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reference</p>
                       <p className="text-sm font-black text-slate-900 italic uppercase">{selectedItem.jo_number}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center gap-4 p-5 rounded-2xl bg-blue-50 border border-blue-100">
                       <CreditCard className="text-blue-600" />
                       <div className="flex-1">
                          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Destination Account</p>
                          <p className="text-xs font-black text-blue-900 uppercase italic">
                             {selectedItem.drivers?.bank_name} - {selectedItem.drivers?.bank_account_number}
                          </p>
                          <p className="text-[10px] font-bold text-blue-700 uppercase italic opacity-60">
                             A/N {selectedItem.drivers?.bank_account_name}
                          </p>
                       </div>
                       <Button variant="ghost" className="text-blue-600 hover:bg-blue-100 rounded-xl font-black text-[10px] uppercase">
                          Copy
                       </Button>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Upload Transfer Receipt (TR)</label>
                       <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 transition-all cursor-pointer">
                          <ImageIcon className="text-slate-300" size={32} />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Click to upload .JPG or .PDF</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <Button 
                      variant="ghost" 
                      onClick={() => setSelectedItem(null)}
                      className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400"
                    >
                       Cancel
                    </Button>
                    <Button 
                      disabled={uploading}
                      onClick={() => handleMarkAsPaid(selectedItem)}
                      className="flex-[2] h-16 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-slate-900/20"
                    >
                       {uploading ? <Loader2 className="animate-spin" size={18} /> : (
                         <span className="flex items-center gap-2">
                            <Send size={14} /> Confirm & Mark as Paid
                         </span>
                       )}
                    </Button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
