'use client';

import React from 'react';
import { 
  Edit2, 
  Trash2, 
  Send, 
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingDown,
  Receipt
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AddCostTableProps {
  data: any[];
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onSubmit: (id: string) => void;
}

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'draft': 
      return <Badge className="bg-amber-100 text-amber-700 border-none px-3 py-1 font-black text-[10px] uppercase tracking-widest"><Clock size={10} className="mr-1" /> Draft</Badge>;
    case 'need_approval': 
      return <Badge className="bg-blue-100 text-blue-700 border-none px-3 py-1 font-black text-[10px] uppercase tracking-widest"><AlertCircle size={10} className="mr-1" /> Need Approval</Badge>;
    case 'approved': 
      return <Badge className="bg-emerald-100 text-emerald-700 border-none px-3 py-1 font-black text-[10px] uppercase tracking-widest"><CheckCircle2 size={10} className="mr-1" /> Approved</Badge>;
    case 'rejected': 
      return <Badge className="bg-rose-100 text-rose-700 border-none px-3 py-1 font-black text-[10px] uppercase tracking-widest"><XCircle size={10} className="mr-1" /> Rejected</Badge>;
    default: 
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function AddCostTable({ data, onEdit, onDelete, onSubmit }: AddCostTableProps) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Job Order</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Charge Type</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount (Rp)</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cost Detail</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vendor Inv.</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-[12px]">
            {data.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center opacity-30">
                    <AlertCircle size={40} className="mb-4 text-slate-300" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Belum ada data Add Cost</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const dealPrice = item.job_orders?.wo_items?.item_data?.deal_price || 0;
                const purchasePrice = item.job_orders?.purchase_price || 0;
                const margin = dealPrice - purchasePrice;
                const marginPercent = dealPrice > 0 ? (margin / dealPrice) * 100 : 0;
                
                let marginStatus = "MARGIN AMAN";
                let marginColor = "text-emerald-500 bg-emerald-50";
                if (marginPercent <= 5) {
                  marginStatus = "MARGIN KRITIS";
                  marginColor = "text-rose-500 bg-rose-50";
                } else if (marginPercent <= 15) {
                  marginStatus = "MARGIN TIPIS";
                  marginColor = "text-amber-500 bg-amber-50";
                }

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <p className="font-black text-slate-900 tracking-tight">{item.job_orders?.jo_number || '---'}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.job_orders?.transporter?.name || 'Internal Fleet'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="outline" className={`text-[9px] font-black uppercase border-transparent ${item.charge_type === 'surcharge' ? 'text-blue-600 bg-blue-50' : 'text-emerald-600 bg-emerald-50'}`}>
                          {item.charge_type || 'reimbursement'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-black text-slate-900 italic">{formatRupiah(item.amount)}</p>
                    </td>
                    <td className="px-6 py-5">
                      <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200 text-slate-500 bg-white mb-1">
                        {item.cost_type.replace(/_/g, ' ')}
                      </Badge>
                      <p className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">{item.description || '-'}</p>
                    </td>
                    <td className="px-6 py-5">
                      {item.job_orders?.vendor_invoice_amount > 0 ? (
                      <div className="flex items-center gap-1.5 text-amber-600 font-bold italic">
                        <Receipt size={12} />
                        {formatRupiah(item.job_orders.vendor_invoice_amount)}
                      </div>
                    ) : (
                      <span className="text-slate-300 italic">Belum masuk</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.status === 'draft' && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 rounded-lg text-blue-600 hover:bg-blue-50"
                            onClick={() => onSubmit(item.id)}
                          >
                            <Send size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 rounded-lg text-slate-600 hover:bg-slate-100"
                            onClick={() => onEdit(item)}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 rounded-lg text-rose-600 hover:bg-rose-50"
                            onClick={() => onDelete(item.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                      {item.status !== 'draft' && (
                         <p className="text-[8px] font-black text-slate-300 uppercase italic tracking-widest pr-2">Locked</p>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
