'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Plus, Search, Edit2, Trash2, X, Loader2, Truck, Filter, 
  Calendar, AlertCircle, CheckCircle2, MoreVertical
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface Fleet {
  id: string;
  fleet_code: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  stnk_number: string;
  stnk_expiry: string;
  kir_expiry: string;
  status: 'available' | 'on_road' | 'maintenance' | 'expired';
  is_active: boolean;
  tenant_id: string;
  entity_id: string;
  fleet_type_id: string;
  md_entities: { name: string };
  md_fleet_types: { type_name: string };
}

export default function FleetsPage() {
  const { profile, loading: loadingAuth } = useAuth();
  
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [vendors, setVendors] = useState<{id: string, name: string}[]>([]);
  const [fleetTypes, setFleetTypes] = useState<{id: string, type_name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendor, setFilterVendor] = useState('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);
  
  const [formData, setFormData] = useState({
    entity_id: '',
    fleet_type_id: '',
    plate_number: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    stnk_number: '',
    stnk_expiry: '',
    kir_expiry: '',
    status: 'available',
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
      // Fetch Fleets
      const { data: fleetData, error: fleetError } = await supabase
        .from('md_fleets')
        .select('*, md_entities(name), md_fleet_types(type_name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (fleetError) throw fleetError;

      // Fetch Vendors (Transporters)
      const { data: vendorData } = await supabase
        .from('md_entities')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_vendor', true)
        .eq('vendor_type', 'TRANSPORTER')
        .eq('is_active', true);
      
      // Fetch Fleet Types
      const { data: typeData } = await supabase
        .from('md_fleet_types')
        .select('id, type_name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      setFleets(fleetData || []);
      setVendors(vendorData || []);
      setFleetTypes(typeData || []);
    } catch (error: any) {
      toast.error('Gagal mengambil data master');
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

  const generateFleetCode = async () => {
    if (!tenantId) return 'FLT/001';
    
    try {
      const { data } = await supabase
        .from('md_fleets')
        .select('fleet_code')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!data || data.length === 0) return 'FLT/001';
      
      const lastCode = data[0].fleet_code;
      const lastNumber = parseInt(lastCode.split('/')[1]);
      const newNumber = (lastNumber + 1).toString().padStart(3, '0');
      return `FLT/${newNumber}`;
    } catch (err) {
      return `FLT/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    }
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      toast.error('Identitas Tenant belum dimuat.');
      return;
    }
    
    setSubmitting(true);

    try {
      if (selectedFleet) {
        const { error } = await supabase
          .from('md_fleets')
          .update({
            entity_id: formData.entity_id,
            fleet_type_id: formData.fleet_type_id,
            plate_number: formData.plate_number.toUpperCase(),
            brand: formData.brand,
            model: formData.model,
            year: formData.year,
            stnk_number: formData.stnk_number,
            stnk_expiry: formData.stnk_expiry,
            kir_expiry: formData.kir_expiry,
            status: formData.status,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedFleet.id);

        if (error) throw error;
        toast.success('Data armada berhasil diupdate');
      } else {
        const code = await generateFleetCode();
        const { error } = await supabase
          .from('md_fleets')
          .insert({
            tenant_id: tenantId,
            fleet_code: code,
            entity_id: formData.entity_id,
            fleet_type_id: formData.fleet_type_id,
            plate_number: formData.plate_number.toUpperCase(),
            brand: formData.brand,
            model: formData.model,
            year: formData.year,
            stnk_number: formData.stnk_number,
            stnk_expiry: formData.stnk_expiry,
            kir_expiry: formData.kir_expiry,
            status: formData.status,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success('Armada baru berhasil ditambahkan');
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
    if (!selectedFleet) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('md_fleets')
        .delete()
        .eq('id', selectedFleet.id);

      if (error) throw error;
      toast.success('Armada berhasil dihapus');
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error('Gagal menghapus data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenModal = (fleet: Fleet | null = null) => {
    if (fleet) {
      setSelectedFleet(fleet);
      setFormData({
        entity_id: fleet.entity_id,
        fleet_type_id: fleet.fleet_type_id,
        plate_number: fleet.plate_number,
        brand: fleet.brand || '',
        model: fleet.model || '',
        year: fleet.year || new Date().getFullYear(),
        stnk_number: fleet.stnk_number || '',
        stnk_expiry: fleet.stnk_expiry,
        kir_expiry: fleet.kir_expiry,
        status: fleet.status,
        is_active: fleet.is_active,
      });
    } else {
      setSelectedFleet(null);
      setFormData({
        entity_id: '',
        fleet_type_id: '',
        plate_number: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        stnk_number: '',
        stnk_expiry: '',
        kir_expiry: '',
        status: 'available',
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const getStatusBadge = (fleet: Fleet) => {
    const today = new Date();
    const stnkExpiry = new Date(fleet.stnk_expiry);
    const kirExpiry = new Date(fleet.kir_expiry);
    
    // Check for real expired
    if (stnkExpiry < today || kirExpiry < today) {
      return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Expired</span>;
    }

    const diffSTNK = Math.ceil((stnkExpiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const diffKIR = Math.ceil((kirExpiry.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffSTNK < 30 || diffKIR < 30) {
      return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Exp. Soon</span>;
    }

    switch (fleet.status) {
      case 'available': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Available</span>;
      case 'on_road': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">On Road</span>;
      case 'maintenance': return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Maintenance</span>;
      default: return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full uppercase tracking-wider">{fleet.status}</span>;
    }
  };

  const filteredFleets = fleets.filter(f => {
    const matchesSearch = f.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) || f.fleet_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVendor = filterVendor === 'all' || f.entity_id === filterVendor;
    return matchesSearch && matchesVendor;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="text-slate-900" size={24} />
            Master Fleets
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola armada kendaraan operasional dan pantau masa berlaku dokumen (STNK/KIR).</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium text-sm shadow-sm active:scale-95"
        >
          <Plus size={18} />
          Add Fleet
        </button>
      </div>

      {/* Controls */}
      <Card className="p-4 border-slate-200 shadow-none">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by plate or code..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select 
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 min-w-[200px]"
            >
              <option value="all">All Transporters</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border-slate-200 shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 font-semibold text-slate-700">Code</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Plate Number</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Type</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Transporter</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Doc. Expiry</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-4 font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                    <p className="text-slate-500">Memuat data armada...</p>
                  </td>
                </tr>
              ) : filteredFleets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Tidak ada data armada ditemukan.
                  </td>
                </tr>
              ) : (
                filteredFleets.map((f, idx) => (
                  <tr key={f.id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50 transition-colors' : 'bg-slate-50/30 hover:bg-slate-50 transition-colors'}>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-slate-600">{f.fleet_code}</td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900">{f.plate_number}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{f.brand} {f.model}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{f.md_fleet_types?.type_name || '-'}</td>
                    <td className="px-4 py-4 font-medium text-slate-700">{f.md_entities?.name || '-'}</td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="w-8 text-slate-400 font-bold">STNK:</span>
                          <span className={new Date(f.stnk_expiry) < new Date() ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {f.stnk_expiry}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="w-8 text-slate-400 font-bold">KIR:</span>
                          <span className={new Date(f.kir_expiry) < new Date() ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                            {f.kir_expiry}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(f)}
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenModal(f)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => { setSelectedFleet(f); setIsDeleteModalOpen(true); }}
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

      {/* Main Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-none">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedFleet ? 'Edit Fleet' : 'Add New Fleet'}</h2>
                <p className="text-xs text-slate-500 mt-1">Lengkapi informasi kendaraan dan masa berlaku dokumen.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Transporter / Vendor *</label>
                  <select 
                    required
                    value={formData.entity_id}
                    onChange={(e) => setFormData({...formData, entity_id: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  >
                    <option value="">Select Transporter</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Fleet Type *</label>
                  <select 
                    required
                    value={formData.fleet_type_id}
                    onChange={(e) => setFormData({...formData, fleet_type_id: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  >
                    <option value="">Select Type</option>
                    {fleetTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.type_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Plate Number *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.plate_number}
                    onChange={(e) => setFormData({...formData, plate_number: e.target.value.toUpperCase()})}
                    placeholder="e.g. B 1234 ABC"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Brand</label>
                  <input 
                    type="text" 
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    placeholder="e.g. HINO, ISUZU"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Model</label>
                  <input 
                    type="text" 
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                    placeholder="e.g. Ranger, Giga"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div className="col-span-full pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Calendar size={14} />
                      STNK Expiry Date *
                    </label>
                    <input 
                      type="date" 
                      required
                      value={formData.stnk_expiry}
                      onChange={(e) => setFormData({...formData, stnk_expiry: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Calendar size={14} />
                      KIR Expiry Date *
                    </label>
                    <input 
                      type="date" 
                      required
                      value={formData.kir_expiry}
                      onChange={(e) => setFormData({...formData, kir_expiry: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">STNK Number</label>
                    <input 
                      type="text" 
                      value={formData.stnk_number}
                      onChange={(e) => setFormData({...formData, stnk_number: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Operational Status</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    >
                      <option value="available">Available</option>
                      <option value="on_road">On Road</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="is_active_fl"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900"
                  />
                  <label htmlFor="is_active_fl" className="text-sm font-medium text-slate-700 select-none cursor-pointer">Active</label>
                </div>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={submitting || !formData.plate_number || !formData.entity_id || !formData.fleet_type_id}
                    className="px-8 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 active:scale-95 disabled:opacity-50 transition-all font-bold text-sm flex items-center gap-2 shadow-lg shadow-slate-900/20"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    {submitting ? 'Saving...' : 'Save Fleet'}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 shadow-2xl border-none">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Armada?</h3>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Anda akan menghapus armada <strong className="text-slate-900">{selectedFleet?.plate_number}</strong>. Tindakan ini tidak dapat dibatalkan.
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
                {submitting ? 'Deleting...' : 'Ya, Hapus'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
