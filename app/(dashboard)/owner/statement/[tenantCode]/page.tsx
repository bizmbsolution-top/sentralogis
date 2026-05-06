'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useParams } from 'next/navigation';
import { 
  FileText, Calendar, Filter, Download, 
  ArrowUpRight, ArrowDownRight, Printer, Loader2,
  TrendingUp, TrendingDown, Wallet, Building2
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableRow, TableHead, TableCell, TableBody } from '@/components/ui/Table';
import { fetchTenantHistory, getLedgerStartingBalance } from '@/app/(dashboard)/owner/actions';
import toast, { Toaster } from 'react-hot-toast';

export default function OwnerTenantStatementPage() {
  const params = useParams();
  const tenantCode = params.tenantCode as string;
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [startingBalance, setStartingBalance] = useState(0);

  useEffect(() => {
    if (tenantCode) {
      fetchTenantAndHistory();
    }
  }, [tenantCode]);

  const fetchTenantAndHistory = async () => {
    setLoading(true);
    try {
      const { data: tData } = await supabase.from('tenants').select('*').eq('tenant_code', tenantCode).single();
      setTenant(tData);
      if (tData) {
        await generateStatement(tData.tenant_code);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateStatement = async (tCode: string) => {
    setLoading(true);
    try {
      // 1. Calculate Starting Balance (Optimized)
      const balRes = await getLedgerStartingBalance(tCode, startDate);
      const startBal = balRes.balance || 0;
      setStartingBalance(startBal);

      // 2. Fetch Period Transactions (Optimized)
      const res = await fetchTenantHistory(tCode);
      if (!res.success) throw new Error(res.message);
      
      const periodTx = (res.data || []).filter((tx: any) => 
        tx.created_at >= startDate + 'T00:00:00Z' && tx.created_at <= endDate + 'T23:59:59Z'
      ).sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));

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
          .card { border: 1px solid #eee !important; box-shadow: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #ddd !important; padding: 8px !important; font-size: 10pt !important; }
          .bg-slate-900 { background-color: #f8fafc !important; color: black !important; border: 1px solid #ddd !important; }
          .text-white { color: black !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
      <Toaster position="top-right" />
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:flex-row print:items-center">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl print:bg-slate-100 print:text-black">
              <Building2 size={32} />
           </div>
           <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Ledger Statement: {tenant?.name}</h1>
              <p className="text-sm font-medium text-slate-500">Official token accountability report for node <span className="text-blue-600 font-bold">{tenantCode}</span></p>
           </div>
        </div>
        <div className="flex items-center gap-3 no-print">
           <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="w-4 h-4" />
              Print
           </Button>
        </div>
      </div>

      <Card className="border-slate-100 shadow-sm no-print">
        <CardContent className="p-6 flex flex-col md:flex-row items-end gap-6">
             <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <Input label="Period From" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                <Input label="Period To" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
             </div>
             <Button onClick={() => generateStatement(tenantCode)} loading={loading} className="!bg-blue-600">Filter Ledger</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
         <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl print:p-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Opening</p>
            <h3 className="text-xl font-black">{startingBalance.toLocaleString('id-ID')}</h3>
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

      <Card className="overflow-hidden print:border-slate-300">
         <div className="bg-slate-900 px-6 py-4 flex justify-between items-center print:bg-slate-100 print:border-b">
            <h3 className="text-xs font-black text-white print:text-black uppercase tracking-[0.2em] italic">Transaction Detail Statement</h3>
            <div className="text-[9px] font-bold text-slate-400 print:text-slate-600 uppercase">Period: {startDate} to {endDate}</div>
         </div>
         <Table>
            <TableHeader className="bg-slate-50">
               <TableRow>
                  <TableHead className="w-40 font-bold uppercase text-[10px]">Timestamp</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Narration</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px]">Credit</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px]">Debit</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px]">Balance</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody>
               <TableRow className="bg-slate-50/50 italic">
                  <TableCell className="font-medium text-slate-400">{startDate}</TableCell>
                  <TableCell className="font-bold text-slate-600">OPENING BALANCE</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right font-bold">{startingBalance.toLocaleString('id-ID')}</TableCell>
               </TableRow>
               {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                     <TableCell className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleString('id-ID')}</TableCell>
                     <TableCell className="text-sm font-medium">{tx.description}</TableCell>
                     <TableCell className="text-right text-emerald-600 font-bold">{tx.amount > 0 ? `+${tx.amount.toLocaleString('id-ID')}` : '-'}</TableCell>
                     <TableCell className="text-right text-rose-600 font-bold">{tx.amount < 0 ? tx.amount.toLocaleString('id-ID') : '-'}</TableCell>
                     <TableCell className="text-right font-black">{tx.running_balance.toLocaleString('id-ID')}</TableCell>
                  </TableRow>
               ))}
               <TableRow className="bg-slate-900 text-white font-black italic print:bg-slate-50 print:text-black">
                  <TableCell colSpan={2} className="uppercase tracking-widest text-[10px]">Closing Summary</TableCell>
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
