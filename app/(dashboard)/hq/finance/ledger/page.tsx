'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  Search, 
  Loader2, 
  FileSpreadsheet,
  Database,
  Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function LedgerPage() {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchJournals = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('finance_journals')
        .select(`
          *,
          job_orders (jo_number),
          entries:finance_journal_entries (
            *,
            account:finance_coa (account_name, account_number)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJournals(data || []);
    } catch (err: any) {
      console.error('Fetch Error:', err);
      toast.error('Gagal mengambil data Ledger');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredJournals = journals.filter(j => 
    j.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.job_orders?.jo_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-slate-900/20 rotate-3 group hover:rotate-0 transition-transform duration-500">
            <BookOpen size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">INTERNAL LEDGER</h1>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
              <Database size={12} /> Double-Entry Draft Records
            </p>
          </div>
        </div>
      </div>

      <Card className="p-6 border-slate-100 shadow-sm rounded-[2rem]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari deskripsi atau JO..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-slate-50 border-transparent rounded-2xl text-xs font-black focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
             <Badge className="bg-emerald-100 text-emerald-700 border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest flex items-center gap-1">
                <FileSpreadsheet size={10} /> Ready for Mekari Sync
             </Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-12 h-12 text-slate-200 animate-spin" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Syncing Ledger Data...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredJournals.map((journal) => (
              <div key={journal.id} className="border border-slate-100 rounded-3xl overflow-hidden group hover:border-slate-200 transition-all">
                <div className="bg-slate-50/50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                       <Calendar size={18} />
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{journal.transaction_date}</p>
                      <h4 className="text-sm font-black text-slate-900 uppercase italic leading-tight">{journal.description}</h4>
                      <div className="mt-1 flex items-center gap-2">
                         <span className="text-[10px] font-bold text-slate-500">JO: {journal.job_orders?.jo_number || 'N/A'}</span>
                         <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter h-4">{journal.source_type}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Transaction</p>
                    <p className="text-xl font-black text-slate-900 italic tracking-tight">{formatRupiah(journal.total_amount)}</p>
                  </div>
                </div>

                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white border-b border-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Account</th>
                        <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Debit</th>
                        <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {journal.entries?.map((entry: any) => (
                        <tr key={entry.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className={`flex items-center gap-3 ${entry.credit > 0 ? 'pl-8' : ''}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${entry.debit > 0 ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                              <div>
                                <p className="text-[10px] font-black text-slate-900 uppercase">{entry.account?.account_name}</p>
                                <p className="text-[8px] font-bold text-slate-400">{entry.account?.account_number}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {entry.debit > 0 ? (
                              <span className="text-xs font-black text-slate-900">{formatRupiah(entry.debit)}</span>
                            ) : <span className="text-slate-200">-</span>}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {entry.credit > 0 ? (
                              <span className="text-xs font-black text-slate-900">{formatRupiah(entry.credit)}</span>
                            ) : <span className="text-slate-200">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
