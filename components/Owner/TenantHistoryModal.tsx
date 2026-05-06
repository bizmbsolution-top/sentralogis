'use client';

import { useState, useEffect } from 'react';
import { 
  History, X, Coins, ArrowUpRight, ArrowDownRight, 
  Calendar, MessageSquare, Loader2, Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { fetchTenantHistory } from '@/app/(dashboard)/owner/actions';

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

interface TenantHistoryModalProps {
  isOpen: boolean;
  tenant: { tenant_code: string; name: string } | null;
  onClose: () => void;
}

export default function TenantHistoryModal({ isOpen, tenant, onClose }: TenantHistoryModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && tenant) {
      fetchHistory();
    }
  }, [isOpen, tenant]);

  const fetchHistory = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const res = await fetchTenantHistory(tenant.tenant_code);
      if (!res.success) throw new Error(res.message);
      setTransactions(res.data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !tenant) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
              <History size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Token Milestones</h3>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{tenant.name} • {tenant.tenant_code}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Accessing Audit Logs...</p>
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-6">
              {transactions.map((tx) => (
                <div key={tx.id} className="relative pl-8 pb-6 last:pb-0">
                  {/* Timeline Line */}
                  <div className="absolute left-[11px] top-2 bottom-0 w-[2px] bg-slate-100 last:hidden" />
                  
                  {/* Timeline Dot */}
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 ${
                    tx.transaction_type === 'TOPUP' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}>
                    {tx.transaction_type === 'TOPUP' ? <ArrowUpRight size={10} className="text-white" /> : <ArrowDownRight size={10} className="text-white" />}
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:border-slate-200 transition-all group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-black italic tracking-tight ${
                          tx.transaction_type === 'TOPUP' ? 'text-emerald-600' : 'text-blue-600'
                        }`}>
                          {tx.transaction_type === 'TOPUP' ? '+' : '-'}{tx.amount.toLocaleString()} <span className="text-[10px] uppercase not-italic opacity-60">TKN</span>
                        </span>
                        <Badge variant={tx.transaction_type === 'TOPUP' ? 'success' : 'info'} className="text-[9px] font-black uppercase tracking-widest italic">
                          {tx.transaction_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Calendar size={12} />
                        {new Date(tx.created_at).toLocaleDateString('id-ID')}
                        <Clock size={12} className="ml-2" />
                        {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-white/50 border border-slate-100 rounded-xl p-3">
                      <MessageSquare size={14} className="text-slate-400 mt-0.5 shrink-0" />
                      <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                        {tx.description || 'No remarks provided.'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-4">
                <Coins size={32} />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Milestones Recorded</p>
              <p className="text-xs text-slate-500 mt-1">This node cluster has no transaction history yet.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
          >
            Close Logs
          </button>
        </div>
      </div>
    </div>
  );
}
