'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Plus, Search, Edit2, Trash2, X, Loader2, User as DriverIcon, Filter, 
  Calendar, CreditCard, Phone, MessageSquare, Camera, Upload, UserCircle,
  RefreshCw, AlertTriangle, MapPin, Star, Briefcase
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useStatusSync } from '@/lib/hooks/useStatusSync';
import { generateDriverCodeAction } from '@/lib/actions/masterCodeActions';

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
  total_km_driven: number;
  total_distance_km: number;
  total_jobs_completed: number;
  total_reviews: number;
  avg_review_score: number;
  md_entities: { name: string };
}

export default function HQDriversPage() {
  const { profile, loading: loadingAuth } = useAuth();
  const searchParams = useSearchParams();
  const { syncStatus, loading: syncLoading, lastSync, lastResult } = useStatusSync({ autoSync: false });
  
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
    bank_name: '',
    bank_account: '',
    bank_account_name: '',
    pin: '',
    photo_url: '',
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
        .eq('name', (profile?.tenants as any)?.company_name || 'INTERNAL HQ')
        .limit(1)
        .single();

      const ownEntity = internalEntity 
        ? [{ id: internalEntity.id, name: `(OWN) ${internalEntity.name}` }] 
        : [{ id: 'NEW_INTERNAL', name: `(OWN) ${(profile?.tenants as any)?.company_name || 'INTERNAL HQ'}` }];

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

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const generateDriverCode = async () => {
    return await generateDriverCodeAction();
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      toast.error('Identitas Tenant belum dimuat.');
      return;
    }
    
if (!formData.name || !formData.phone || !formData.entity_id || !formData.sim_expiry) {
        toast.error('Mohon lengkapi data wajib (Tanda *)');
        return;
      }
      
      // PIN required for new driver
      if (!selectedDriver && (!formData.pin || formData.pin.length !== 4)) {
        toast.error('PIN Driver Portal wajib diisi (4 digit)');
        return;
      }
    
    setSubmitting(true);
    console.log('Submitting driver data...', formData);

    try {
      let targetEntityId = formData.entity_id;

      // Handle OWN selection
      if (formData.entity_id === 'NEW_INTERNAL') {
          console.log('Creating new internal entity...');
          const entityCode = `INT-${((profile?.tenants as any)?.company_name || 'HQ').substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
          const { data: newEntity, error: createError } = await supabase
            .from('md_entities')
            .insert({
              tenant_id: tenantId,
              entity_code: entityCode,
              name: (profile?.tenants as any)?.company_name || 'INTERNAL HQ',
              is_vendor: false,
              is_active: true
            })
            .select()
            .single();
          
          if (createError) {
              console.error('Error creating internal entity:', createError);
              throw createError;
          }
          targetEntityId = newEntity.id;
      }

      const payload = {
        tenant_id: tenantId,
        entity_id: targetEntityId,
        name: formData.name,
        phone: formData.phone,
        whatsapp: formData.whatsapp || formData.phone,
        address: formData.address,
        sim_number: formData.sim_number,
        sim_class: formData.sim_class,
        sim_expiry: formData.sim_expiry,
        status: formData.status,
        is_active: formData.is_active,
        bank_name: formData.bank_name || null,
        bank_account: formData.bank_account || null,
        bank_account_name: formData.bank_account_name || null,
        pin: formData.pin || null,
        photo_url: formData.photo_url || null,
      };

      if (selectedDriver) {
        console.log('Updating existing driver:', selectedDriver.id);
        const { error } = await supabase
          .from('md_drivers')
          .update({
            ...payload,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedDriver.id);

        if (error) throw error;

        // [AI] Cascade phone update to all job_orders with this driver
        // Always update to ensure consistency (use whatsapp if available, else phone)
        const contactNumber = formData.whatsapp || formData.phone;
        await supabase
          .from('job_orders')
          .update({ driver_phone: contactNumber, updated_at: new Date().toISOString() })
          .eq('driver_id', selectedDriver.id);
        console.log('Cascaded phone update to job_orders for driver:', selectedDriver.id, 'new number:', contactNumber);

        toast.success('Data pengemudi berhasil diupdate');
      } else {
        console.log('Inserting new driver...');
        let code = await generateDriverCode();
        console.log('Generated code:', code);
        
        let { error } = await supabase
          .from('md_drivers')
          .insert({
            ...payload,
            driver_code: code,
          });

        if (error && (error.code === '23505' || error.message?.toLowerCase().includes('unique') || error.message?.toLowerCase().includes('duplicate'))) {
          const fallbackCode = `DRI/${Date.now().toString().slice(-4)}`;
          const retryRes = await supabase
            .from('md_drivers')
            .insert({
              ...payload,
              driver_code: fallbackCode,
            });
          if (retryRes.error) throw retryRes.error;
          error = null;
        } else if (error) {
            console.error('Supabase Insert Error:', error);
            throw error;
        }
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
        bank_name: (driver as any).bank_name || '',
        bank_account: (driver as any).bank_account || '',
        bank_account_name: (driver as any).bank_account_name || '',
        pin: (driver as any).pin || '',
        photo_url: (driver as any).photo_url || '',
      });
      setPhotoPreview((driver as any).photo_url || null);
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
        bank_name: '',
        bank_account: '',
        bank_account_name: '',
        pin: '',
        photo_url: '',
      });
      setPhotoPreview(null);
    }
    setIsModalOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `driver-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('driver-portal')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('driver-portal')
        .getPublicUrl(fileName);

      setFormData({ ...formData, photo_url: urlData.publicUrl });
      setPhotoPreview(urlData.publicUrl);
      toast.success('Photo uploaded!');
    } catch (err: any) {
      toast.error('Gagal upload photo: ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const getStatusBadge = (driver: Driver) => {
    const today = new Date();
    const simExpiry = new Date(driver.sim_expiry);
    if (simExpiry < today) return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full uppercase tracking-wider">SIM Expired</span>;
    
    switch (driver.status) {
      case 'available': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Available</span>;
      case 'on_duty': return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">On Duty</span>;
      default: return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Unavailable</span>;
    }
  };

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.driver_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesVendor = true;
    if (filterVendor !== 'all') {
      if (filterVendor === 'OWN') {
        matchesVendor = (d.md_entities as any)?.is_vendor === false;
      } else {
        matchesVendor = d.entity_id === filterVendor;
      }
    }
    
    return matchesSearch && matchesVendor;
  });

  const handleSync = async () => {
    const result = await syncStatus(false);
    if (result.success && result.summary) {
      const total = result.summary.total_resets;
      if (total > 0) {
        toast.success(`Synced: ${result.summary.drivers_reset} drivers, ${result.summary.fleets_reset} fleets reset to available`);
        fetchData(); // Refresh the driver list
      } else {
        toast.success('All statuses are in sync');
      }
    } else if (result.error) {
      toast.error(`Sync failed: ${result.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
         <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-sm">
                  <DriverIcon size={22} />
               </div>
               <div>
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Driver Management</p>
                  <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">Drivers</h1>
               </div>
            </div>

             <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                <button
                  onClick={handleSync}
                  disabled={syncLoading}
                  className="h-10 px-4 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 text-slate-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                  title="Sync driver/fleet statuses"
                >
                  <RefreshCw size={16} className={syncLoading ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">Sync Status</span>
                </button>

                <div className="relative group w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
                  <input 
                     type="text" 
                     placeholder="Search driver..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all outline-none"
                  />
               </div>

               <Button 
                  onClick={() => handleOpenModal()}
                  className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm shadow-sm flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
               >
                  <Plus size={16} /> Add Driver
               </Button>
            </div>
         </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
             <div className="flex items-center gap-2 px-3 border-r border-slate-200">
                <Filter size={14} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Transporter:</span>
             </div>
             <select 
               value={filterVendor}
               onChange={(e) => setFilterVendor(e.target.value)}
               className="bg-transparent text-sm text-slate-700 outline-none cursor-pointer"
             >
               <option value="all">All Transporters</option>
               {vendors.map(v => (
                 <option key={v.id} value={v.id}>{v.name}</option>
               ))}
             </select>

              {/* Status Summary */}
              <div className="ml-auto flex items-center gap-4 text-xs">
                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                  Available: {drivers.filter(d => d.status === 'available').length}
                </span>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                  On Duty: {drivers.filter(d => d.status === 'on_duty').length}
                </span>
                <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded-full font-medium">
                  Unavailable: {drivers.filter(d => d.status === 'unavailable').length}
                </span>
                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium flex items-center gap-1">
                  <MapPin size={10} />
                  Total: {drivers.reduce((sum, d) => sum + (d.total_km_driven || 0), 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })} km
                </span>
              </div>
          </div>

          {/* Last Sync Info */}
          {lastSync && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw size={12} />
              <span>Last synced: {lastSync.toLocaleTimeString()}</span>
              {lastResult?.summary && lastResult.summary.total_resets > 0 && (
                <span className="text-emerald-600 font-medium">
                  ({lastResult.summary.drivers_reset} drivers, {lastResult.summary.fleets_reset} fleets reset)
                </span>
              )}
            </div>
          )}
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto">
         <Card className="overflow-hidden border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                         <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Code</th>
                         <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Name</th>
                         <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Contact</th>
                         <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Transporter</th>
                         <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                         <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Performance</th>
                         <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {loading ? (
                         <tr>
                            <td colSpan={7} className="px-4 py-16 text-center">
                               <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                               <p className="text-xs text-slate-400">Loading drivers...</p>
                            </td>
                         </tr>
                      ) : filteredDrivers.length === 0 ? (
                         <tr>
                            <td colSpan={7} className="px-4 py-16 text-center">
                              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                 <DriverIcon size={24} className="text-slate-300" />
                              </div>
                              <p className="text-xs text-slate-400">No drivers found</p>
                           </td>
                        </tr>
                     ) : (
                        filteredDrivers.map((d) => (
                           <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-4 py-3">
                                 <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded">
                                    {d.driver_code}
                                 </span>
                              </td>
                              <td className="px-4 py-3">
                                 <div className="flex items-center gap-3">
                                   {(d as any).photo_url ? (
                                     <img src={(d as any).photo_url} alt={d.name} className="w-9 h-9 rounded-full object-cover" />
                                   ) : (
                                     <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                                       <UserCircle size={18} className="text-slate-400" />
                                     </div>
                                   )}
                                   <div>
                                     <div className="text-sm font-medium text-slate-900">{d.name}</div>
                                     <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                        <span>SIM {d.sim_class || '-'}</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <span>{d.sim_expiry ? new Date(d.sim_expiry).toLocaleDateString('id-ID') : '-'}</span>
                                     </div>
                                   </div>
                                 </div>
                              </td>
                              <td className="px-4 py-3">
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                       <Phone size={12} className="text-slate-400" />
                                       <span className="text-sm">{d.phone || 'N/A'}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-4 py-3">
                                 <div className="text-sm text-slate-700">{d.md_entities?.name || 'Private HQ'}</div>
                              </td>
                               <td className="px-4 py-3">
                                  {getStatusBadge(d)}
                               </td>
                               <td className="px-4 py-3 text-right">
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1 text-xs text-slate-600">
                                      <MapPin size={11} className="text-blue-500" />
                                      <span className="font-semibold">{(d.total_km_driven || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })} km</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                      <Briefcase size={11} className="text-slate-400" />
                                      <span>{d.total_jobs_completed || 0} jobs</span>
                                    </div>
                                    {d.total_reviews > 0 ? (
                                      <div className="flex items-center gap-0.5 text-xs">
                                        <Star size={10} className="fill-amber-400 text-amber-400" />
                                        <span className="font-medium text-slate-700">{(d.avg_review_score || 0).toFixed(1)}</span>
                                        <span className="text-slate-400">({d.total_reviews})</span>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">No reviews</span>
                                    )}
                                  </div>
                               </td>
                               <td className="px-4 py-3 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <button 
                                       onClick={() => handleOpenModal(d)}
                                       className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                    >
                                       <Edit2 size={14} />
                                    </button>
                                    <button 
                                       onClick={() => { setSelectedDriver(d); setIsDeleteModalOpen(true); }}
                                       className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                    >
                                       <Trash2 size={14} />
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
      </div>

      {/* Modal and Logic Same as Tenant Version */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-none">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-900">{selectedDriver ? 'Edit Driver' : 'Add New Driver'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* Photo Upload */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Driver" className="w-28 h-28 rounded-2xl object-cover border-4 border-emerald-100 shadow-lg" />
                  ) : (
                    <div className="w-28 h-28 rounded-2xl bg-slate-100 border-4 border-dashed border-slate-300 flex items-center justify-center">
                      <UserCircle size={48} className="text-slate-400" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-600 transition-colors shadow-lg border-4 border-white">
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                    {uploadingPhoto ? <Loader2 size={18} className="text-white animate-spin" /> : <Camera size={18} className="text-white" />}
                  </label>
                </div>
                <p className="text-xs font-bold text-slate-400 mt-2 uppercase">Foto Profile</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Transporter *</label>
                  <select required value={formData.entity_id} onChange={(e) => setFormData({...formData, entity_id: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-emerald-500 transition-all outline-none">
                    <option value="">Select Transporter</option>
                    {vendors.map(v => (<option key={v.id} value={v.id}>{v.name}</option>))}
                  </select>
                </div>
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name *</label>
                  <input type="text" placeholder="Driver Full Name" required value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black uppercase focus:border-emerald-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Phone *</label>
                  <input type="text" placeholder="628xxxx" required value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-emerald-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">WhatsApp</label>
                  <input type="text" placeholder="628xxxx" value={formData.whatsapp || ''} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-emerald-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">SIM Number</label>
                  <input type="text" placeholder="SIM ID Number" value={formData.sim_number || ''} onChange={(e) => setFormData({...formData, sim_number: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-emerald-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">SIM Class</label>
                  <select value={formData.sim_class} onChange={(e) => setFormData({...formData, sim_class: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-emerald-500 transition-all outline-none">
                    {['A', 'B1', 'B2', 'C'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">SIM Expiry *</label>
                  <input type="date" required value={formData.sim_expiry || ''} onChange={(e) => setFormData({...formData, sim_expiry: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-emerald-500 transition-all outline-none" />
                </div>

                {/* PIN for Driver Portal - Required for new driver */}
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                    PIN Driver Portal (4 digit) <span className="text-red-500">*</span>
                  </label>
                  <input type="text" placeholder="1234" maxLength={4} required={!selectedDriver} value={formData.pin || ''} onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 4)})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-emerald-500 transition-all outline-none" />
                </div>

                {/* Bank Details */}
                <div className="col-span-full mt-2 pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Informasi Rekening</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nama Bank</label>
                  <input type="text" placeholder="BCA" value={formData.bank_name || ''} onChange={(e) => setFormData({...formData, bank_name: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-emerald-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nomor Rekening</label>
                  <input type="text" placeholder="1234567890" value={formData.bank_account || ''} onChange={(e) => setFormData({...formData, bank_account: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-emerald-500 transition-all outline-none" />
                </div>
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nama Pemilik Rekening</label>
                  <input type="text" placeholder="Nama sesuai rekening" value={formData.bank_account_name || ''} onChange={(e) => setFormData({...formData, bank_account_name: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-emerald-500 transition-all outline-none" />
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || !formData.name || !formData.phone || !formData.entity_id || (!selectedDriver && !formData.pin)} className="px-8 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold text-sm shadow-lg shadow-slate-900/20">
                  {submitting ? 'Saving...' : selectedDriver ? 'Update Driver' : 'Create Driver'}
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
