'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ScanBarcode, 
  Search, 
  Filter, 
  Loader2, 
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { createJournalEntry } from '@/lib/finance/journaling';

export default function CostAuditPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('need_approval');
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: costs, error } = await supabase
        .from('add_costs')
        .select(`
          *,
          job_orders!inner (
            id,
            jo_number,
            base_price,
            driver_share_percentage,
            driver_link_token,
            pod_status,
            transporter:transporter_id (name),
            work_orders (
              customers (
                name,
                billing_method
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(costs || []);
    } catch (err: any) {
      console.error('Fetch Error:', err);
      toast.error('Gagal mengambil data Cost Audit');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Barcode Scanner Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName !== 'INPUT' && 
        document.activeElement?.tagName !== 'TEXTAREA' &&
        e.key.length === 1 && 
        !e.ctrlKey && !e.metaKey && !e.altKey
      ) {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAction = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('add_costs')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;

      if (newStatus === 'approved') {
        const item = data.find(d => d.id === id);
        if (item) {
          const journalResult = await createJournalEntry({
            jobOrderId: item.job_order_id,
            amount: item.amount,
            description: `[AUDITED] ${item.charge_type.toUpperCase()} - ${item.cost_type.replace(/_/g, ' ')} for ${item.job_orders?.jo_number}`,
            sourceType: item.charge_type as any,
            metadata: {
              driver_share_percentage: item.job_orders?.driver_share_percentage
            }
          });

          if (journalResult.success) {
            toast.success('Jurnal otomatis berhasil dibuat');
          } else {
            console.error('Journaling failed:', journalResult.error);
            toast.error('Gagal membuat jurnal otomatis: ' + journalResult.error);
          }
        }
      }

      toast.success(`Berhasil memproses biaya (${newStatus})`);
      fetchData();
    } catch (err) {
      toast.error('Gagal memproses data');
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredData = data.filter(item => {
    const term = searchTerm.toLowerCase();
    const token = item.job_orders?.driver_link_token || '';
    const isTokenMatch = term.includes('/jo/') && term.includes(token);
    const matchesSearch = item.job_orders?.jo_number.toLowerCase().includes(term) || isTokenMatch;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleMarkPOD = async (joId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('job_orders')
        .update({ 
          pod_status: 'received_hq',
          pod_received_at: new Date().toISOString(),
          pod_received_by: user?.id
        })
        .eq('id', joId);
      if (error) throw error;
      toast.success('POD ditandai sebagai diterima HQ');
      fetchData();
    } catch (err) {
      toast.error('Gagal memperbarui status POD');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-slate-900/20 rotate-3 group hover:rotate-0 transition-transform duration-500">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">FINANCE AUDIT</h1>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
              <TrendingUp size={12} /> Verification & Clearance
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 border-slate-100 shadow-sm rounded-[2rem]">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2 flex items-center gap-2">
              <ScanBarcode size={14} className="text-blue-500" /> Scanner Ready
            </h3>
            <div className="relative mb-6 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Scan QR / Input JO..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-slate-50 border-2 border-transparent rounded-2xl text-xs font-black focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
              />
            </div>

            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Audit Queue</h3>
            <div className="space-y-2">
              {['need_approval', 'approved', 'rejected', 'all'].map((status) => {
                const count = data.filter(d => status === 'all' || d.status === status).length;
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      statusFilter === status 
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                      : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                    }`}
                  >
                    <span>{status.replace(/_/g, ' ')}</span>
                    <span className={`px-2 py-0.5 rounded-lg ${statusFilter === status ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6 space-y-3">
             <div className="flex items-center gap-2 text-blue-600">
                <AlertCircle size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Digital Validation</span>
             </div>
             <p className="text-[10px] font-bold text-blue-600 leading-relaxed uppercase tracking-wider opacity-80 italic">
                Pastikan dokumen fisik (Surat Jalan/POD) sudah dicocokkan sebelum melakukan Approve. 
             </p>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm min-h-[600px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="w-12 h-12 text-slate-200 animate-spin" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Syncing Audit Queue...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 opacity-50">
                <ShieldCheck size={64} className="mb-4 text-slate-300" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Tidak Ada Data Audit</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Job Order</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Charge / Cost Type</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Audit Sim</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Clearance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[12px]">
                    {filteredData.map((item) => {
                      const jo = item.job_orders;
                      const driverSharePct = jo?.driver_share_percentage || 0;
                      const isSurcharge = item.charge_type === 'surcharge';
                      const payout = isSurcharge ? (item.amount * driverSharePct) / 100 : item.amount;
                      const margin = isSurcharge ? (item.amount * (100 - driverSharePct)) / 100 : 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-5">
                            <p className="font-black text-slate-900 tracking-tight">{jo?.jo_number || '---'}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{jo?.transporter?.name || 'Internal Fleet'}</p>
                            <div className="mt-2 flex flex-col gap-1">
                              <Badge className={`text-[8px] font-black uppercase ${jo?.work_orders?.customers?.billing_method === 'epod' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                                {jo?.work_orders?.customers?.billing_method === 'epod' ? '⚡ E-POD BILLING' : '📄 HARDCOPY REQ'}
                              </Badge>
                              {jo?.pod_status === 'received_hq' ? (
                                <Badge className="bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase w-fit">POD RECEIVED</Badge>
                              ) : (
                                <Button 
                                  variant="ghost" 
                                  className="h-6 px-2 text-[8px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 uppercase tracking-tighter w-fit"
                                  onClick={() => handleMarkPOD(jo.id)}
                                >
                                  Mark Received
                                </Button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col items-start gap-1">
                              <Badge variant="outline" className={`text-[9px] font-black uppercase border-transparent ${isSurcharge ? 'text-blue-600 bg-blue-50' : 'text-emerald-600 bg-emerald-50'}`}>
                                {item.charge_type || 'reimbursement'}
                              </Badge>
                              <p className="text-[9px] font-bold text-slate-500 uppercase">{item.cost_type.replace(/_/g, ' ')}</p>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-black text-slate-900 italic">{formatRupiah(item.amount)}</p>
                            <p className="text-[9px] font-bold text-slate-500 truncate max-w-[150px]">{item.description || '-'}</p>
                          </td>
                          <td className="px-6 py-5">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Payout</span>
                                <span className="text-[10px] font-black text-emerald-600 italic">{formatRupiah(payout)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Margin</span>
                                <span className="text-[10px] font-black text-blue-600 italic">{formatRupiah(margin)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {item.status === 'need_approval' && <Badge className="bg-amber-100 text-amber-700 border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest">Need Audit</Badge>}
                            {item.status === 'approved' && <Badge className="bg-emerald-100 text-emerald-700 border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest">Approved</Badge>}
                            {item.status === 'rejected' && <Badge className="bg-rose-100 text-rose-700 border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest">Rejected</Badge>}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex justify-end gap-2">
                              {item.status === 'need_approval' ? (
                                <>
                                  <Button 
                                    onClick={() => handleAction(item.id, 'approved')}
                                    className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest"
                                  >
                                    <CheckCircle2 size={14} className="mr-1" /> Approve
                                  </Button>
                                  <Button 
                                    onClick={() => handleAction(item.id, 'rejected')}
                                    className="h-8 px-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest"
                                  >
                                    <XCircle size={14} className="mr-1" /> Reject
                                  </Button>
                                </>
                              ) : (
                                <p className="text-[8px] font-black text-slate-300 uppercase italic tracking-widest pr-2">Audited</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
