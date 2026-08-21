'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Plus, Search, Edit2, Trash2, X, Loader2, User as DriverIcon, Filter, 
  Calendar, CreditCard, Phone, MessageSquare
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { generateDriverCodeAction } from '@/lib/actions/masterCodeActions';

const isDuplicateDriverPhoneError = (error: any) => {
  const message = String(
    error?.message ||
    error?.details ||
    error?.hint ||
    ''
  ).toLowerCase();

  const constraint = String(
    error?.constraint ||
    ''
  ).toLowerCase();

  return (
    error?.code === '23505' &&
    (
      constraint.includes('md_drivers_tenant_whatsapp_unique') ||
      message.includes('md_drivers_tenant_whatsapp_unique') ||
      (
        message.includes('unique') &&
        message.includes('whatsapp')
      )
    )
  );
};

interface Driver {
  id: string;
  driver_code: string;
  name: string;
  phone: string;
  whatsapp: string;
  address: string;
  sim_number: string;
  sim_class: string;
  sim_expiry: string;
  status: 'available' | 'on_duty' | 'unavailable';
  is_active: boolean;
  tenant_id: string;
  entity_id: string;
  md_entities: { name: string };
}

export default function DriversPage() {
  const { profile, loading: loadingAuth } = useAuth();
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vendors, setVendors] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendor, setFilterVendor] = useState('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  
  const [formData, setFormData] = useState({
    entity_id: '',
    name: '',
    phone: '',
    whatsapp: '',
    address: '',
    sim_number: '',
    sim_class: 'B1',
    sim_expiry: '',
    status: 'available' as 'available' | 'on_duty' | 'unavailable',
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
      // Fetch Drivers
      const { data: driverData, error: driverError } = await (supabase
        .from('md_drivers' as any) as any)
        .select('*, md_entities(name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (driverError) throw driverError;

      // Fetch Vendors (Transporters)
      const { data: vendorData } = await supabase
        .from('md_entities')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_vendor', true)
        .eq('vendor_type', 'TRANSPORTER')
        .eq('is_active', true);

      setDrivers((driverData as any[]) || []);
      setVendors((vendorData as any[]) || []);
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

  const generateDriverCode = async () => {
    return await generateDriverCodeAction();
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      toast.error('Identitas Tenant belum dimuat.');
      return;
    }
    
    setSubmitting(true);

    try {
      if (selectedDriver) {
        const { error } = await supabase
          .from('md_drivers')
          .update({
            entity_id: formData.entity_id,
            name: formData.name,
            phone: formData.phone,
            whatsapp: formData.whatsapp,
            address: formData.address,
            sim_number: formData.sim_number,
            sim_class: formData.sim_class,
            sim_expiry: formData.sim_expiry,
            status: formData.status,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedDriver.id);

        if (error) throw error;
        toast.success('Data pengemudi berhasil diupdate');
      } else {
        const code = await generateDriverCode();
        let { error } = await supabase
          .from('md_drivers')
          .insert({
            tenant_id: tenantId,
            driver_code: code,
            entity_id: formData.entity_id,
            name: formData.name,
            phone: formData.phone,
            whatsapp: formData.whatsapp,
            address: formData.address,
            sim_number: formData.sim_number,
            sim_class: formData.sim_class,
            sim_expiry: formData.sim_expiry,
            status: formData.status,
            is_active: formData.is_active,
          });

        // [AI] Automatic retry on unique constraint collision
        if (error && (error.code === '23505' || error.message?.toLowerCase().includes('unique') || error.message?.toLowerCase().includes('duplicate'))) {
          const fallbackCode = `DRI/${Date.now().toString().slice(-4)}`;
          const retryRes = await supabase
            .from('md_drivers')
            .insert({
              tenant_id: tenantId,
              driver_code: fallbackCode,
              entity_id: formData.entity_id,
              name: formData.name,
              phone: formData.phone,
              whatsapp: formData.whatsapp,
              address: formData.address,
              sim_number: formData.sim_number,
              sim_class: formData.sim_class,
              sim_expiry: formData.sim_expiry,
              status: formData.status,
              is_active: formData.is_active,
            });
          if (retryRes.error) throw retryRes.error;
          error = null;
        } else if (error) {
          throw error;
        }

        toast.success('Pengemudi baru berhasil ditambahkan');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
        if (isDuplicateDriverPhoneError(error)) {
          toast.error('Nomor WhatsApp sudah digunakan oleh driver lain di tenant ini.');
        } else {
          toast.error(error.message || 'Terjadi kesalahan saat menyimpan data');
        }
      } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDriver) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('md_drivers')
        .delete()
        .eq('id', selectedDriver.id);

      if (error) throw error;
      toast.success('Pengemudi berhasil dihapus');
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error('Gagal menghapus data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenModal = (driver: Driver | null = null) => {
    if (driver) {
      setSelectedDriver(driver);
      setFormData({
        entity_id: driver.entity_id,
        name: driver.name,
        phone: driver.phone,
        whatsapp: driver.whatsapp || '',
        address: driver.address || '',
        sim_number: driver.sim_number || '',
        sim_class: driver.sim_class || 'B1',
        sim_expiry: driver.sim_expiry,
        status: driver.status,
        is_active: driver.is_active,
      });
    } else {
      setSelectedDriver(null);
      setFormData({
        entity_id: '',
        name: '',
        phone: '',
        whatsapp: '',
        address: '',
        sim_number: '',
        sim_class: 'B1',
        sim_expiry: '',
        status: 'available',
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const getStatusBadge = (driver: Driver) => {
    const today = new Date();
    const simExpiry = new Date(driver.sim_expiry);
    
    if (simExpiry < today) {
      return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full uppercase tracking-wider">SIM Expired</span>;
    }

    const diffSIM = Math.ceil((simExpiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffSIM < 30) {
      return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">SIM Soon</span>;
    }

    switch (driver.status) {
      case 'available': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Available</span>;
      case 'on_duty': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">On Duty</span>;
      case 'unavailable': return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Unavailable</span>;
      default: return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full uppercase tracking-wider">{driver.status}</span>;
    }
  };

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.driver_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVendor = filterVendor === 'all' || d.entity_id === filterVendor;
    return matchesSearch && matchesVendor;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DriverIcon className="text-slate-900" size={24} />
            Master Drivers
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola data pengemudi dan pantau validitas dokumen (SIM).</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-medium text-sm shadow-sm active:scale-95"
        >
          <Plus size={18} />
          Add Driver
        </button>
      </div>

      {/* Controls */}
      <Card className="p-4 border-slate-200 shadow-none">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
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
                <th className="px-4 py-4 font-semibold text-slate-700">Driver Name</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Phone</th>
                <th className="px-4 py-4 font-semibold text-slate-700">SIM Info</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Transporter</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-4 font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                    <p className="text-slate-500">Memuat data pengemudi...</p>
                  </td>
                </tr>
              ) : filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Tidak ada data pengemudi ditemukan.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((d, idx) => (
                  <tr key={d.id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50 transition-colors' : 'bg-slate-50/30 hover:bg-slate-50 transition-colors'}>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-slate-600">{d.driver_code}</td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900">{d.name}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Phone size={12} className="text-slate-400" />
                          <span>{d.phone}</span>
                        </div>
                        {d.whatsapp && (
                          <div className="flex items-center gap-1 text-emerald-600 font-medium">
                            <MessageSquare size={12} className="text-emerald-500" />
                            <span>{d.whatsapp}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="w-12 text-slate-400 font-bold uppercase">Class:</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded">{d.sim_class}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="w-12 text-slate-400 font-bold uppercase">Expiry:</span>
                          <span className={new Date(d.sim_expiry) < new Date() ? 'text-rose-600 font-bold' : 'text-slate-600 font-medium'}>
                            {d.sim_expiry}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-700">{d.md_entities?.name || '-'}</td>
                    <td className="px-4 py-4">
                      {getStatusBadge(d)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button 
                          onClick={() => handleOpenModal(d)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-bold rounded-lg shadow-sm transition-all"
                        >
                          <Edit2 size={14} />
                          <span>EDIT</span>
                        </button>
                        <button 
                          onClick={() => { setSelectedDriver(d); setIsDeleteModalOpen(true); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                        >
                          <Trash2 size={14} />
                          <span>DELETE</span>
                        </button>
                      </div>
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
                <h2 className="text-xl font-bold text-slate-900">{selectedDriver ? 'Edit Driver' : 'Add New Driver'}</h2>
                <p className="text-xs text-slate-500 mt-1">Lengkapi informasi pengemudi dan dokumen SIM.</p>
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

                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Phone Number *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">WhatsApp Number</label>
                  <input 
                    type="text" 
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Address</label>
                  <textarea 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div className="col-span-full pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <CreditCard size={14} />
                      SIM Number
                    </label>
                    <input 
                      type="text" 
                      value={formData.sim_number}
                      onChange={(e) => setFormData({...formData, sim_number: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">SIM Class</label>
                    <select 
                      value={formData.sim_class}
                      onChange={(e) => setFormData({...formData, sim_class: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="A">A</option>
                      <option value="B1">B1</option>
                      <option value="B1 Umum">B1 Umum</option>
                      <option value="B2">B2</option>
                      <option value="B2 Umum">B2 Umum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">SIM Expiry *</label>
                    <input 
                      type="date" 
                      required
                      value={formData.sim_expiry}
                      onChange={(e) => setFormData({...formData, sim_expiry: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Operational Status</label>
                  <div className="flex gap-4">
                    {(['available', 'on_duty', 'unavailable'] as const).map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="radio" 
                          name="status" 
                          value={s}
                          checked={formData.status === s}
                          onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                          className="w-4 h-4 text-slate-900 border-slate-300"
                        />
                        <span className="text-xs font-medium text-slate-700 capitalize">{s.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="is_active_dr"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900"
                  />
                  <label htmlFor="is_active_dr" className="text-sm font-medium text-slate-700 select-none cursor-pointer">Active Profile</label>
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
                    disabled={submitting || !formData.name || !formData.phone || !formData.entity_id}
                    className="px-8 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 active:scale-95 disabled:opacity-50 transition-all font-bold text-sm flex items-center gap-2 shadow-lg shadow-slate-900/20"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    {submitting ? 'Saving...' : 'Save Driver'}
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
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Pengemudi?</h3>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Anda akan menghapus data pengemudi <strong className="text-slate-900">{selectedDriver?.name}</strong>. Tindakan ini tidak dapat dibatalkan.
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
