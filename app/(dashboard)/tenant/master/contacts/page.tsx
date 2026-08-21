'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Plus, Search, Edit2, Trash2, X, Loader2, Users, Filter, 
  MapPin, Phone, Mail, Globe, CheckCircle2, Building2, 
  ChevronDown, Map as MapIcon, Info
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import GoogleMapsInput from '@/components/master/GoogleMapsInput';

interface EntityAddress {
  id?: string;
  address_name: string;
  address_type: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  contact_person: string;
  contact_phone: string;
}

interface Entity {
  id: string;
  entity_code: string;
  name: string;
  legal_name: string;
  tax_id: string;
  email: string;
  phone: string;
  mobile: string;
  whatsapp: string;
  is_customer: boolean;
  is_supplier: boolean;
  is_vendor: boolean;
  is_broker: boolean;
  vendor_type: string;
  billing_address: string;
  billing_city: string;
  billing_province: string;
  billing_postal_code: string;
  billing_latitude: number;
  billing_longitude: number;
  notes: string;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
}

export default function ContactsPage() {
  const { profile, loading: loadingAuth } = useAuth();
  
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'customer' | 'supplier' | 'vendor' | 'broker'>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  
  // Addresses State (within Modal)
  const [otherAddresses, setOtherAddresses] = useState<EntityAddress[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    legal_name: '',
    tax_id: '',
    email: '',
    phone: '',
    mobile: '',
    whatsapp: '',
    is_customer: false,
    is_supplier: false,
    is_vendor: false,
    is_broker: false,
    vendor_type: 'OTHER',
    billing_address: '',
    billing_city: '',
    billing_province: '',
    billing_postal_code: '',
    billing_latitude: 0,
    billing_longitude: 0,
    notes: '',
    is_active: true,
  });

  // Sync tenant info
  useEffect(() => {
    if (profile?.tenant_id) {
      setTenantId(profile.tenant_id);
    }
  }, [profile]);

  const fetchEntities = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    
    let query = supabase.from('md_entities').select('*').eq('tenant_id', tenantId);
    
    if (activeTab === 'customer') query = query.eq('is_customer', true);
    else if (activeTab === 'supplier') query = query.eq('is_supplier', true);
    else if (activeTab === 'vendor') query = query.eq('is_vendor', true);
    else if (activeTab === 'broker') query = query.eq('is_broker', true);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      toast.error('Gagal mengambil data kontak');
    } else {
      setEntities((data as any[]) || []);
    }
    setLoading(false);
  }, [tenantId, activeTab]);

  useEffect(() => {
    if (tenantId) {
      fetchEntities();
    } else if (!loadingAuth) {
      setLoading(false);
    }
  }, [tenantId, fetchEntities, loadingAuth]);

  const generateEntityCode = async () => {
    if (!tenantId) return 'ENT/001';
    
    let prefix = 'ENT';
    if (formData.is_customer) prefix = 'CUS';
    else if (formData.is_supplier) prefix = 'SPP';
    else if (formData.is_vendor) prefix = 'VND';
    else if (formData.is_broker) prefix = 'BRO';

    try {
      const { data } = await supabase
        .from('md_entities')
        .select('entity_code')
        .eq('tenant_id', tenantId)
        .ilike('entity_code', `${prefix}/%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!data || data.length === 0) return `${prefix}/001`;

      const lastCode = data[0].entity_code;
      const lastNumber = parseInt(lastCode.split('/')[1]);
      if (isNaN(lastNumber)) return `${prefix}/001`;

      const newNumber = (lastNumber + 1).toString().padStart(3, '0');
      return `${prefix}/${newNumber}`;
    } catch (err) {
      return `${prefix}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    }
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      toast.error('Identitas Tenant belum dimuat.');
      return;
    }
    
    setSubmitting(true);

    try {
      let entityId = selectedEntity?.id;

      if (selectedEntity) {
        // Update
        const { error } = await supabase
          .from('md_entities')
          .update({
            name: formData.name,
            legal_name: formData.legal_name,
            tax_id: formData.tax_id,
            email: formData.email,
            phone: formData.phone,
            mobile: formData.mobile,
            whatsapp: formData.whatsapp,
            is_customer: formData.is_customer,
            is_supplier: formData.is_supplier,
            is_vendor: formData.is_vendor,
            is_broker: formData.is_broker,
            vendor_type: formData.vendor_type,
            billing_address: formData.billing_address,
            billing_city: formData.billing_city,
            billing_province: formData.billing_province,
            billing_postal_code: formData.billing_postal_code,
            billing_latitude: formData.billing_latitude,
            billing_longitude: formData.billing_longitude,
            notes: formData.notes,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedEntity.id);

        if (error) throw error;
      } else {
        // Insert
        const code = await generateEntityCode();
        const { data, error } = await supabase
          .from('md_entities')
          .insert({
            tenant_id: tenantId,
            entity_code: code,
            name: formData.name,
            legal_name: formData.legal_name,
            tax_id: formData.tax_id,
            email: formData.email,
            phone: formData.phone,
            mobile: formData.mobile,
            whatsapp: formData.whatsapp,
            is_customer: formData.is_customer,
            is_supplier: formData.is_supplier,
            is_vendor: formData.is_vendor,
            is_broker: formData.is_broker,
            vendor_type: formData.vendor_type,
            billing_address: formData.billing_address,
            billing_city: formData.billing_city,
            billing_province: formData.billing_province,
            billing_postal_code: formData.billing_postal_code,
            billing_latitude: formData.billing_latitude,
            billing_longitude: formData.billing_longitude,
            notes: formData.notes,
            is_active: formData.is_active,
          })
          .select()
          .single();

        if (error) throw error;
        entityId = (data as any)?.id;
      }

      // Handle Other Addresses
      if (entityId) {
        // Delete old addresses if editing
        if (selectedEntity) {
          await supabase.from('md_entity_addresses').delete().eq('entity_id', entityId);
        }
        
        if (otherAddresses.length > 0) {
          const addressesToInsert = otherAddresses.map(addr => ({
            entity_id: entityId,
            address_name: addr.address_name,
            address_type: addr.address_type,
            address: addr.address,
            city: addr.city,
            province: addr.province,
            postal_code: addr.postal_code,
            latitude: addr.latitude,
            longitude: addr.longitude,
            contact_person: addr.contact_person,
            contact_phone: addr.contact_phone
          }));
          
          const { error: addrError } = await supabase.from('md_entity_addresses').insert(addressesToInsert);
          if (addrError) throw addrError;
        }
      }

      toast.success('Data kontak berhasil disimpan');
      setIsModalOpen(false);
      fetchEntities();
    } catch (error: any) {
      console.error('Submit Contact Error:', JSON.stringify(error, null, 2), error);
      toast.error(error?.message || error?.details || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEntity) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('md_entities')
        .delete()
        .eq('id', selectedEntity.id);

      if (error) throw error;
      toast.success('Kontak berhasil dihapus');
      setIsDeleteModalOpen(false);
      fetchEntities();
    } catch (error: any) {
      toast.error('Gagal menghapus data. Data ini mungkin sedang digunakan.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchOtherAddresses = async (entityId: string) => {
    const { data } = await supabase.from('md_entity_addresses').select('*').eq('entity_id', entityId);
    setOtherAddresses((data as any[]) || []);
  };

  const handleOpenModal = (entity: Entity | null = null) => {
    if (entity) {
      setSelectedEntity(entity);
      setFormData({
        name: entity.name,
        legal_name: entity.legal_name || '',
        tax_id: entity.tax_id || '',
        email: entity.email || '',
        phone: entity.phone || '',
        mobile: entity.mobile || '',
        whatsapp: entity.whatsapp || '',
        is_customer: entity.is_customer,
        is_supplier: entity.is_supplier,
        is_vendor: entity.is_vendor,
        is_broker: entity.is_broker,
        vendor_type: entity.vendor_type || 'OTHER',
        billing_address: entity.billing_address || '',
        billing_city: entity.billing_city || '',
        billing_province: entity.billing_province || '',
        billing_postal_code: entity.billing_postal_code || '',
        billing_latitude: entity.billing_latitude || 0,
        billing_longitude: entity.billing_longitude || 0,
        notes: entity.notes || '',
        is_active: entity.is_active,
      });
      fetchOtherAddresses(entity.id);
    } else {
      setSelectedEntity(null);
      setFormData({
        name: '',
        legal_name: '',
        tax_id: '',
        email: '',
        phone: '',
        mobile: '',
        whatsapp: '',
        is_customer: false,
        is_supplier: false,
        is_vendor: false,
        is_broker: false,
        vendor_type: 'OTHER',
        billing_address: '',
        billing_city: '',
        billing_province: '',
        billing_postal_code: '',
        billing_latitude: 0,
        billing_longitude: 0,
        notes: '',
        is_active: true,
      });
      setOtherAddresses([]);
    }
    setIsModalOpen(true);
  };

  const filteredEntities = entities.filter(ent => 
    ent.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ent.entity_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-slate-900" size={24} />
            Master Contacts
          </h1>
          <p className="text-sm text-slate-500 mt-1">Kelola data Customer, Supplier, Vendor, dan Broker dalam satu tempat.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium text-sm shadow-sm active:scale-95"
        >
          <Plus size={18} />
          Add Contact
        </button>
      </div>

      {/* Tabs & Search */}
      <Card className="p-4 border-slate-200 shadow-none overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {(['all', 'customer', 'supplier', 'vendor', 'broker'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === tab 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search contacts..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
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
                <th className="px-4 py-4 font-semibold text-slate-700">Name</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Types</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Phone</th>
                <th className="px-4 py-4 font-semibold text-slate-700">Email</th>
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
              ) : filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    Tidak ada data kontak ditemukan.
                  </td>
                </tr>
              ) : (
                filteredEntities.map((ent, idx) => (
                  <tr key={ent.id} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50 transition-colors' : 'bg-slate-50/30 hover:bg-slate-50 transition-colors'}>
                    <td className="px-4 py-4 font-mono text-xs font-bold text-slate-600">{ent.entity_code}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {(ent as any).logo_url ? (
                          <img src={(ent as any).logo_url} alt="" className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-100 p-0.5" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                            {ent.name ? ent.name.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-slate-900">{ent.name}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-tighter">{ent.legal_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {ent.is_customer && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-bold rounded uppercase">CUS</span>}
                        {ent.is_supplier && <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-bold rounded uppercase">SPP</span>}
                        {ent.is_vendor && <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-bold rounded uppercase">VND {ent.vendor_type !== 'OTHER' && `(${ent.vendor_type})`}</span>}
                        {ent.is_broker && <span className="px-1.5 py-0.5 bg-slate-50 text-slate-600 text-[9px] font-bold rounded uppercase">BRO</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{ent.phone || ent.mobile || '-'}</td>
                    <td className="px-4 py-4 text-slate-600">{ent.email || '-'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${ent.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {ent.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenModal(ent)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-100"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => { setSelectedEntity(ent); setIsDeleteModalOpen(true); }}
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
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border-none">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedEntity ? 'Edit Contact' : 'Add New Contact'}</h2>
                <p className="text-xs text-slate-500 mt-1">Lengkapi informasi entitas dan alamat operasional.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Basic Info Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
                  <Info size={18} />
                  <span>General Information</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="col-span-full grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['is_customer', 'is_supplier', 'is_vendor', 'is_broker'] as const).map(role => (
                      <label 
                        key={role} 
                        className={`
                          flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer select-none
                          ${formData[role] ? 'border-slate-900 bg-slate-50 text-slate-900' : 'border-slate-100 text-slate-400 hover:border-slate-200'}
                        `}
                      >
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={formData[role]}
                          onChange={(e) => setFormData({...formData, [role]: e.target.checked})}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{role.split('_')[1]}</span>
                      </label>
                    ))}
                  </div>

                  {formData.is_vendor && (
                    <div className="col-span-full animate-in slide-in-from-top-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Vendor Type</label>
                      <select 
                        value={formData.vendor_type}
                        onChange={(e) => setFormData({...formData, vendor_type: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      >
                        <option value="OTHER">OTHER</option>
                        <option value="TRANSPORTER">TRANSPORTER (Trucking)</option>
                        <option value="PBM">PBM (Bongkar Muat)</option>
                        <option value="DEPOT">DEPOT (Container)</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Display Name *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. PT Maju Bersama"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Legal Name</label>
                    <input 
                      type="text" 
                      value={formData.legal_name}
                      onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">NPWP / Tax ID</label>
                    <input 
                      type="text" 
                      value={formData.tax_id}
                      onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Phone</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">WhatsApp</label>
                    <input 
                      type="text" 
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>
              </section>

              {/* Billing Address Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
                  <MapIcon size={18} />
                  <span>Billing Address</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Address (Search Maps)</label>
                    <GoogleMapsInput 
                      defaultValue={formData.billing_address}
                      onPlaceSelect={(place) => {
                        setFormData({
                          ...formData,
                          billing_address: place.address,
                          billing_city: place.city,
                          billing_province: place.province,
                          billing_postal_code: place.postal_code,
                          billing_latitude: place.latitude,
                          billing_longitude: place.longitude
                        });
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">City</label>
                      <input 
                        type="text" 
                        value={formData.billing_city}
                        onChange={(e) => setFormData({...formData, billing_city: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Province</label>
                      <input 
                        type="text" 
                        value={formData.billing_province}
                        onChange={(e) => setFormData({...formData, billing_province: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Postal Code</label>
                      <input 
                        type="text" 
                        value={formData.billing_postal_code}
                        onChange={(e) => setFormData({...formData, billing_postal_code: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Other Addresses Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <Building2 size={18} />
                    <span>Other Addresses</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setOtherAddresses([...otherAddresses, {
                      address_name: '', address_type: 'warehouse', address: '', city: '', province: '', postal_code: '', latitude: 0, longitude: 0, contact_person: '', contact_phone: ''
                    }])}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Add Address
                  </button>
                </div>

                <div className="space-y-4">
                  {otherAddresses.map((addr, idx) => (
                    <Card key={idx} className="p-4 border-slate-100 bg-slate-50 shadow-none relative animate-in slide-in-from-right-4 duration-300">
                      <button 
                        type="button"
                        onClick={() => setOtherAddresses(otherAddresses.filter((_, i) => i !== idx))}
                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Location Name (e.g. Warehouse A)</label>
                          <input 
                            type="text" 
                            value={addr.address_name}
                            onChange={(e) => {
                              const newAddrs = [...otherAddresses];
                              newAddrs[idx].address_name = e.target.value;
                              setOtherAddresses(newAddrs);
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Search Google Maps</label>
                          <GoogleMapsInput 
                            defaultValue={addr.address}
                            onPlaceSelect={(place) => {
                              const newAddrs = [...otherAddresses];
                              newAddrs[idx].address = place.address;
                              newAddrs[idx].city = place.city;
                              newAddrs[idx].province = place.province;
                              newAddrs[idx].postal_code = place.postal_code;
                              newAddrs[idx].latitude = place.latitude;
                              newAddrs[idx].longitude = place.longitude;
                              setOtherAddresses(newAddrs);
                            }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input 
                            placeholder="Contact Person"
                            value={addr.contact_person}
                            onChange={(e) => {
                              const newAddrs = [...otherAddresses];
                              newAddrs[idx].contact_person = e.target.value;
                              setOtherAddresses(newAddrs);
                            }}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                          <input 
                            placeholder="Contact Phone"
                            value={addr.contact_phone}
                            onChange={(e) => {
                              const newAddrs = [...otherAddresses];
                              newAddrs[idx].contact_phone = e.target.value;
                              setOtherAddresses(newAddrs);
                            }}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                  {otherAddresses.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-xs italic">
                      No other addresses added yet.
                    </div>
                  )}
                </div>
              </section>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="is_active_ent"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-slate-900"
                  />
                  <label htmlFor="is_active_ent" className="text-sm font-medium text-slate-700 select-none cursor-pointer">Active Profile</label>
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
                    disabled={submitting || !formData.name}
                    className="px-8 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 active:scale-95 disabled:opacity-50 transition-all font-bold text-sm flex items-center gap-2 shadow-lg shadow-slate-900/20"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    {submitting ? 'Processing...' : 'Save Contact'}
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
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <Trash2 size={24} />
              <h3 className="text-xl font-bold">Hapus Kontak?</h3>
            </div>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Anda akan menghapus data <strong className="text-slate-900">{selectedEntity?.name}</strong>. Semua data armada dan driver yang terhubung mungkin akan terpengaruh.
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
