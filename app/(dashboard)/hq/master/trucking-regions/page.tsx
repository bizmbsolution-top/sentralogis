'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, X, Loader2, MapPin, Save, XCircle } from 'lucide-react';
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

export default function HQTruckingRegionsPage() {
  const { profile } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

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
      setRegions((data || []) as Region[]);
    }
    setLoading(false);
  }, [profile?.tenant_id]);

  const filteredRegions = regions.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'ALL' || r.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const openCreateModal = () => {
    setEditingRegion(null);
    setFormData({ name: '', level: 'PROVINCE', parent_id: '', is_active: true });
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
            tenant_id: profile?.tenant_id || '',
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
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 italic tracking-tight">Wilayah Kerja Trucking</h1>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Master Data — Provinsi & Kota</p>
          </div>
          <Button onClick={openCreateModal} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest">
            <Plus size={14} /> Tambah Wilayah
          </Button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama wilayah..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900/5 outline-none"
            />
          </div>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900/5 outline-none"
          >
            <option value="ALL">Semua Level</option>
            <option value="PROVINCE">Provinsi</option>
            <option value="CITY">Kota</option>
          </select>
        </div>

        {loading ? (
          <div className="h-[300px] flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-500">Memuat data wilayah...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRegions.map((region) => (
              <Card key={region.id} className="p-6 border-slate-200 shadow-none rounded-2xl hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin size={16} className="text-slate-400" />
                      <span className="text-sm font-bold text-slate-900">{region.name}</span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest`}>
                      {region.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(region)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(region)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredRegions.length === 0 && (
          <div className="h-[300px] flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-200">
            <MapPin size={48} className="text-slate-300 mb-4" />
            <p className="text-sm font-semibold text-slate-500">Tidak ada wilayah ditemukan</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-slate-900 italic">
                {editingRegion ? 'Edit Wilayah' : 'Tambah Wilayah'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Wilayah *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Jawa Timur / Surabaya"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900/5 outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Level *</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value as 'PROVINCE' | 'CITY' })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900/5 outline-none"
                >
                  <option value="PROVINCE">Provinsi</option>
                  <option value="CITY">Kota</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Induk Wilayah (opsional)</label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-900/5 outline-none"
                >
                  <option value="">-- Tidak ada induk (Provinsi) --</option>
                  {regions.filter(r => r.level === 'PROVINCE' && r.id !== editingRegion?.id).map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={submitting} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
                <Button type="button" onClick={() => setIsModalOpen(false)} variant="secondary" className="flex-1 border-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest">
                  <XCircle size={14} /> Batal
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl p-8 text-center">
            <h3 className="text-lg font-black text-slate-900 mb-2">Hapus Wilayah?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Apakah Anda yakin ingin menghapus <strong>{selectedRegion?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleDelete} disabled={submitting} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {submitting ? 'Menghapus...' : 'Hapus'}
              </Button>
              <Button onClick={() => setIsDeleteModalOpen(false)} variant="secondary" className="flex-1 border-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest">
                Batal
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
