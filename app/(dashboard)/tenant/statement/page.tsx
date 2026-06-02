'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  FileText, Calendar, Filter, Download, 
  ArrowUpRight, ArrowDownRight, Search,
  Printer, ChevronLeft, ChevronRight, Loader2,
  TrendingUp, TrendingDown, Wallet
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/Table';
import toast, { Toaster } from 'react-hot-toast';

import { fetchTenantHistory, getLedgerStartingBalance } from '@/app/(dashboard)/owner/actions';
import { fetchTenantById } from '@/lib/actions/tenantActions';

export default function TokenStatementPage() {
  const { user, profile } = useAuth();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to first of month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [startingBalance, setStartingBalance] = useState(0);

  useEffect(() => {
    if (user && profile?.tenant_id) {
      fetchTenantAndHistory();
    }
  }, [user, profile?.tenant_id]);

  const fetchTenantAndHistory = async () => {
    setLoading(true);
    try {
      const tid = profile?.tenant_id;
      if (tid) {
        const tData = await fetchTenantById(tid);
        setTenant(tData);
        if (tData) {
          await generateStatement(tData.tenant_code);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateStatement = async (tenantCode: string) => {
    setLoading(true);
    try {
      // 1. Calculate Starting Balance (Optimized)
      const balRes = await getLedgerStartingBalance(tenantCode, startDate);
      const startBal = balRes.balance || 0;
      setStartingBalance(startBal);

      // 2. Fetch Period Transactions (Optimized - use the same action)
      const res = await fetchTenantHistory(tenantCode);
      if (!res.success) throw new Error(res.message);
      
      const periodTx = (res.data || []).filter((tx: any) => 
        tx.created_at >= startDate + 'T00:00:00Z' && tx.created_at <= endDate + 'T23:59:59Z'
      ).sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));

      // Calculate Running Balance
      let currentBal = startBal;
      const mapped = periodTx.map((tx: any) => {
        currentBal += tx.amount;
        return { ...tx, running_balance: currentBal };
      });

      setTransactions(mapped);
    } catch (err: any) {
      toast.error('Failed to generate statement: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalIn = transactions.filter(tx => tx.amount > 0).reduce((acc, tx) => acc + tx.amount, 0);
  const totalOut = transactions.filter(tx => tx.amount < 0).reduce((acc, tx) => acc + tx.amount, 0);
  const endingBalance = startingBalance + totalIn + totalOut;

  return (
    <div className="space-y-10 animate-slide-up pb-20 print:p-0 print:space-y-6">
      <style jsx global>{`
        @media print {
          body { background: white !important; }
          .no-print, nav, aside, button, .print-hidden { display: none !important; }
          .print-only { display: block !important; }
          .card { border: 1px solid #eee !important; box-shadow: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #ddd !important; padding: 8px !important; font-size: 10pt !important; }
          .bg-slate-900 { background-color: #f8fafc !important; color: black !important; border: 1px solid #ddd !important; }
          .text-white { color: black !important; }
          @page { margin: 1.5cm; }
        }
        .print-only { display: none; }
      `}</style>
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:flex-row print:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Token Statement Ledger</h1>
          <p className="text-sm font-medium text-slate-500">Official audit trail for <span className="text-blue-600 font-bold">{tenant?.name}</span></p>
        </div>
        <div className="flex items-center gap-3 no-print">
            <Button variant="secondary" className="gap-2" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
              Print Report
           </Button>
           <Button className="gap-2 !bg-slate-900">
              <Download className="w-4 h-4" />
              Export CSV
           </Button>
        </div>
      </div>

      {/* Summary Section - Visible in print too */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
         <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl print:p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Opening Balance</p>
            <h3 className="text-xl font-black text-slate-900">{startingBalance.toLocaleString('id-ID')}</h3>
         </div>
         <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl print:p-4">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Credit</p>
            <h3 className="text-xl font-black text-emerald-700">+{totalIn.toLocaleString('id-ID')}</h3>
         </div>
         <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl print:p-4">
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Total Debit</p>
            <h3 className="text-xl font-black text-rose-700">{totalOut.toLocaleString('id-ID')}</h3>
         </div>
         <div className="p-6 bg-blue-900 border border-blue-950 rounded-2xl text-white print:bg-slate-100 print:text-black print:p-4">
            <p className="text-[10px] font-black text-blue-300 print:text-slate-500 uppercase tracking-widest mb-1">Final Balance</p>
            <h3 className="text-xl font-black">{endingBalance.toLocaleString('id-ID')}</h3>
         </div>
      </div>

      {/* Filters Card - Hidden in Print */}
      <Card className="border-slate-100 shadow-sm no-print">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-end gap-6">
             <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <Input label="Statement From" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} icon={<Calendar className="w-4 h-4 text-slate-400" />} />
                <Input label="Statement To" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} icon={<Calendar className="w-4 h-4 text-slate-400" />} />
             </div>
             <Button onClick={() => generateStatement(tenant?.tenant_code)} loading={loading} className="!px-10 !bg-blue-600" icon={<Filter className="w-4 h-4" />}>Sync Ledger</Button>
          </div>
        </CardContent>
      </Card>

      {/* Statement Table */}
      <Card className="overflow-hidden border-slate-100 shadow-xl print:border-slate-300 print:shadow-none">
         <div className="bg-slate-900 px-6 py-4 flex justify-between items-center print:bg-slate-100 print:border-b">
            <h3 className="text-xs font-black text-white print:text-black uppercase tracking-[0.2em] italic">Transaction Detail Statement</h3>
            <div className="text-[9px] font-bold text-slate-400 print:text-slate-600 uppercase">Period: {startDate} to {endDate}</div>
         </div>
         <Table>
            <TableHeader className="bg-slate-50">
               <TableRow>
                  <TableHead className="w-40 font-bold uppercase text-[10px]">Date & Time</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Description / Reference</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px] text-emerald-600">Credit (+)</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px] text-rose-600">Debit (-)</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px]">Balance</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
               <TableRow className="bg-slate-50/50 italic">
                  <TableCell className="font-bold text-slate-400">{new Date(startDate).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Opening Balance</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right font-black text-slate-900">{startingBalance.toLocaleString('id-ID')}</TableCell>
               </TableRow>
               
               {transactions.length > 0 ? transactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-slate-50 transition-colors">
                     <TableCell className="text-xs font-medium text-slate-500 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString('id-ID')}
                        <span className="block text-[10px] opacity-60">{new Date(tx.created_at).toLocaleTimeString('id-ID')}</span>
                     </TableCell>
                     <TableCell>
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg no-print ${tx.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              {tx.amount > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                           </div>
                           <div>
                              <p className="text-sm font-bold text-slate-900 tracking-tight">{tx.description}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tx.transaction_type}</p>
                           </div>
                        </div>
                     </TableCell>
                     <TableCell className="text-right font-black text-emerald-600 italic">
                        {tx.amount > 0 ? `+${tx.amount.toLocaleString('id-ID')}` : '-'}
                     </TableCell>
                     <TableCell className="text-right font-black text-rose-600 italic">
                        {tx.amount < 0 ? tx.amount.toLocaleString('id-ID') : '-'}
                     </TableCell>
                     <TableCell className="text-right font-black text-slate-900 bg-slate-50/30">
                        {tx.running_balance.toLocaleString('id-ID')}
                     </TableCell>
                  </TableRow>
               )) : (
                  <TableRow>
                     <TableCell colSpan={5} className="py-20 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">No activity detected</p>
                     </TableCell>
                  </TableRow>
               )}

               <TableRow className="bg-slate-900 text-white font-black italic print:bg-slate-50 print:text-black">
                  <TableCell colSpan={2} className="uppercase tracking-widest text-[10px]">Closing Statement Summary</TableCell>
                  <TableCell className="text-right text-emerald-400 print:text-emerald-700">+{totalIn.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right text-rose-400 print:text-rose-700">{totalOut.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right text-blue-300 print:text-blue-900 underline underline-offset-4">{endingBalance.toLocaleString('id-ID')}</TableCell>
               </TableRow>
            </TableBody>
         </Table>
      </Card>
    </div>
  );
}
