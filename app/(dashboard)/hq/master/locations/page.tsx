'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { Plus, Search, MapPin, Edit2, Trash2, X, Loader2, Map as MapIcon, Filter } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import GoogleMapsInput from '@/components/master/GoogleMapsInput';

interface Location {
  id: string;
  location_code: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  address_notes?: string;
  tenant_id: string;
  created_at: string;
}

export default function HQLocationsPage() {
  const { profile, loading: loadingAuth } = useAuth();
  
  // Role Access
  const roleUpper = profile?.role?.toUpperCase() || '';
  const canEdit = roleUpper.includes('HQ') || roleUpper.includes('ADMIN');
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenantCode, setTenantCode] = useState<string>('TENANT');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    address_notes: '',
    latitude: 0,
    longitude: 0,
    is_active: true,
  });

  // Sync tenant info from auth profile
  useEffect(() => {
    if (profile?.tenant_id) {
      setTenantId(profile.tenant_id);
      setTenantCode(profile.tenant_code || 'TENANT');
    }
  }, [profile]);

  const fetchLocations = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('md_locations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Gagal mengambil data lokasi');
    } else {
      setLocations(data || []);
    }
    setLoading(false);
  }, [supabase, tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchLocations();
    } else if (!loadingAuth) {
      setLoading(false);
    }
  }, [tenantId, fetchLocations, loadingAuth]);

  const generateLocationCode = async () => {
    if (!tenantId) return 'LOC/001';

    console.log('[Locations] Generating code for tenant:', tenantId);
    try {
      console.log('[Locations] Querying last code...');
      const { data, error } = await supabase
        .from('md_locations')
        .select('location_code')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      console.log('[Locations] Query result:', { data, error });
      
      if (error) {
        console.error('[Locations] Error generating code:', error);
        return `${tenantCode}/LOC/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      }
      
      if (!data || data.length === 0) return `${tenantCode}/LOC/001`;
      
      const lastCode = data[0].location_code;
      const parts = lastCode.split('/');
      const lastNumber = parseInt(parts[parts.length - 1]);
      if (isNaN(lastNumber)) return `${tenantCode}/LOC/001`;
      
      const newNumber = (lastNumber + 1).toString().padStart(3, '0');
      return `${tenantCode}/LOC/${newNumber}`;
    } catch (err) {
      console.error('[Locations] Critical error in generateLocationCode:', err);
      return `${tenantCode}/LOC/ERR-${Date.now().toString().slice(-3)}`;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!tenantId) {
      toast.error('Identitas Tenant belum dimuat. Mohon tunggu sebentar atau refresh halaman.');
      return;
    }

    if (!canEdit) {
      toast.error('Anda tidak memiliki izin untuk menyimpan data.');
      return;
    }
    
    setSubmitting(true);
    try {
      console.log('[Locations] Starting save process...', { tenantId, formData });
      if (selectedLocation) {
        // Update
        const { error } = await supabase
          .from('md_locations')
          .update({
            name: formData.name,
            address: formData.address,
            city: formData.city,
            province: formData.province,
            postal_code: formData.postal_code,
            address_notes: formData.address_notes,
            latitude: formData.latitude,
            longitude: formData.longitude,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedLocation.id);

        if (error) {
          console.error('Location Update Error:', error);
          throw error;
        }
        toast.success('Location berhasil diupdate');
      } else {
        // Insert
        const code = await generateLocationCode();
        console.log('[Locations] Generated code:', code);
        const { error } = await supabase
          .from('md_locations')
          .insert({
            tenant_id: tenantId,
            location_code: code,
            name: formData.name,
            address: formData.address,
            city: formData.city || '-',
            province: formData.province || '-',
            postal_code: formData.postal_code || '-',
            address_notes: formData.address_notes,
            country: 'Indonesia',
            latitude: formData.latitude,
            longitude: formData.longitude,
            is_active: formData.is_active,
          });

        if (error) {
          console.error('[Locations] Insert Error Details:', error);
          throw error;
        }
        console.log('[Locations] Insert successful');
        toast.success('Location berhasil ditambahkan');
      }

      setIsModalOpen(false);
      fetchLocations();
    } catch (error: any) {
      console.error('Final Location Error Catch:', error);
      toast.error(error.message || 'Terjadi kesalahan saat menyimpan data. Cek Console (F12).');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLocation || !canEdit) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('md_locations')
        .delete()
        .eq('id', selectedLocation.id);

      if (error) throw error;
      toast.success('Location berhasil dihapus');
      setIsDeleteModalOpen(false);
      fetchLocations();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus lokasi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenModal = (location: Location | null = null) => {
    if (!canEdit) return;
    if (location) {
      setSelectedLocation(location);
      setFormData({
        name: location.name,
        address: location.address,
        city: location.city,
        province: location.province,
        postal_code: location.postal_code || '',
        address_notes: location.address_notes || '',
        latitude: location.latitude,
        longitude: location.longitude,
        is_active: location.is_active,
      });
    } else {
      setSelectedLocation(null);
      setFormData({
        name: '',
        address: '',
        city: '',
        province: '',
        postal_code: '',
        address_notes: '',
        latitude: 0,
        longitude: 0,
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const filteredLocations = locations.filter(loc => {
    const matchesSearch = 
      loc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      loc.location_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProvince = filterProvince === '' || loc.province === filterProvince;
    return matchesSearch && matchesProvince;
  });

  const provinces = Array.from(new Set(locations.map(l => l.province))).filter(Boolean);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MapIcon className="text-slate-900" size={24} />
            Master Locations { !canEdit && <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-md ml-2">Read Only</span> }
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {canEdit ? 'Kelola data titik lokasi operasional tenant.' : 'Lihat daftar lokasi operasional tenant.'}
          </p>
        </div>
        {canEdit && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium text-sm shadow-sm"
          >
            <Plus size={18} />
            Add Location
          </button>
        )}
      </div>

      {/* Controls Section */}
      <Card className="p-4 border-slate-200 shadow-none">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or code..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select 
              value={filterProvince}
              onChange={(e) => setFilterProvince(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 min-w-[150px]"
            >
              <option value="">All Provinces</option>
              {provinces.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Table Section */}
      <Card className="overflow-hidden border-slate-200 shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 font-semibold text-slate-700">Code</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Name</th>
                <th className="px-4 py-4 font-semibold text-slate-700">City</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Province</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Address</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Status</th>
                {canEdit && <th className="px-4 py-4 font-semibold text-slate-700 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                      <p className="text-slate-500">Memuat data lokasi...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="px-4 py-12 text-center text-slate-500">
                    Tidak ada data lokasi ditemukan.
                  </td>
                </tr>
              ) : (
                filteredLocations.map((loc, idx) => (
                  <tr key={loc.id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50 transition-colors' : 'bg-slate-50/30 hover:bg-slate-50 transition-colors'}>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-slate-600">{loc.location_code}</td>
                    <td className="px-4 py-4 font-medium text-slate-900">{loc.name}</td>
                    <td className="px-4 py-4 text-slate-600">{loc.city}</td>
                    <td className="px-4 py-4 text-slate-600">{loc.province}</td>
                    <td className="px-4 py-4 text-slate-500 max-w-[250px] truncate">{loc.address}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${loc.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {loc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-4 text-right space-x-2">
                        <button 
                          onClick={() => handleOpenModal(loc)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => { setSelectedLocation(loc); setIsDeleteModalOpen(true); }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal (Only if canEdit) */}
      {isModalOpen && canEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-none">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedLocation ? 'Edit Location' : 'Add New Location'}</h2>
                <p className="text-xs text-slate-500 mt-1">Lengkapi informasi lokasi secara mendetail.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-full">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Location Code</label>
                  <input 
                    type="text" 
                    value={selectedLocation?.location_code || 'Auto-generated'} 
                    disabled 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 font-mono"
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Name <span className="text-rose-500">*</span></label>
                  <input 
                    required
                    type="text" 
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Contoh: Gudang Hub Jakarta Pusat"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Full Address (Search Maps) <span className="text-rose-500">*</span></label>
                  <GoogleMapsInput 
                    defaultValue={formData.address || ''}
                    onPlaceSelect={(place) => {
                      setFormData({
                        ...formData,
                        address: place.address || '',
                        city: place.city || '',
                        province: place.province || '',
                        latitude: place.latitude || 0,
                        longitude: place.longitude || 0,
                        postal_code: place.postal_code || '',
                      });
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">City</label>
                  <input 
                    type="text" 
                    value={formData.city || ''}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Province</label>
                  <input 
                    type="text" 
                    value={formData.province || ''}
                    onChange={(e) => setFormData({...formData, province: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Postal Code</label>
                  <input 
                    type="text" 
                    value={formData.postal_code || ''}
                    onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Country</label>
                  <input 
                    type="text" 
                    value="Indonesia"
                    disabled 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500"
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Petunjuk Alamat (Spesifik)</label>
                  <textarea 
                    value={formData.address_notes || ''}
                    onChange={(e) => setFormData({...formData, address_notes: e.target.value})}
                    placeholder="Contoh: Masuk dari gang samping Indomaret, pagar warna hitam..."
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                  />
                </div>

                <div className="col-span-full pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-slate-700 select-none cursor-pointer">Set as Active Location</label>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit()}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm flex items-center gap-2 shadow-lg shadow-slate-900/20"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? 'Menyimpan...' : (selectedLocation ? 'Update Location' : 'Save Location')}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && canEdit && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-md p-6 shadow-2xl border-none">
            <div className="flex items-center gap-4 text-rose-600 mb-4">
              <div className="p-3 bg-rose-50 rounded-full">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-bold">Hapus Lokasi?</h3>
            </div>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Apakah Anda yakin ingin menghapus lokasi <strong className="text-slate-900">{selectedLocation?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
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
                className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-all font-medium text-sm flex items-center gap-2"
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
