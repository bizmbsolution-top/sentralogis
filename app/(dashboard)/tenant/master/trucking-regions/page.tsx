'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  Plus, Search, Edit2, Trash2, X, Loader2, MapPin, Save, XCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Region {
  id: string;
  tenant_id: string;
  name: string;
  level: 'PROVINCE' | 'CITY';
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function TenantTruckingRegionsPage() {
  const { profile } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    level: 'PROVINCE' as 'PROVINCE' | 'CITY',
    parent_id: '',
    is_active: true,
  });

  useEffect(() => {
    if (profile?.tenant_id) fetchRegions();
  }, [profile?.tenant_id]);

  const fetchRegions = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('md_trucking_regions')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('name', { ascending: true });

    if (error) {
      toast.error('Gagal mengambil data wilayah');
    } else {
      setRegions((data as any[]) || []);
    }
    setLoading(false);
  }, [profile?.tenant_id]);

  const provinces = regions.filter(r => r.level === 'PROVINCE');
  const cities = regions.filter(r => r.level === 'CITY');

  const filteredProvinces = provinces.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCities = cities.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreateModal = (level: 'PROVINCE' | 'CITY' = 'PROVINCE') => {
    setEditingRegion(null);
    setFormData({ name: '', level, parent_id: '', is_active: true });
    setIsModalOpen(true);
  };

  const openEditModal = (region: Region) => {
    setEditingRegion(region);
    setFormData({
      name: region.name,
      level: region.level,
      parent_id: region.parent_id || '',
      is_active: region.is_active,
    });
    setIsModalOpen(true);
  };

  const openDeleteModal = (region: Region) => {
    setSelectedRegion(region);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingRegion) {
        const { error } = await supabase
          .from('md_trucking_regions')
          .update({
            name: formData.name,
            level: formData.level,
            parent_id: formData.parent_id || null,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRegion.id);
        if (error) throw error;
        toast.success('Wilayah berhasil diperbarui');
      } else {
        const { error } = await supabase
          .from('md_trucking_regions')
.insert({
 tenant_id: profile?.tenant_id as string,
            name: formData.name,
            level: formData.level,
            parent_id: formData.parent_id || null,
            is_active: true,
          });
        if (error) throw error;
        toast.success('Wilayah berhasil ditambahkan');
      }
      setIsModalOpen(false);
      fetchRegions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRegion) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('md_trucking_regions')
        .delete()
        .eq('id', selectedRegion.id);
      if (error) throw error;
      toast.success('Wilayah berhasil dihapus');
      setIsDeleteModalOpen(false);
      fetchRegions();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="text-slate-900" size={24} />
            Wilayah Kerja Trucking
          </h1>
          <p className="text-sm text-slate-500 mt-1">Master Data — Kelola Provinsi dan Kota untuk wilayah kerja.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openCreateModal('PROVINCE')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium text-sm shadow-sm active:scale-95"
          >
            <Plus size={18} /> Tambah Provinsi
          </button>
          <button
            onClick={() => openCreateModal('CITY')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium text-sm shadow-sm active:scale-95"
          >
            <Plus size={18} /> Tambah Kota
          </button>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4 border-slate-200 shadow-none overflow-hidden">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Cari nama wilayah..."
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
                <th className="px-4 py-4 font-semibold text-slate-700">Nama Wilayah</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Level</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Induk</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-4 font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
              {loading ? (
                <tbody>
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                      <p className="text-slate-500">Memuat data...</p>
                    </td>
                  </tr>
                </tbody>
              ) : filteredProvinces.length === 0 && filteredCities.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                      Tidak ada wilayah ditemukan.
                    </td>
                  </tr>
                </tbody>
              ) : (
                <>
                  {filteredProvinces.map((prov) => {
                    const provCities = filteredCities.filter(c => c.parent_id === prov.id);
                    return (
                      <tbody key={prov.id} className="divide-y divide-slate-200">
                        <tr className="bg-white hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <MapPin size={14} className="text-slate-400 shrink-0" />
                              <span className="font-medium text-slate-900">{prov.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-blue-50 text-blue-700">
                              PROVINSI
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-400">—</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${prov.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {prov.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right space-x-2">
                            <button
                              onClick={() => openEditModal(prov)}
                              className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => openDeleteModal(prov)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                        {provCities.map((city) => (
                          <tr key={city.id} className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 pl-12">
                              <div className="flex items-center gap-2">
                                <MapPin size={12} className="text-slate-400 shrink-0" />
                                <span className="text-sm text-slate-700">{city.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest bg-emerald-50 text-emerald-700">
                                KOTA
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">{prov.name}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${city.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {city.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right space-x-2">
                              <button
                                onClick={() => openEditModal(city)}
                                className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => openDeleteModal(city)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    );
                  })}
                </>
              )}
            </table>
        </div>
      </Card>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border-none">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingRegion ? 'Edit Wilayah' : 'Tambah Wilayah'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {formData.level === 'PROVINCE' ? 'Provinsi' : 'Kota'} — Isi nama dan pilih induk wilayah jika Kota.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nama Wilayah *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={formData.level === 'PROVINCE' ? 'Contoh: Jawa Timur' : 'Contoh: Surabaya'}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900/5 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Level *</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value as 'PROVINCE' | 'CITY', parent_id: '' })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900/5 outline-none"
                >
                  <option value="PROVINCE">Provinsi</option>
                  <option value="CITY">Kota</option>
                </select>
              </div>

              {formData.level === 'CITY' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Induk Provinsi *</label>
                  <select
                    value={formData.parent_id}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900/5 outline-none"
                    required
                  >
                    <option value="">-- Pilih Provinsi --</option>
                    {provinces.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_active_reg"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900"
                />
                <label htmlFor="is_active_reg" className="text-sm font-medium text-slate-700 select-none cursor-pointer">
                  Aktif
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 active:scale-95 disabled:opacity-50 transition-all font-bold text-sm flex items-center gap-2 shadow-lg shadow-slate-900/20"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 shadow-2xl border-none">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <Trash2 size={24} />
              <h3 className="text-xl font-bold">Hapus Wilayah?</h3>
            </div>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong className="text-slate-900">{selectedRegion?.name}</strong>?
              {selectedRegion?.level === 'PROVINCE' && ' Semua kota di bawah provinsi ini juga akan terhapus.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Batal
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