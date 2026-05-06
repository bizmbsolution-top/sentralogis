'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, X, Loader2, Truck, Filter } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface FleetType {
  id: string;
  type_code: string;
  type_name: string;
  capacity_ton: number;
  capacity_cbm: number;
  is_active: boolean;
  time_multiplier: number;
  fuel_consumption: number;
  tenant_id: string;
  created_at: string;
}

export default function HQFleetTypesPage() {
  const { profile, loading: loadingAuth } = useAuth();
  
  const [fleetTypes, setFleetTypes] = useState<FleetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<FleetType | null>(null);
  
  const [formData, setFormData] = useState({
    type_name: '',
    capacity_ton: 0,
    capacity_cbm: 0,
    is_active: true,
    time_multiplier: 1.0,
    fuel_consumption: 1.0,
  });

  // Sync tenant info
  useEffect(() => {
    if (profile?.tenant_id) {
      setTenantId(profile.tenant_id);
    }
  }, [profile]);

  const fetchFleetTypes = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('md_fleet_types')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Gagal mengambil data jenis armada');
    } else {
      setFleetTypes(data || []);
    }
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchFleetTypes();
    } else if (!loadingAuth) {
      setLoading(false);
    }
  }, [tenantId, fetchFleetTypes, loadingAuth]);

  const generateTypeCode = async () => {
    if (!tenantId) return 'FTP/001';
    
    try {
      const { data } = await supabase
        .from('md_fleet_types')
        .select('type_code')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!data || data.length === 0) return 'FTP/001';
      
      const lastCode = data[0].type_code;
      const lastNumber = parseInt(lastCode.split('/')[1]);
      const newNumber = (lastNumber + 1).toString().padStart(3, '0');
      return `FTP/${newNumber}`;
    } catch (err) {
      return `FTP/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    }
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      toast.error('Identitas Tenant belum dimuat.');
      return;
    }
    
    setSubmitting(true);

    try {
      if (selectedType) {
        const { error } = await supabase
          .from('md_fleet_types')
          .update({
            type_name: formData.type_name,
            capacity_ton: formData.capacity_ton,
            capacity_cbm: formData.capacity_cbm,
            time_multiplier: formData.time_multiplier,
            fuel_consumption: formData.fuel_consumption,
            is_active: formData.is_active,
          })
          .eq('id', selectedType.id);

        if (error) throw error;
        toast.success('Jenis armada berhasil diupdate');
      } else {
        const code = await generateTypeCode();
        const { error } = await supabase
          .from('md_fleet_types')
          .insert({
            tenant_id: tenantId,
            type_code: code,
            type_name: formData.type_name,
            capacity_ton: formData.capacity_ton,
            capacity_cbm: formData.capacity_cbm,
            time_multiplier: formData.time_multiplier,
            fuel_consumption: formData.fuel_consumption,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success('Jenis armada berhasil ditambahkan');
      }

      setIsModalOpen(false);
      fetchFleetTypes();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedType) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('md_fleet_types')
        .delete()
        .eq('id', selectedType.id);

      if (error) throw error;
      toast.success('Jenis armada berhasil dihapus');
      setIsDeleteModalOpen(false);
      fetchFleetTypes();
    } catch (error: any) {
      toast.error('Gagal menghapus data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenModal = (type: FleetType | null = null) => {
    if (type) {
      setSelectedType(type);
      setFormData({
        type_name: type.type_name,
        capacity_ton: type.capacity_ton,
        capacity_cbm: type.capacity_cbm,
        time_multiplier: type.time_multiplier || 1.0,
        fuel_consumption: type.fuel_consumption || 1.0,
        is_active: type.is_active,
      });
    } else {
      setSelectedType(null);
      setFormData({
        type_name: '',
        capacity_ton: 0,
        capacity_cbm: 0,
        time_multiplier: 1.0,
        fuel_consumption: 1.0,
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const filteredTypes = fleetTypes.filter(ft => 
    ft.type_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ft.type_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="text-slate-900" size={24} />
            Master Fleet Types
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola daftar jenis armada (Staf HQ).</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium text-sm shadow-sm active:scale-95"
        >
          <Plus size={18} />
          Add Fleet Type
        </button>
      </div>

      <Card className="p-4 border-slate-200 shadow-none">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or code..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
          />
        </div>
      </Card>

      <Card className="overflow-hidden border-slate-200 shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 font-semibold text-slate-700">Code</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Type Name</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Cap. Ton</th>
                <th className="px-4 py-4 font-semibold text-slate-700 text-center">Multiplier</th>
                <th className="px-4 py-4 font-semibold text-slate-700 text-center">Fuel KM/L</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-4 font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                    <p className="text-slate-500">Memuat data...</p>
                  </td>
                </tr>
              ) : filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              ) : (
                filteredTypes.map((ft, idx) => (
                  <tr key={ft.id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50 transition-colors' : 'bg-slate-50/30 hover:bg-slate-50 transition-colors'}>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-slate-600">{ft.type_code}</td>
                    <td className="px-4 py-4 font-medium text-slate-900">{ft.type_name}</td>
                    <td className="px-4 py-4 text-slate-600">{ft.capacity_ton} Ton</td>
                    <td className="px-4 py-4 text-center font-bold text-blue-600">{ft.time_multiplier}x</td>
                    <td className="px-4 py-4 text-center font-bold text-emerald-600">1:{ft.fuel_consumption}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${ft.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {ft.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenModal(ft)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => { setSelectedType(ft); setIsDeleteModalOpen(true); }}
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
          <Card className="w-full max-w-md shadow-2xl border-none">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{selectedType ? 'Edit Fleet Type' : 'Add Fleet Type'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Type Name</label>
                <input 
                  type="text" 
                  value={formData.type_name || ''}
                  onChange={(e) => setFormData({...formData, type_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Time Multiplier (x)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formData.time_multiplier}
                    onChange={(e) => setFormData({...formData, time_multiplier: parseFloat(e.target.value) || 1.0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Fuel Cons. (KM/L)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={formData.fuel_consumption}
                    onChange={(e) => setFormData({...formData, fuel_consumption: parseFloat(e.target.value) || 1.0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Capacity (Ton)</label>
                  <input 
                    type="number" 
                    value={formData.capacity_ton}
                    onChange={(e) => setFormData({...formData, capacity_ton: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Capacity (CBM)</label>
                  <input 
                    type="number" 
                    value={formData.capacity_cbm}
                    onChange={(e) => setFormData({...formData, capacity_cbm: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input 
                  type="checkbox"
                  id="is_active_ft_hq"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="is_active_ft_hq" className="text-sm font-medium text-slate-700 select-none cursor-pointer">Active</label>
              </div>
              <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                <button 
                  onClick={handleSubmit}
                  disabled={submitting || !formData.type_name}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 active:scale-95 disabled:opacity-50 transition-all font-medium text-sm flex items-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? 'Menyimpan...' : 'Save Type'}
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
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Jenis Armada?</h3>
            <p className="text-slate-600 mb-8 leading-relaxed">Anda akan menghapus <strong className="text-slate-900">{selectedType?.type_name}</strong>. Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
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
