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
  status: 'available' | 'on_duty' | 'off_duty';
  is_active: boolean;
  tenant_id: string;
  entity_id: string;
  md_entities: { name: string };
}

export default function HQDriversPage() {
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
      const { data: driverData, error: driverError } = await supabase
        .from('md_drivers')
        .select('*, md_entities(name, is_vendor)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (driverError) throw driverError;

      const { data: vendorData } = await supabase
        .from('md_entities')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_vendor', true)
        .eq('vendor_type', 'TRANSPORTER')
        .eq('is_active', true);

      // Fetch the actual internal entity
      const { data: internalEntity } = await supabase
        .from('md_entities')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_vendor', false)
        .eq('name', profile?.tenants?.company_name || 'INTERNAL HQ')
        .limit(1)
        .single();

      const ownEntity = internalEntity 
        ? [{ id: internalEntity.id, name: `(OWN) ${internalEntity.name}` }] 
        : [{ id: 'NEW_INTERNAL', name: `(OWN) ${profile?.tenants?.company_name || 'INTERNAL HQ'}` }];

      setVendors([...ownEntity, ...(vendorData || [])]);
      setDrivers(driverData || []);
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
    if (!tenantId) return 'DRI/001';
    
    try {
      const { data } = await supabase
        .from('md_drivers')
        .select('driver_code')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!data || data.length === 0) return 'DRI/001';
      
      const lastCode = data[0].driver_code;
      const lastNumber = parseInt(lastCode.split('/')[1]);
      const newNumber = (lastNumber + 1).toString().padStart(3, '0');
      return `DRI/${newNumber}`;
    } catch (err) {
      return `DRI/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    }
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      toast.error('Identitas Tenant belum dimuat.');
      return;
    }
    
    setSubmitting(true);

    try {
      let targetEntityId = formData.entity_id;

      // Handle OWN selection
      if (formData.entity_id === 'NEW_INTERNAL') {
          const entityCode = `INT-${(profile?.tenants?.company_name || 'HQ').substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
          const { data: newEntity, error: createError } = await supabase
            .from('md_entities')
            .insert({
              tenant_id: tenantId,
              entity_code: entityCode,
              name: profile?.tenants?.company_name || 'INTERNAL HQ',
              is_vendor: false,
              is_active: true
            })
            .select()
            .single();
          
          if (createError) throw createError;
          targetEntityId = newEntity.id;
      }

      if (selectedDriver) {
        const { error } = await supabase
          .from('md_drivers')
          .update({
            entity_id: targetEntityId,
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
        const { error } = await supabase
          .from('md_drivers')
          .insert({
            tenant_id: tenantId,
            driver_code: code,
            entity_id: targetEntityId,
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

        if (error) throw error;
        toast.success('Pengemudi baru berhasil ditambahkan');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Final Driver Error Catch:', error);
      toast.error(error.message || 'Gagal menyimpan pengemudi. Cek Console (F12) untuk detail.');
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
    if (simExpiry < today) return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full uppercase tracking-wider">SIM Expired</span>;
    
    switch (driver.status) {
      case 'available': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Available</span>;
      case 'on_duty': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">On Duty</span>;
      default: return <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Off Duty</span>;
    }
  };

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.driver_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesVendor = true;
    if (filterVendor !== 'all') {
      if (filterVendor === 'OWN') {
        matchesVendor = d.md_entities?.is_vendor === false;
      } else {
        matchesVendor = d.entity_id === filterVendor;
      }
    }
    
    return matchesSearch && matchesVendor;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DriverIcon className="text-slate-900" size={24} />
            Master Drivers
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola data pengemudi (Staf HQ).</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium text-sm shadow-sm active:scale-95"
        >
          <Plus size={18} />
          Add Driver
        </button>
      </div>

      <Card className="p-4 border-slate-200 shadow-none">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or code..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <select value={filterVendor} onChange={(e) => setFilterVendor(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm min-w-[200px]">
            <option value="all">All Transporters</option>
            {vendors.map(v => (<option key={v.id} value={v.id}>{v.name}</option>))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden border-slate-200 shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-4 font-semibold text-slate-700">Code</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Name</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Phone</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Transporter</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Status</th>
                <th className="px-4 py-4 font-semibold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-2" />
                    <p className="text-slate-500">Memuat data pengemudi...</p>
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((d, idx) => (
                  <tr key={d.id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50 transition-colors' : 'bg-slate-50/30 hover:bg-slate-50 transition-colors'}>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-slate-600">{d.driver_code}</td>
                    <td className="px-4 py-4 font-bold text-slate-900">{d.name}</td>
                    <td className="px-4 py-4 text-slate-600">{d.phone}</td>
                    <td className="px-4 py-4 text-slate-700">{d.md_entities?.name || '-'}</td>
                    <td className="px-4 py-4">{getStatusBadge(d)}</td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <button onClick={() => handleOpenModal(d)} className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"><Edit2 size={16} /></button>
                      <button onClick={() => { setSelectedDriver(d); setIsDeleteModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal and Logic Same as Tenant Version */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-none">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-900">{selectedDriver ? 'Edit Driver' : 'Add New Driver'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Transporter *</label>
                  <select required value={formData.entity_id} onChange={(e) => setFormData({...formData, entity_id: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">Select Transporter</option>
                    {vendors.map(v => (<option key={v.id} value={v.id}>{v.name}</option>))}
                  </select>
                </div>
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name *</label>
                  <input type="text" required value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Phone *</label>
                  <input type="text" required value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">SIM Expiry *</label>
                  <input type="date" required value={formData.sim_expiry || ''} onChange={(e) => setFormData({...formData, sim_expiry: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || !formData.name || !formData.phone || !formData.entity_id} className="px-8 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold text-sm shadow-lg shadow-slate-900/20">
                  {submitting ? 'Saving...' : 'Save Driver'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 shadow-2xl border-none">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Pengemudi?</h3>
            <p className="text-slate-600 mb-8 leading-relaxed">Anda akan menghapus data pengemudi <strong className="text-slate-900">{selectedDriver?.name}</strong>.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
              <button onClick={handleDelete} disabled={submitting} className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all font-medium text-sm">
                {submitting ? 'Deleting...' : 'Ya, Hapus'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
