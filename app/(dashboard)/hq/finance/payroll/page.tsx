'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  CreditCard,
  Search,
  Filter,
  Download,
  AlertCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabaseClient';
import { toast, Toaster } from 'react-hot-toast';

export default function DriverPayrollPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const { data: jobs, error } = await supabase
        .from('job_orders')
        .select(`
          id, jo_number, status, completed_at,
          purchase_price, driver_revenue_share,
          md_drivers:driver_id (
            id, name, bank_name, bank_account_number, bank_account_name
          )
        `)
        .eq('status', 'ready_for_billing')
        .order('completed_at', { ascending: false });

      if (error) throw error;

      // Group by Driver
      const grouped = jobs?.reduce((acc: any, curr: any) => {
        const driverId = curr.md_drivers?.id || 'unassigned';
        if (!acc[driverId]) {
          acc[driverId] = {
            driver: curr.md_drivers,
            totalJobs: 0,
            totalPayout: 0,
            jobs: []
          };
        }
        acc[driverId].totalJobs += 1;
        acc[driverId].totalPayout += Number(curr.driver_revenue_share || curr.purchase_price) || 0;
        acc[driverId].jobs.push(curr);
        return acc;
      }, {});

      setData(Object.values(grouped || {}));
    } catch (err: any) {
      toast.error('Gagal memuat data payroll');
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-700">
      <Toaster position="top-right" />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-600/30">
              <Users size={32} />
           </div>
           <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">DRIVER PAYROLL SYNC</h1>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em] mt-1 italic">Internal Asset Settlement & Distribution</p>
           </div>
        </div>
        <Button className="h-14 px-8 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20">
          <Download size={18} className="mr-2" /> Export Bank CSV (BCA/Mandiri)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="space-y-6">
           <Card className="p-6 border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Quick Search</h3>
              <div className="relative mb-6">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                   type="text" 
                   placeholder="Search Driver Name..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full h-12 pl-12 pr-4 bg-slate-50 border-none rounded-xl text-xs font-black focus:bg-white outline-none ring-2 ring-transparent focus:ring-blue-100 transition-all"
                 />
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                 <AlertCircle className="text-amber-600 shrink-0" size={18} />
                 <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase italic">
                    Data hanya mencakup Job Order dengan status "Ready for Billing".
                 </p>
              </div>
           </Card>

           <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/20">
              <CreditCard size={24} className="text-blue-400 mb-4" />
              <h4 className="text-xs font-black uppercase tracking-widest mb-2 italic">Cashless Distribution</h4>
              <p className="text-[10px] font-bold opacity-60 leading-relaxed uppercase">
                Synchronize driver share with internal bank account records for batch disbursement.
              </p>
           </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
           {loading ? (
             <div className="py-40 flex flex-col items-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic animate-pulse">Calculating Share Distribution...</p>
             </div>
           ) : data.length === 0 ? (
             <Card className="py-24 text-center border-4 border-dashed border-slate-100 rounded-[3.5rem]">
                <p className="text-xs font-black text-slate-300 uppercase tracking-widest italic">No pending payroll found</p>
             </Card>
           ) : (
             data.map((group, idx) => (
               <Card key={idx} className="p-8 border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white group hover:scale-[1.01] transition-transform duration-300">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                     <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center font-black text-xl">
                           {group.driver?.name?.[0] || '?'}
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">{group.driver?.name || 'Unknown Driver'}</h3>
                           <div className="flex items-center gap-3 mt-1">
                              <Badge className="bg-blue-50 text-blue-600 text-[8px] font-black uppercase border-none">{group.totalJobs} Missions</Badge>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                                 {group.driver?.bank_name || 'No Bank Info'} • {group.driver?.bank_account_number || '-'}
                              </p>
                           </div>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Net Payout</p>
                        <p className="text-3xl font-black text-emerald-600 tracking-tighter">{formatRupiah(group.totalPayout)}</p>
                        <Button className="mt-3 h-10 px-6 bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 group-hover:bg-emerald-600 transition-all">
                           Release Fund <ArrowRight size={14} />
                        </Button>
                     </div>
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-slate-50 grid grid-cols-2 md:grid-cols-4 gap-4">
                     {group.jobs.map((job: any, jidx: number) => (
                        <div key={jidx} className="p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{job.jo_number}</p>
                           <p className="text-[11px] font-black text-slate-900 italic">{formatRupiah(job.driver_revenue_share || job.purchase_price)}</p>
                        </div>
                     ))}
                  </div>
               </Card>
             ))
           )}
        </div>
      </div>
    </div>
  );
}
