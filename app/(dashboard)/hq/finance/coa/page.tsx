'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Loader2, 
  Settings2,
  AlertCircle,
  Hash,
  Briefcase,
  Layers,
  ChevronRight,
  X,
  FileText,
  Wallet
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast, Toaster } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

const JURNAL_CATEGORIES = [
  'Cash & Bank',
  'Accounts Receivable',
  'Inventory',
  'Other Current Asset',
  'Fixed Asset',
  'Other Asset',
  'Accounts Payable',
  'Other Current Liability',
  'Long Term Liability',
  'Equity',
  'Revenue',
  'Cost of Sales',
  'Expense',
  'Other Expense'
];

export default function MasterCOAPage() {
  const [coa, setCoa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    account_number: '',
    account_name: '',
    category: 'Cash & Bank',
    parent_id: '',
    is_header: false,
    description: '',
    starting_balance: 0,
    is_active: true
  });

  const fetchCoa = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('finance_coa')
        .select('*')
        .order('account_number', { ascending: true });

      if (error) throw error;
      setCoa(data || []);
    } catch (err: any) {
      toast.error('Gagal mengambil data CoA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoa();
  }, [fetchCoa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        account_number: formData.account_number,
        account_name: formData.account_name,
        category: formData.category,
        parent_id: formData.parent_id || null,
        is_header: formData.is_header,
        description: formData.description,
        starting_balance: Number(formData.starting_balance) || 0,
        is_active: formData.is_active
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('finance_coa')
          .update(payload)
          .eq('id', editingAccount.id);
        if (error) throw error;
        toast.success('Account updated successfully');
      } else {
        const { error } = await supabase
          .from('finance_coa')
          .insert([payload]);
        if (error) throw error;
        toast.success('Account created successfully');
      }
      setIsModalOpen(false);
      setEditingAccount(null);
      resetForm();
      fetchCoa();
    } catch (err: any) {
      toast.error(err.message || 'Error saving account');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      account_number: '',
      account_name: '',
      category: 'Cash & Bank',
      parent_id: '',
      is_header: false,
      description: '',
      starting_balance: 0,
      is_active: true
    });
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const filteredCoa = coa.filter(a => 
    a.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.account_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto min-h-screen animate-slide-up">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-slate-900/20 rotate-3 group hover:rotate-0 transition-transform duration-500">
            <Settings2 size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">MASTER COA</h1>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
              <Layers size={12} /> Jurnal.id Compatible Schema
            </p>
          </div>
        </div>
        <Button 
          onClick={() => { setEditingAccount(null); resetForm(); setIsModalOpen(true); }}
          className="!bg-slate-900 !px-8 !py-6 rounded-2xl shadow-xl shadow-slate-900/10 gap-3 group"
          icon={<Plus className="group-hover:rotate-90 transition-transform" size={20} />}
        >
          Add New Account
        </Button>
      </div>

      <Card className="p-8 border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari kode atau nama akun..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-slate-50 border-transparent rounded-2xl text-xs font-black focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none italic"
            />
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-3 flex items-center gap-3">
             <AlertCircle size={16} className="text-blue-600" />
             <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider italic">
                Mapping sesuai standar Jurnal.id untuk kemudahan sinkronisasi API.
             </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-12 h-12 text-slate-200 animate-spin" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Syncing Ledger Definitions...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Code & Category</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Account Name</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Balance</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCoa.map((item) => {
                  const isChild = !!item.parent_id;
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/30 transition-colors group ${item.is_header ? 'bg-slate-50/20' : ''}`}>
                      <td className="px-8 py-6">
                        <div className={`flex items-center gap-4 ${isChild ? 'pl-8 border-l-2 border-slate-100 ml-4' : ''}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                            item.is_header ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                          }`}>
                             {item.is_header ? <Layers size={18} /> : <Hash size={18} />}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 tracking-tight">{item.account_number}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className={`text-sm font-black uppercase italic tracking-tight ${item.is_header ? 'text-slate-900' : 'text-slate-600'}`}>
                          {item.account_name}
                        </p>
                        {item.description && <p className="text-[9px] text-slate-400 truncate max-w-[200px] italic">{item.description}</p>}
                      </td>
                      <td className="px-8 py-6">
                         <p className="text-sm font-black text-slate-900 italic">{formatRupiah(item.starting_balance || 0)}</p>
                         <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Opening Balance</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${item.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${item.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => { setEditingAccount(item); setFormData({ ...item, parent_id: item.parent_id || '' }); setIsModalOpen(true); }}
                          className="px-4 py-2 bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Edit Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl"><Briefcase size={28}/></div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">{editingAccount ? 'Update Account' : 'New Account Information'}</h2>
                    <p className="text-xs font-medium text-slate-500">Mapping hierarchical ledger node to Jurnal.id standard.</p>
                  </div>
               </div>
               <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-100 shadow-sm"><X size={24}/></button>
            </div>

            <form onSubmit={handleSubmit} className="p-12 space-y-8 overflow-y-auto">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <Input 
                      label="Account Name" 
                      required
                      value={formData.account_name}
                      onChange={e => setFormData({...formData, account_name: e.target.value})}
                      placeholder="e.g. Piutang Usaha"
                      icon={<Briefcase className="w-4 h-4 text-slate-400"/>}
                    />
                    
                    <Input 
                      label="Account Number" 
                      required
                      value={formData.account_number}
                      onChange={e => setFormData({...formData, account_number: e.target.value})}
                      placeholder="e.g. 1-11135"
                      icon={<Hash className="w-4 h-4 text-slate-400"/>}
                    />

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Category</label>
                      <select 
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full h-12 px-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-slate-900/5 appearance-none"
                      >
                        {JURNAL_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Account (Details)</label>
                      <select 
                        value={formData.parent_id}
                        onChange={e => setFormData({...formData, parent_id: e.target.value})}
                        className="w-full h-12 px-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-slate-900/5 appearance-none"
                      >
                        <option value="">No Parent (Root)</option>
                        {coa.filter(a => a.is_header && a.id !== editingAccount?.id).map(a => (
                          <option key={a.id} value={a.id}>{a.account_number} - {a.account_name}</option>
                        ))}
                      </select>
                    </div>

                    <Input 
                      label="Starting Balance" 
                      type="number"
                      value={formData.starting_balance}
                      onChange={e => setFormData({...formData, starting_balance: Number(e.target.value)})}
                      icon={<Wallet className="w-4 h-4 text-slate-400"/>}
                    />

                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, is_header: !formData.is_header})}
                        className={`flex-1 h-12 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                          formData.is_header ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        Is Header?
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                        className={`flex-1 h-12 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                          formData.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {formData.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea 
                      value={formData.description || ''}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-medium outline-none focus:ring-4 focus:ring-slate-900/5 transition-all resize-none"
                      placeholder="Notes for this account..."
                    />
                  </div>
               </div>

               <div className="flex gap-4 pt-4">
                  <Button type="button" variant="outline" className="flex-1 !py-7 !rounded-3xl" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button 
                    type="submit" 
                    className="flex-[2] !py-7 !bg-slate-900 !rounded-3xl shadow-2xl shadow-slate-900/20" 
                    loading={saving}
                    icon={<ChevronRight size={20}/>}
                  >
                    {editingAccount ? 'Commit Changes' : 'Create Account'}
                  </Button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
