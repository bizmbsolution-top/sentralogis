'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Loader2, 
  Wallet,
  AlertCircle,
  TrendingDown
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import AddCostTable from '@/components/sbu/AddCostTable';
import AddCostModal from '@/components/sbu/AddCostModal';
import EditAddCostModal from '@/components/sbu/EditAddCostModal';

export default function SBUAddCostPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const sbuType = 'TRUCKING';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: costs, error } = await supabase
        .from('extra_costs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (costs && costs.length > 0) {
        let joIds = Array.from(new Set(costs.map(c => c.jo_id).filter(Boolean)));
        const { data: jos } = await supabase
          .from('job_orders')
          .select(`
            id, jo_number, purchase_price, vendor_invoice_amount,
            transporter_id, wo_item_id
          `)
          .in('id', joIds)
          .eq('sbu_type', sbuType);

        if (jos && jos.length > 0) {
          const woItemIds = Array.from(new Set(jos.map(j => j.wo_item_id).filter(Boolean)));
          const transporterIds = Array.from(new Set(jos.map(j => j.transporter_id).filter(Boolean)));

          const [woItemsRes, transportersRes] = await Promise.all([
            woItemIds.length > 0
              ? supabase.from('wo_items').select('id, item_data').in('id', woItemIds)
              : { data: [] },
            transporterIds.length > 0
              ? supabase.from('md_entities').select('id, name').in('id', transporterIds)
              : { data: [] },
          ]);

          const woItemsMap = Object.fromEntries((woItemsRes.data || []).map(w => [w.id, w]));
          const transportersMap = Object.fromEntries((transportersRes.data || []).map(t => [t.id, t]));

          const josMap = Object.fromEntries(
            jos.map(j => [j.id, {
              ...j,
              wo_items: woItemsMap[j.wo_item_id] || null,
              transporter: transportersMap[j.transporter_id] || null,
            }])
          );

          setData(
            costs
              .map(c => ({ ...c, job_orders: josMap[c.jo_id] || null }))
              .filter(c => c.job_orders !== null)
          );
        } else {
          setData([]);
        }
      } else {
        setData([]);
      }
    } catch (err: any) {
      console.error('Fetch Error:', err);
      toast.error('Gagal mengambil data Add Cost');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      const { error } = await supabase.from('extra_costs').delete().eq('id', id);
      if (error) throw error;
      toast.success('Data berhasil dihapus');
      fetchData();
    } catch (err) {
      toast.error('Gagal menghapus data');
    }
  };

  const handleSubmitToCS = async (id: string) => {
    try {
      const item = data.find(c => c.id === id);
      const { error } = await supabase
        .from('extra_costs')
        .update({ status: 'need_approval' })
        .eq('id', id);
      if (error) throw error;

      try {
        await supabase.from('notifications').insert({
          tenant_id: profile?.tenant_id,
          role: 'hq_finance',
          title: 'Need Approval Add Cost',
          message: `Biaya tambahan diajukan untuk JO ${item?.job_orders?.jo_number || id}`,
          type: 'add_cost',
          is_read: false,
          metadata: { link: '/hq/finance/cost-audit?sbu=TRUCKING' }
        });
      } catch (e) {
        console.error('Failed notification insert', e);
      }

      toast.success('Berhasil diajukan ke CS');
      fetchData();
    } catch (err) {
      toast.error('Gagal mengajukan data');
    }
  };

  const filteredData = data.filter(item => {
    const matchesSearch = item.job_orders?.jo_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-slate-900/20 rotate-3 group hover:rotate-0 transition-transform duration-500">
            <Wallet size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">TRIP CHARGES CONSOLE</h1>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
              <TrendingDown size={12} /> SBU Trucking Finance Operations
            </p>
          </div>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="h-14 px-8 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center gap-3"
        >
          <Plus size={20} /> Create Trip Charges
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 border-slate-100 shadow-sm rounded-[2rem]">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Quick Search</h3>
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search JO Number..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-slate-50 border-transparent rounded-2xl text-xs font-black focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
              />
            </div>

            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Filter Status</h3>
            <div className="space-y-2">
              {['all', 'draft', 'need_approval', 'approved', 'rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`w-full text-left px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    statusFilter === status 
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                  }`}
                >
                  {status.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </Card>

          <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6 space-y-3">
             <div className="flex items-center gap-2 text-blue-600">
                <AlertCircle size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Financial Integrity</span>
             </div>
             <p className="text-[10px] font-bold text-blue-600 leading-relaxed uppercase tracking-wider opacity-80 italic">
                Pastikan Harga Beli (Purchase Price) sudah sesuai sebelum menyetujui biaya tambahan dari vendor.
             </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="w-12 h-12 text-slate-200 animate-spin" />
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Syncing Finance Data...</p>
            </div>
          ) : (
            <AddCostTable 
              data={filteredData}
              onEdit={(item) => setEditingItem(item)}
              onDelete={handleDelete}
              onSubmit={handleSubmitToCS}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <AddCostModal 
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => { setIsAddModalOpen(false); fetchData(); }}
          sbuType="TRUCKING"
        />
      )}

      {editingItem && (
        <EditAddCostModal 
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={() => { setEditingItem(null); fetchData(); }}
        />
      )}
    </div>
  );
}
