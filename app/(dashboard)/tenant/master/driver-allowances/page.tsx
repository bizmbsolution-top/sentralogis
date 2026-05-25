'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast, Toaster } from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, X, Loader2, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface DriverAllowance {
  id: string;
  origin_city: string;
  destination_city: string;
  fleet_type_id: string;
  amount: number;
  is_active: boolean;
  tenant_id: string;
  md_fleet_types?: { type_name: string };
}

export default function DriverAllowancesPage() {
  const { profile, loading: loadingAuth } = useAuth();
  
  const [allowances, setAllowances] = useState<DriverAllowance[]>([]);
  const [fleetTypes, setFleetTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DriverAllowance | null>(null);
  
  const [formData, setFormData] = useState({
    origin_city: '',
    destination_city: '',
    fleet_type_id: '',
    amount: 0,
    is_active: true,
  });

  // Sync tenant info
  useEffect(() => {
    if (profile?.tenant_id) {
      setTenantId(profile.tenant_id);
    }
  }, [profile]);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    
    try {
      const [allowRes, fleetsRes] = await Promise.all([
        supabase
          .from('md_driver_allowances')
          .select('*, md_fleet_types(type_name)')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }),
        supabase
          .from('md_fleet_types')
          .select('id, type_name')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
      ]);

      if (allowRes.error) throw allowRes.error;
      if (fleetsRes.error) throw fleetsRes.error;

      setAllowances(allowRes.data || []);
      setFleetTypes(fleetsRes.data || []);
    } catch (error) {
      toast.error('Gagal mengambil data master uang jalan');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchData();
    } else if (!loadingAuth) {
      setLoading(false);
    }
  }, [tenantId, fetchData, loadingAuth]);

  const handleSubmit = async () => {
    if (!tenantId) {
      toast.error('Identitas Tenant belum dimuat.');
      return;
    }
    
    if (!formData.origin_city || !formData.destination_city || !formData.fleet_type_id) {
      toast.error('Lengkapi Asal, Tujuan, dan Tipe Truk.');
      return;
    }
    
    setSubmitting(true);

    try {
      if (selectedItem) {
        // Update
        const { error } = await supabase
          .from('md_driver_allowances')
          .update({
            origin_city: formData.origin_city,
            destination_city: formData.destination_city,
            fleet_type_id: formData.fleet_type_id,
            amount: formData.amount,
            is_active: formData.is_active,
          })
          .eq('id', selectedItem.id);

        if (error) {
          if (error.code === '23505') throw new Error('Tarif untuk rute dan tipe truk ini sudah ada.');
          throw error;
        }
        toast.success('Tarif Uang Jalan berhasil diupdate');
      } else {
        // Insert
        const { error } = await supabase
          .from('md_driver_allowances')
          .insert({
            tenant_id: tenantId,
            origin_city: formData.origin_city,
            destination_city: formData.destination_city,
            fleet_type_id: formData.fleet_type_id,
            amount: formData.amount,
            is_active: formData.is_active,
          });

        if (error) {
          if (error.code === '23505') throw new Error('Tarif untuk rute dan tipe truk ini sudah ada.');
          throw error;
        }
        toast.success('Tarif Uang Jalan berhasil ditambahkan');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('md_driver_allowances')
        .delete()
        .eq('id', selectedItem.id);

      if (error) throw error;
      toast.success('Tarif berhasil dihapus');
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error('Gagal menghapus data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenModal = (item: DriverAllowance | null = null) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        origin_city: item.origin_city,
        destination_city: item.destination_city,
        fleet_type_id: item.fleet_type_id,
        amount: item.amount,
        is_active: item.is_active,
      });
    } else {
      setSelectedItem(null);
      setFormData({
        origin_city: '',
        destination_city: '',
        fleet_type_id: fleetTypes.length > 0 ? fleetTypes[0].id : '',
        amount: 0,
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const formatNumberInput = (val: any) => {
    if (val === undefined || val === null || val === '') return '';
    const num = val.toString().replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const filteredItems = allowances.filter(item => 
    item.origin_city.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.destination_city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.md_fleet_types?.type_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <Toaster position="top-right" />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="text-slate-900" size={24} />
            Master Tarif Uang Jalan
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola standar nominal uang jalan (bagi hasil) driver berdasarkan rute dan tipe armada.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium text-sm shadow-sm active:scale-95"
        >
          <Plus size={18} />
          Add Tarif
        </button>
      </div>

      {/* Controls */}
      <Card className="p-4 border-slate-200 shadow-none">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari berdasarkan kota atau tipe truk..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border-slate-200 shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 font-semibold text-slate-700">Tipe Armada</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Asal (Origin)</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Tujuan (Destination)</th>
                <th className="px-4 py-4 font-semibold text-slate-700 text-right">Nominal</th>
                <th className="px-4 py-4 font-semibold text-slate-700 text-center">Status</th>
                <th className="px-4 py-4 font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                      <p className="text-slate-500">Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50 transition-colors' : 'bg-slate-50/30 hover:bg-slate-50 transition-colors'}>
                    <td className="px-4 py-4 font-bold text-slate-900">{item.md_fleet_types?.type_name || '-'}</td>
                    <td className="px-4 py-4 font-medium text-slate-700 uppercase">{item.origin_city}</td>
                    <td className="px-4 py-4 font-medium text-slate-700 uppercase">{item.destination_city}</td>
                    <td className="px-4 py-4 text-slate-900 font-bold text-right">{formatRupiah(item.amount)}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenModal(item)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => { setSelectedItem(item); setIsDeleteModalOpen(true); }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{selectedItem ? 'Edit Tarif' : 'Add Tarif'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tipe Armada</label>
                <select 
                  value={formData.fleet_type_id}
                  onChange={(e) => setFormData({...formData, fleet_type_id: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                >
                  <option value="">-- Pilih Tipe --</option>
                  {fleetTypes.map(ft => (
                    <option key={ft.id} value={ft.id}>{ft.type_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Asal (Origin Kota)</label>
                  <input 
                    type="text" 
                    value={formData.origin_city}
                    onChange={(e) => setFormData({...formData, origin_city: e.target.value.toUpperCase()})}
                    placeholder="Misal: JAKARTA UTARA"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Tujuan (Dest Kota)</label>
                  <input 
                    type="text" 
                    value={formData.destination_city}
                    onChange={(e) => setFormData({...formData, destination_city: e.target.value.toUpperCase()})}
                    placeholder="Misal: TANGERANG"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Nominal Uang Jalan (Rp)</label>
                <input 
                  type="text" 
                  value={formatNumberInput(formData.amount)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setFormData({...formData, amount: raw ? parseInt(raw, 10) : 0});
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 font-bold"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox"
                  id="is_active_da"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="is_active_da" className="text-sm font-medium text-slate-700 select-none cursor-pointer">Active</label>
              </div>

              <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={submitting || !formData.origin_city || !formData.destination_city || !formData.fleet_type_id}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 active:scale-95 disabled:opacity-50 transition-all font-medium text-sm flex items-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? 'Menyimpan...' : 'Save Tarif'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 shadow-2xl border-none">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Tarif Uang Jalan?</h3>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Anda akan menghapus tarif rute <strong className="text-slate-900 uppercase">{selectedItem?.origin_city} - {selectedItem?.destination_city}</strong>. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={submitting}
                className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 active:scale-95 disabled:opacity-50 transition-all font-medium text-sm flex items-center gap-2"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
