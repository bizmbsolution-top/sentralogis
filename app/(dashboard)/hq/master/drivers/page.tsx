'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Plus, Search, Edit2, Trash2, X, Loader2, User as DriverIcon, 
  RefreshCw, MapPin, Link2, AlertCircle, ShieldAlert,
  ChevronRight, ArrowRight, UserCircle, Camera, CheckCircle2, Navigation,
  FileText, Truck
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useStatusSync } from '@/lib/hooks/useStatusSync';
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
  sim_photo_url?: string;
  ktp_photo_url?: string;
  stnk_photo_url?: string;
  status: 'available' | 'on_duty' | 'unavailable' | 'on_road';
  is_active: boolean;
  tenant_id: string;
  entity_id: string;
  total_km_driven: number;
  total_distance_km: number;
  total_jobs_completed: number;
  total_reviews: number;
  avg_review_score: number;
  pin: string;
  photo_url: string;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_account_name?: string | null;
  md_entities: { name: string; is_vendor?: boolean; vendor_tenant_id?: string };
}

export default function HQDriversPage() {
  const { profile, loading: loadingAuth } = useAuth();
  const searchParams = useSearchParams();
  const { syncStatus, loading: syncLoading } = useStatusSync({ autoSync: false });
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vendors, setVendors] = useState<{id: string, name: string}[]>([]);
  const [activeJobs, setActiveJobs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'OWN' | 'VENDOR'>('ALL');
  const [showIssuesOnly, setShowIssuesOnly] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [tenantCodeMap, setTenantCodeMap] = useState<Record<string, string>>({});
  
  // Cross-tenant Link Profile state
  const [linkDriver, setLinkDriver] = useState<Driver | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkResult, setLinkResult] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  
  // Form State
  const [driverTypeForm, setDriverTypeForm] = useState<'INTERNAL' | 'VENDOR'>('INTERNAL');
  const [internalEntityId, setInternalEntityId] = useState<string>('');
  const [formData, setFormData] = useState({
    entity_id: '',
    name: '',
    phone: '',
    whatsapp: '',
    address: '',
    sim_number: '',
    sim_class: 'B1',
    sim_expiry: '',
    sim_photo_url: '',
    ktp_photo_url: '',
    stnk_photo_url: '',
    status: 'available',
    is_active: true,
    bank_name: '',
    bank_account: '',
    bank_account_name: '',
    pin: '',
    photo_url: '',
  });
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [simPhotoPreview, setSimPhotoPreview] = useState<string | null>(null);
  const [ktpPhotoPreview, setKtpPhotoPreview] = useState<string | null>(null);
  const [stnkPhotoPreview, setStnkPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingSim, setUploadingSim] = useState(false);
  const [uploadingKtp, setUploadingKtp] = useState(false);
  const [uploadingStnk, setUploadingStnk] = useState(false);

  useEffect(() => {
    if (profile?.tenant_id) {
      setTenantId(profile.tenant_id);
    }
  }, [profile]);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      // 1. Fetch Drivers
      const { data: driverData, error: driverError } = await supabase
        .from('md_drivers')
        .select('*, md_entities(name, is_vendor, vendor_tenant_id)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (driverError) throw driverError;

      // 2. Resolve vendor tenant codes
      const vendorTenantIds = new Set<string>();
      for (const d of driverData || []) {
        if (d.md_entities?.vendor_tenant_id)
          vendorTenantIds.add(d.md_entities.vendor_tenant_id);
      }
      if (vendorTenantIds.size > 0) {
        const { data: tenantRows } = await supabase
          .from('tenants')
          .select('id, tenant_code')
          .in('id', [...vendorTenantIds]);
        const map: Record<string, string> = {};
        for (const t of tenantRows || []) map[t.id] = t.tenant_code || '';
        setTenantCodeMap(map);
      }

      // 3. Fetch Vendors for dropdown
      const { data: vendorData } = await supabase
        .from('md_entities')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_vendor', true)
        .eq('vendor_type', 'TRANSPORTER')
        .eq('is_active', true);

      // 4. Fetch Internal HQ entity
      const { data: internalEntity } = await supabase
        .from('md_entities')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_vendor', false)
        .is('vendor_type', null)
        .limit(1)
        .maybeSingle();

      if (internalEntity) {
        setInternalEntityId(internalEntity.id);
      }

      // 5. Fetch Active Jobs to prevent N+1 queries
      const driverIds = driverData?.map(d => d.id) || [];
      const jobMap: Record<string, any> = {};
      if (driverIds.length > 0) {
        const { data: jobs } = await supabase
          .from('job_orders')
          .select('driver_id, jo_number, status, md_locations!origin_id(name), md_locations!destination_id(name)')
          .in('status', ['accepted', 'in_progress'])
          .in('driver_id', driverIds)
          .order('created_at', { ascending: false });
          
        jobs?.forEach(j => {
          const driverKey = j.driver_id as string;
          if (!jobMap[driverKey]) jobMap[driverKey] = j; // Take latest active job
        });
      }

      setVendors(vendorData || []);
      setDrivers((driverData || []) as Driver[]);
      setActiveJobs(jobMap);
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
      handleOpenModal();
    }
  }, [searchParams]);

  // Derived State (KPIs & Filtering)
  const stats = useMemo(() => {
    const total = drivers.length;
    let own = 0;
    let vendor = 0;
    let onDuty = 0;
    let issues = 0;
    const today = new Date();

    drivers.forEach(d => {
      const isVendor = d.md_entities?.is_vendor === true;
      if (isVendor) vendor++; else own++;
      
      if (d.status === 'on_duty' || d.status === 'on_road') onDuty++;
      
      // Issue detection
      let hasIssue = false;
      if (d.sim_expiry && new Date(d.sim_expiry) < today) hasIssue = true;
      if (!d.photo_url || !d.sim_photo_url) hasIssue = true;
      if (!d.pin) hasIssue = true;
      if (hasIssue) issues++;
    });

    return { total, own, vendor, onDuty, issues };
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      // Name / Phone match
      const searchMatch = 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.phone?.includes(searchTerm) ||
        d.driver_code.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!searchMatch) return false;

      // Type match
      const isVendor = d.md_entities?.is_vendor === true;
      if (filterType === 'OWN' && isVendor) return false;
      if (filterType === 'VENDOR' && !isVendor) return false;

      // Issue match
      if (showIssuesOnly) {
        const today = new Date();
        const simExpired = d.sim_expiry && new Date(d.sim_expiry) < today;
        const missingDocs = !d.photo_url || !d.sim_photo_url;
        const missingAuth = !d.pin;
        if (!simExpired && !missingDocs && !missingAuth) return false;
      }

      return true;
    });
  }, [drivers, searchTerm, filterType, showIssuesOnly]);

  const getDriverIssues = (d: Driver) => {
    const issues: string[] = [];
    const today = new Date();
    if (d.sim_expiry && new Date(d.sim_expiry) < today) issues.push("SIM EXPIRED");
    if (!d.photo_url) issues.push("NO PHOTO");
    if (!d.sim_photo_url) issues.push("NO SIM DOC");
    if (!d.pin) issues.push("NO PORTAL PIN");
    return issues;
  };

  const generateDriverCode = async () => {
    return await generateDriverCodeAction();
  };

  const handleDocUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'photo_url' | 'sim_photo_url' | 'ktp_photo_url' | 'stnk_photo_url',
    setPreview: (url: string | null) => void,
    setUploading: (v: boolean) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const prefix = field === 'photo_url' ? 'driver' : field.replace('_photo_url', '');
      const fileName = `${prefix}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('driver-portal')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('driver-portal')
        .getPublicUrl(fileName);

      setFormData({ ...formData, [field]: urlData.publicUrl });
      setPreview(urlData.publicUrl);
      const label = field === 'photo_url' ? 'Photo' : field.replace('_photo_url', '').toUpperCase();
      toast.success(`Foto ${label} uploaded!`);
    } catch (err: any) {
      toast.error('Gagal upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleOpenModal = (driver: Driver | null = null) => {
    if (driver) {
      setSelectedDriver(driver);
      const isVendor = driver.md_entities?.is_vendor === true;
      setDriverTypeForm(isVendor ? 'VENDOR' : 'INTERNAL');
      
      setFormData({
        entity_id: driver.entity_id,
        name: driver.name,
        phone: driver.phone || '',
        whatsapp: driver.whatsapp || '',
        address: driver.address || '',
        sim_number: driver.sim_number || '',
        sim_class: driver.sim_class || 'B1',
        sim_expiry: driver.sim_expiry || '',
        sim_photo_url: driver.sim_photo_url || '',
        ktp_photo_url: driver.ktp_photo_url || '',
        stnk_photo_url: driver.stnk_photo_url || '',
        status: driver.status,
        is_active: driver.is_active,
        bank_name: driver.bank_name || '',
        bank_account: driver.bank_account || '',
        bank_account_name: driver.bank_account_name || '',
        pin: driver.pin || '',
        photo_url: driver.photo_url || '',
      });
      setPhotoPreview(driver.photo_url || null);
      setSimPhotoPreview(driver.sim_photo_url || null);
      setKtpPhotoPreview(driver.ktp_photo_url || null);
      setStnkPhotoPreview(driver.stnk_photo_url || null);
    } else {
      setSelectedDriver(null);
      setDriverTypeForm('INTERNAL');
      setFormData({
        entity_id: internalEntityId,
        name: '',
        phone: '',
        whatsapp: '',
        address: '',
        sim_number: '',
        sim_class: 'B1',
        sim_expiry: '',
        sim_photo_url: '',
        ktp_photo_url: '',
        stnk_photo_url: '',
        status: 'available',
        is_active: true,
        bank_name: '',
        bank_account: '',
        bank_account_name: '',
        pin: '',
        photo_url: '',
      });
      setPhotoPreview(null);
      setSimPhotoPreview(null);
      setKtpPhotoPreview(null);
      setStnkPhotoPreview(null);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      toast.error('Identitas Tenant belum dimuat.');
      return;
    }
    
    if (!formData.sim_expiry) {
      toast.error('SIM Expiry wajib diisi');
      return;
    }
      
    // PIN required for new driver
    if (!selectedDriver && (!formData.pin || formData.pin.length !== 4)) {
      toast.error('PIN Driver Portal wajib diisi (4 digit)');
      return;
    }

    // Validation for Entity
    if (driverTypeForm === 'VENDOR' && !formData.entity_id) {
      toast.error('Silakan pilih Transporter / Vendor');
      return;
    }
    
    setSubmitting(true);

    try {
      let targetEntityId = formData.entity_id;

      // Handle OWN selection creation if internal entity missing
      if (driverTypeForm === 'INTERNAL') {
        if (!internalEntityId) {
          const companyName = profile?.tenants?.name || 'INTERNAL HQ';
          const entityCode = `INT-${companyName.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
          const { data: newEntity, error: createError } = await supabase
            .from('md_entities')
            .insert({
              tenant_id: tenantId,
              entity_code: entityCode,
              name: companyName,
              is_vendor: false,
              vendor_type: null,
              is_active: true
            })
            .select()
            .single();
          
          if (createError) throw createError;
          targetEntityId = newEntity.id;
          setInternalEntityId(newEntity.id);
        } else {
          targetEntityId = internalEntityId;
        }
      }

      const rawWa = formData.whatsapp || formData.phone || "";
      let normalizedWa = rawWa.replace(/\D/g, "");
      if (normalizedWa.startsWith("0")) {
        normalizedWa = "62" + normalizedWa.substring(1);
      }

      // Check Duplicates
      if (formData.is_active && normalizedWa) {
        const { data: existingDupe } = await supabase
          .from('md_drivers')
          .select('id, name')
          .eq('whatsapp', normalizedWa)
          .eq('is_active', true)
          .neq('id', selectedDriver?.id || '00000000-0000-0000-0000-000000000000')
          .limit(1);
          
        if (existingDupe && existingDupe.length > 0) {
          toast.error(`Nomor HP sudah digunakan oleh driver aktif lain: ${existingDupe[0].name}.`);
          return;
        }
      }

      const payload = {
        tenant_id: tenantId,
        entity_id: targetEntityId,
        name: formData.name,
        phone: formData.phone,
        whatsapp: normalizedWa,
        address: formData.address,
        sim_number: formData.sim_number,
        sim_class: formData.sim_class,
        sim_expiry: formData.sim_expiry,
        sim_photo_url: formData.sim_photo_url || null,
        ktp_photo_url: formData.ktp_photo_url || null,
        stnk_photo_url: formData.stnk_photo_url || null,
        status: formData.status,
        is_active: formData.is_active,
        bank_name: formData.bank_name || null,
        bank_account: formData.bank_account || null,
        bank_account_name: formData.bank_account_name || null,
        pin: formData.pin || null,
        photo_url: formData.photo_url || null,
      };

      if (selectedDriver) {
        const updatePayload: any = { ...payload, updated_at: new Date().toISOString() };
        if (!formData.pin) delete updatePayload.pin;

        const { data, error } = await supabase
          .from('md_drivers')
          .update(updatePayload)
          .eq('id', selectedDriver.id)
          .select('id');

        if (error) throw error;

        // Cascade driver phone updates to JOs
        const contactNumber = formData.whatsapp || formData.phone;
        await supabase
          .from('job_orders')
          .update({ driver_phone: contactNumber, updated_at: new Date().toISOString() })
          .eq('driver_id', selectedDriver.id);

        toast.success('Data pengemudi berhasil diupdate');
      } else {
        const code = await generateDriverCode();
        let { error } = await supabase.from('md_drivers').insert({ ...payload, driver_code: code });

        if (error && (error.code === '23505' || error.message?.toLowerCase().includes('unique'))) {
          const fallbackCode = `DRI/${Date.now().toString().slice(-4)}`;
          const retryRes = await supabase.from('md_drivers').insert({ ...payload, driver_code: fallbackCode });
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
          toast.error(error?.message || 'Gagal menyimpan pengemudi.');
        }
      } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDriver) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('md_drivers').delete().eq('id', selectedDriver.id);
      if (error) throw error;
      toast.success('Pengemudi berhasil dihapus');
      setIsDeleteModalOpen(false);
      setIsDrawerOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menghapus data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkProfile = async () => {
    if (!linkDriver) return;
    setLinking(true);
    setLinkResult(null);
    setLinkError(null);
    try {
      const res = await fetch('/api/driver/link-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: linkDriver.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menautkan profil');
      setLinkResult(
        `Profil kanonik dibuat/diaktifkan untuk ${linkDriver.name}. ` +
        `Login lintas-tenant aktif untuk nomor ${linkDriver.whatsapp || linkDriver.phone || '-'}.`
      );
      toast.success('Profil driver berhasil ditautkan');
      fetchData();
    } catch (error: any) {
      setLinkError(error.message || 'Gagal menautkan profil');
    } finally {
      setLinking(false);
    }
  };

  const handleSync = async () => {
    const result = await syncStatus(false);
    if (result.success && result.summary) {
      const total = result.summary.total_resets;
      if (total > 0) {
        toast.success(`Synced: ${result.summary.drivers_reset} drivers reset to available`);
        fetchData();
      } else {
        toast.success('All statuses are in sync');
      }
    } else if (result.error) {
      toast.error(`Sync failed: ${result.error}`);
    }
  };

  const openDrawer = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDrawerOpen(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <div className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">DRIVERS</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Manage all internal and vendor drivers in one place.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button 
              onClick={handleSync}
              disabled={syncLoading}
              className="h-11 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm transition-all text-sm font-bold flex items-center gap-2"
            >
              <RefreshCw size={16} className={syncLoading ? 'animate-spin' : ''} />
              SYNC
            </Button>
            <Button 
              onClick={() => handleOpenModal()}
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all text-sm font-bold flex items-center gap-2 w-full md:w-auto justify-center"
            >
              <Plus size={18} /> ADD DRIVER
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* KPI RIBBON */}
        <div className="flex flex-wrap gap-x-12 gap-y-6 mb-8 border-b border-slate-100 pb-8">
          <div>
            <p className="text-4xl font-black text-slate-900">{stats.total}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">TOTAL DRIVERS</p>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-900">{stats.own}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">OWN</p>
          </div>
          <div>
            <p className="text-4xl font-black text-slate-900">{stats.vendor}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">VENDOR</p>
          </div>
          <div>
            <p className="text-4xl font-black text-emerald-600">{stats.onDuty}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ON DUTY</p>
          </div>
          <div>
            <p className={`text-4xl font-black ${stats.issues > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{stats.issues}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ISSUES</p>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search driver name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 font-medium focus:border-slate-400 focus:ring-0 transition-colors outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
              {['ALL', 'OWN', 'VENDOR'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type as any)}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-xs font-bold tracking-wider transition-all ${
                    filterType === type 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowIssuesOnly(!showIssuesOnly)}
              className={`h-11 px-4 rounded-lg border text-xs font-bold tracking-wider transition-all w-full sm:w-auto flex items-center justify-center gap-2 ${
                showIssuesOnly 
                  ? 'bg-rose-50 border-rose-200 text-rose-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <AlertCircle size={14} />
              ISSUES
            </button>
          </div>
        </div>

        {/* DRIVER LIST / TABLE */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-slate-300 animate-spin mb-4" />
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Loading Drivers...</p>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl">
            <DriverIcon className="w-12 h-12 text-slate-200 mb-4" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Drivers Found</p>
          </div>
        ) : (
          <div className="w-full">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-900 text-[10px] uppercase tracking-widest font-black">
                    <th className="py-4 px-2">Driver</th>
                    <th className="py-4 px-2">Type</th>
                    <th className="py-4 px-2">Status</th>
                    <th className="py-4 px-2">Current Job</th>
                    <th className="py-4 px-2">Last GPS</th>
                    <th className="py-4 px-2">Issues</th>
                    <th className="py-4 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDrivers.map(d => {
                    const isVendor = d.md_entities?.is_vendor;
                    const issues = getDriverIssues(d);
                    const job = activeJobs[d.id];
                      return (
                      <tr key={d.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => openDrawer(d)}>
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-4">
                            {d.photo_url ? (
                              <img src={d.photo_url} alt={d.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                <UserCircle size={20} className="text-slate-400" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold text-slate-900 uppercase">{d.name}</p>
                              <p className="text-xs font-medium text-slate-500 mt-0.5">{d.phone || d.whatsapp || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-900 uppercase">{isVendor ? 'VENDOR' : 'OWN'}</span>
                            {isVendor && (
                              <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">{d.md_entities?.name}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          {d.status === 'on_duty' || d.status === 'on_road' ? (
                            <span className="text-xs font-black text-emerald-600 uppercase">ON DUTY</span>
                          ) : d.status === 'available' ? (
                            <span className="text-xs font-black text-slate-900 uppercase">AVAILABLE</span>
                          ) : (
                            <span className="text-xs font-black text-slate-400 uppercase">OFFLINE</span>
                          )}
                        </td>
                        <td className="py-4 px-2">
                          {job ? (
                            <div>
                              <p className="text-xs font-bold text-slate-900">{job.jo_number}</p>
                              <p className="text-[10px] font-medium text-slate-500 uppercase mt-0.5 max-w-[150px] truncate">
                                {job.md_locations?.name || '-'} → {job.md_locations_1?.name || '-'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-4 px-2">
                          {/* Placeholder for architecture restriction */}
                          <div className="flex items-center gap-1 text-slate-400">
                            <Navigation size={12} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Tied to Fleet</span>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          {issues.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {issues.map(issue => (
                                <span key={issue} className="text-[10px] font-black text-rose-600 uppercase tracking-wider">
                                  {issue}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-4 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end items-center gap-2">
                              
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleOpenModal(d); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-bold rounded-lg shadow-sm transition-all"
                              >
                                <Edit2 size={14} />
                                <span>EDIT</span>
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); openDrawer(d); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                              >
                                <FileText size={14} />
                                <span>DETAIL</span>
                              </button>
                            </div>
                          </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {filteredDrivers.map(d => {
                const isVendor = d.md_entities?.is_vendor;
                const issues = getDriverIssues(d);
                const job = activeJobs[d.id];
                      return (
                  <div key={d.id} onClick={() => openDrawer(d)} className="p-4 border border-slate-200 rounded-xl bg-white active:bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {d.photo_url ? (
                           <img src={d.photo_url} alt={d.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                           <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                             <UserCircle size={20} className="text-slate-400" />
                           </div>
                        )}
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 uppercase">{d.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-slate-600 uppercase">{isVendor ? 'VENDOR' : 'OWN'}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className={`text-[10px] font-black uppercase ${d.status === 'on_duty' ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {d.status === 'on_duty' || d.status === 'on_road' ? 'ON DUTY' : 'AVAILABLE'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="hidden"></div>
                      </div>
                      
                      {/* Mobile Actions */}
                      <div className="px-4 pb-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3" onClick={(e) => e.stopPropagation()}>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(d); }}
                          className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-bold rounded-lg shadow-sm transition-all"
                        >
                          <Edit2 size={14} />
                          <span>EDIT</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openDrawer(d); }}
                          className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                        >
                          <FileText size={14} />
                          <span>DETAIL</span>
                        </button>
                      
                    </div>
                    
                    {(job || issues.length > 0) && (
                      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                        {job && (
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">JOB</span>
                            <span className="text-xs font-bold text-slate-900">{job.jo_number}</span>
                          </div>
                        )}
                        {issues.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {issues.map(issue => (
                              <span key={issue} className="text-[9px] font-black px-2 py-1 bg-rose-50 text-rose-600 rounded uppercase tracking-wider">{issue}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* DRIVER DETAIL DRAWER */}
      {isDrawerOpen && selectedDriver && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Driver Details</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Profile Header */}
              <div className="flex items-center gap-5">
                {selectedDriver.photo_url ? (
                  <img src={selectedDriver.photo_url} alt={selectedDriver.name} className="w-20 h-20 rounded-full object-cover shadow-sm border border-slate-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                    <UserCircle size={40} className="text-slate-300" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase">{selectedDriver.name}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">{selectedDriver.phone || '-'}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1 font-mono">{selectedDriver.driver_code}</p>
                </div>
              </div>

              {/* Status / Type Blocks */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">TYPE</p>
                  <p className="text-sm font-black text-slate-900 uppercase">
                    {selectedDriver.md_entities?.is_vendor ? 'VENDOR' : 'OWN'}
                  </p>
                  {selectedDriver.md_entities?.is_vendor && (
                    <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">{selectedDriver.md_entities.name}</p>
                  )}
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">STATUS</p>
                  <p className={`text-sm font-black uppercase ${selectedDriver.status === 'on_duty' || selectedDriver.status === 'on_road' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {selectedDriver.status.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Operational & GPS */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Operational</h4>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Current Job</span>
                  <span className="font-bold text-slate-900">{activeJobs[selectedDriver.id]?.jo_number || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Last GPS</span>
                  <span className="font-bold text-slate-400">Tied to Fleet</span>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center justify-between">
                  <span>Documents</span>
                  {getDriverIssues(selectedDriver).some(i => i.includes('DOC') || i.includes('PHOTO') || i.includes('SIM')) && (
                     <ShieldAlert size={14} className="text-rose-500" />
                  )}
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 border border-slate-100 rounded-lg">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">SIM {selectedDriver.sim_class}</p>
                    {selectedDriver.sim_photo_url ? (
                      <a href={selectedDriver.sim_photo_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
                        <FileText size={12} /> View Document
                      </a>
                    ) : (
                      <span className="text-xs font-bold text-rose-500">Missing</span>
                    )}
                    <p className={`text-[10px] font-bold mt-2 uppercase ${selectedDriver.sim_expiry && new Date(selectedDriver.sim_expiry) < new Date() ? 'text-rose-500' : 'text-slate-500'}`}>
                      EXP: {selectedDriver.sim_expiry ? new Date(selectedDriver.sim_expiry).toLocaleDateString('id-ID') : '-'}
                    </p>
                  </div>
                  <div className="p-3 border border-slate-100 rounded-lg">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">KTP</p>
                    {selectedDriver.ktp_photo_url ? (
                      <a href={selectedDriver.ktp_photo_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
                        <FileText size={12} /> View Document
                      </a>
                    ) : (
                      <span className="text-xs font-bold text-slate-400">No Photo</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Performance */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">History & Performance</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-lg font-black text-slate-900">{selectedDriver.total_jobs_completed || 0}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Jobs</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-lg font-black text-slate-900">{selectedDriver.total_km_driven ? Math.floor(selectedDriver.total_km_driven).toLocaleString('id-ID') : 0}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">KM Driven</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-lg font-black text-slate-900">{selectedDriver.avg_review_score ? selectedDriver.avg_review_score.toFixed(1) : '-'}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Rating</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <Button 
                variant="secondary" 
                className="flex-1 h-12 bg-white border-slate-200 text-slate-900 font-bold"
                onClick={() => {
                  setLinkDriver(selectedDriver); 
                  setLinkResult(null); 
                  setLinkError(null); 
                  setIsLinkModalOpen(true);
                  setIsDrawerOpen(false);
                }}
              >
                <Link2 size={16} className="mr-2" /> LINK PROFILE
              </Button>
              <Button 
                className="flex-1 h-12 bg-slate-900 text-white font-bold"
                onClick={() => {
                  handleOpenModal(selectedDriver);
                  setIsDrawerOpen(false);
                }}
              >
                <Edit2 size={16} className="mr-2" /> EDIT
              </Button>
            </div>
            <div className="px-6 pb-6 bg-slate-50">
               <button 
                 onClick={() => {
                   setIsDeleteModalOpen(true);
                 }}
                 className="w-full text-xs font-bold text-rose-500 uppercase tracking-widest hover:text-rose-700 transition-colors"
               >
                 Delete Driver
               </button>
            </div>
          </div>
        </>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                {selectedDriver ? 'EDIT DRIVER' : 'ADD DRIVER'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>

            <div className="p-6 space-y-8 flex-1">
              
              {/* Step 1: TYPE SELECTION */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Driver Type</h3>
                <div className="flex gap-4">
                  <label className={`flex-1 p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    driverTypeForm === 'INTERNAL' 
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg' 
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}>
                    <input 
                      type="radio" 
                      className="hidden" 
                      name="driverType" 
                      value="INTERNAL" 
                      checked={driverTypeForm === 'INTERNAL'}
                      onChange={() => setDriverTypeForm('INTERNAL')}
                    />
                    <CheckCircle2 size={24} className={driverTypeForm === 'INTERNAL' ? 'opacity-100' : 'opacity-0'} />
                    <span className="font-black tracking-wide uppercase text-sm">Internal</span>
                  </label>
                  
                  <label className={`flex-1 p-4 border-2 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    driverTypeForm === 'VENDOR' 
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg' 
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}>
                    <input 
                      type="radio" 
                      className="hidden" 
                      name="driverType" 
                      value="VENDOR" 
                      checked={driverTypeForm === 'VENDOR'}
                      onChange={() => setDriverTypeForm('VENDOR')}
                    />
                    <Truck size={24} className={driverTypeForm === 'VENDOR' ? 'opacity-100' : 'opacity-50'} />
                    <span className="font-black tracking-wide uppercase text-sm">Vendor</span>
                  </label>
                </div>

                {driverTypeForm === 'VENDOR' && (
                  <div className="animate-in fade-in slide-in-from-top-2 mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Vendor Transporter *</label>
                    <select 
                      value={formData.entity_id} 
                      onChange={(e) => setFormData({...formData, entity_id: e.target.value})} 
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-slate-900 transition-all outline-none"
                    >
                      <option value="">Select Vendor...</option>
                      {vendors.map(v => (<option key={v.id} value={v.id}>{v.name}</option>))}
                    </select>
                  </div>
                )}
              </div>

              {/* Step 2: PERSONAL */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Personal Info</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Full Name *</label>
                    <input type="text" placeholder="Driver Full Name" value={formData.name || ''} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold uppercase focus:border-slate-900 transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Phone</label>
                    <input type="text" placeholder="08..." value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-slate-900 transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">WhatsApp</label>
                    <input type="text" placeholder="08..." value={formData.whatsapp || ''} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-slate-900 transition-all outline-none" />
                  </div>
                </div>
              </div>

              {/* Step 3: DOCUMENTS */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Documents</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">SIM Number</label>
                    <input type="text" placeholder="Nomor SIM" value={formData.sim_number || ''} onChange={(e) => setFormData({...formData, sim_number: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-slate-900 transition-all outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Class</label>
                      <select value={formData.sim_class} onChange={(e) => setFormData({...formData, sim_class: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-slate-900 transition-all outline-none">
                        {['A', 'B1', 'B2', 'C'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Expiry *</label>
                      <input type="date" required value={formData.sim_expiry || ''} onChange={(e) => setFormData({...formData, sim_expiry: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-slate-900 transition-all outline-none" />
                    </div>
                  </div>
                </div>
                
                {/* File Uploads Grid */}
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {([
                    { key: 'photo_url', label: 'PHOTO', preview: photoPreview, setPreview: setPhotoPreview, uploading: uploadingPhoto, setUploading: setUploadingPhoto },
                    { key: 'sim_photo_url', label: 'SIM', preview: simPhotoPreview, setPreview: setSimPhotoPreview, uploading: uploadingSim, setUploading: setUploadingSim },
                    { key: 'ktp_photo_url', label: 'KTP', preview: ktpPhotoPreview, setPreview: setKtpPhotoPreview, uploading: uploadingKtp, setUploading: setUploadingKtp },
                    { key: 'stnk_photo_url', label: 'STNK', preview: stnkPhotoPreview, setPreview: setStnkPhotoPreview, uploading: uploadingStnk, setUploading: setUploadingStnk },
                  ] as const).map(doc => (
                    <div key={doc.key} className="flex flex-col items-center">
                      <div className="relative w-full aspect-square">
                        {doc.preview ? (
                          <img src={doc.preview} alt={doc.label} className="w-full h-full rounded-lg object-cover border-2 border-slate-200 shadow-sm" />
                        ) : (
                          <div className="w-full h-full rounded-lg bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                            <Camera size={16} className="text-slate-300 mb-1" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{doc.label}</span>
                          </div>
                        )}
                        <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors shadow border-2 border-white">
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleDocUpload(e, doc.key as any, doc.setPreview, doc.setUploading)} disabled={doc.uploading} />
                          {doc.uploading ? <Loader2 size={12} className="text-white animate-spin" /> : <Plus size={12} className="text-white" />}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 4: AUTH & BANK */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">4. Portal Access & Bank</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">PIN Portal Driver (4 DIGIT) *</label>
                    <input type="text" placeholder="1234" maxLength={4} required={!selectedDriver} value={formData.pin || ''} onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 4)})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold tracking-widest focus:border-slate-900 transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Bank Name</label>
                    <input type="text" placeholder="BCA" value={formData.bank_name || ''} onChange={(e) => setFormData({...formData, bank_name: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-slate-900 transition-all outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Account Number</label>
                    <input type="text" placeholder="1234567890" value={formData.bank_account || ''} onChange={(e) => setFormData({...formData, bank_account: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-slate-900 transition-all outline-none" />
                  </div>
                </div>
              </div>
              
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="px-6 h-12 font-bold text-slate-600">Cancel</Button>
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || !formData.sim_expiry || (!selectedDriver && !formData.pin)} 
                className="px-8 h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold tracking-wider rounded-xl shadow-lg shadow-slate-900/20"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : selectedDriver ? 'SAVE CHANGES' : 'CREATE DRIVER'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm p-6 bg-white rounded-2xl shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase">Delete Driver?</h3>
            <p className="text-sm font-medium text-slate-600 mb-8">This action cannot be undone. Driver <strong className="text-slate-900 uppercase">{selectedDriver?.name}</strong> will be removed permanently.</p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="px-6 h-10 font-bold text-slate-600">CANCEL</Button>
              <Button onClick={handleDelete} disabled={submitting} className="px-6 h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold tracking-wider rounded-lg shadow-lg shadow-rose-600/20">
                {submitting ? 'DELETING...' : 'YES, DELETE'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LINK MODAL */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase flex items-center gap-2">
              <Link2 size={20} className="text-slate-900" /> CROSS-TENANT LINK
            </h3>
            <p className="text-sm font-medium text-slate-600 mb-6">
              Create a canonical profile for <strong className="text-slate-900 uppercase">{linkDriver?.name}</strong> using their WhatsApp number. This allows the driver to login to multiple vendors using the same phone number.
            </p>
            
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Name</span>
                <span className="font-bold text-slate-900 uppercase">{linkDriver?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">WhatsApp</span>
                <span className="font-bold text-slate-900">{linkDriver?.whatsapp || linkDriver?.phone || '-'}</span>
              </div>
            </div>

            {linkResult && <div className="mb-4 p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold">{linkResult}</div>}
            {linkError && <div className="mb-4 p-4 rounded-xl bg-rose-50 text-rose-700 text-sm font-bold">{linkError}</div>}

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsLinkModalOpen(false)} className="px-6 h-10 font-bold text-slate-600">CLOSE</Button>
              <Button onClick={handleLinkProfile} disabled={linking} className="px-6 h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold tracking-wider rounded-lg shadow-lg shadow-slate-900/20">
                {linking ? 'LINKING...' : 'LINK PROFILE'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
