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
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import GoogleMapsInput from '@/components/master/GoogleMapsInput';
import ContactFormModal from '@/components/master/ContactFormModal';

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
  address_directions: string;
}

interface Entity {
  id: string;
  entity_code: string;
  name: string;
  company_name?: string;
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
  billing_directions: string;
  billing_method: string;
  payment_terms?: string;
  notes: string;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  parent_id?: string;
  parent?: { name: string; entity_code: string };
}

export default function HQContactsPage() {
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
    billing_directions: '',
    billing_method: 'hardcopy',
    payment_terms: '',
    notes: '',
    is_active: true,
    parent_id: '',
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
    
    // Join with self to get parent name
    let query = supabase
      .from('md_entities')
      .select('*, parent:md_entities!parent_id(name, entity_code)')
      .eq('tenant_id', tenantId);
    
    if (activeTab === 'customer') query = query.eq('is_customer', true);
    else if (activeTab === 'supplier') query = query.eq('is_supplier', true);
    else if (activeTab === 'vendor') query = query.eq('is_vendor', true);
    else if (activeTab === 'broker') query = query.eq('is_broker', true);

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      toast.error('Gagal mengambil data kontak');
    } else {
      setEntities(data || []);
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
      const { data, error } = await supabase
        .from('md_entities')
        .select('entity_code')
        .eq('tenant_id', tenantId)
        .ilike('entity_code', `${prefix}/%`)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (!data || data.length === 0) return `${prefix}/001`;
      
      const lastCode = data[0].entity_code;
      const parts = lastCode.split('/');
      if (parts.length < 2) return `${prefix}/001`;
      
      const lastNumber = parseInt(parts[1]);
      if (isNaN(lastNumber)) return `${prefix}/001`;
      
      const newNumber = (lastNumber + 1).toString().padStart(3, '0');
      return `${prefix}/${newNumber}`;
    } catch (err) {
      console.error('[HQContacts] generateEntityCode Error:', err);
      // Fail-safe random code to prevent hanging
      return `${prefix}/RND-${Math.floor(Math.random() * 10000)}`;
    }
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      toast.error('Identitas Tenant belum dimuat.');
      return;
    }
    
    const toastId = toast.loading('Sedang menyimpan kontak...');
    setSubmitting(true);

    // Safety timeout to prevent infinite hang
    const timeoutId = setTimeout(() => {
      if (submitting) {
        setSubmitting(false);
        toast.error('Proses terlalu lama. Periksa koneksi internet atau coba refresh halaman.', { id: toastId });
      }
    }, 20000); // 20 seconds safety net

    console.log('[HQContacts] Starting submission...', { tenantId, name: formData.name });

    try {
      let entityId = selectedEntity?.id;

      const entityData = {
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
        billing_latitude: Number(formData.billing_latitude) || 0,
        billing_longitude: Number(formData.billing_longitude) || 0,
        billing_directions: formData.billing_directions,
        billing_method: formData.billing_method,
        payment_terms: formData.payment_terms,
        notes: formData.notes,
        is_active: formData.is_active,
        parent_id: formData.parent_id || null,
        updated_at: new Date().toISOString()
      };

      if (selectedEntity) {
        const { error } = await supabase
          .from('md_entities')
          .update(entityData)
          .eq('id', selectedEntity.id);

        if (error) throw error;
      } else {
        const code = await generateEntityCode();
        
        const { data, error } = await supabase
          .from('md_entities')
          .insert({
            ...entityData,
            tenant_id: tenantId,
            entity_code: code,
            created_at: new Date().toISOString(),
            created_by: profile?.id || null
          })
          .select('id');

        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Gagal mendapatkan ID entitas baru');
        
        entityId = data[0].id;
      }

      if (entityId) {
        // 1. Delete old addresses
        if (selectedEntity) {
          await supabase.from('md_entity_addresses').delete().eq('entity_id', entityId);
        }
        
        // 2. Insert new addresses
        const validAddresses = otherAddresses.filter(a => a.address_name && a.address);
        if (validAddresses.length > 0) {
          const addressesToInsert = validAddresses.map(addr => ({
            entity_id: entityId,
            address_name: addr.address_name,
            address_type: addr.address_type,
            address: addr.address,
            city: addr.city,
            province: addr.province,
            postal_code: addr.postal_code,
            latitude: Number(addr.latitude) || 0,
            longitude: Number(addr.longitude) || 0,
            contact_person: addr.contact_person,
            contact_phone: addr.contact_phone,
            address_directions: addr.address_directions
          }));
          
          const { error: addrError } = await supabase.from('md_entity_addresses').insert(addressesToInsert);
          if (addrError) {
             console.error('[HQContacts] Address Insert Error:', addrError);
          }
        }
      }

      clearTimeout(timeoutId);
      toast.success('Data kontak berhasil disimpan', { id: toastId });
      setIsModalOpen(false);
      fetchEntities();
    } catch (error: any) {
      clearTimeout(timeoutId);
      setSubmitting(false);
      console.error('[HQContacts] Fatal Submission Error:', error);
      // Ensure the user sees the error message
      toast.error(`Gagal menyimpan: ${error.message || 'Kesalahan Sistem'}`, { id: toastId });
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
      toast.error('Gagal menghapus data.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchOtherAddresses = async (entityId: string) => {
    const { data } = await supabase.from('md_entity_addresses').select('*').eq('entity_id', entityId);
    const normalizedData = (data || []).map(addr => ({
      ...addr,
      address_directions: addr.address_directions || '',
      contact_person: addr.contact_person || '',
      contact_phone: addr.contact_phone || '',
      address: addr.address || '',
      city: addr.city || '',
      province: addr.province || '',
      postal_code: addr.postal_code || ''
    }));
    setOtherAddresses(normalizedData);
  };

  const handleOpenModal = (entity?: Entity) => {
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
        billing_directions: entity.billing_directions || '',
        billing_method: entity.billing_method || 'hardcopy',
        payment_terms: entity.payment_terms || '',
        notes: entity.notes || '',
        is_active: entity.is_active,
        parent_id: entity.parent_id || '',
      });
      // Fetch addresses
      supabase.from('md_entity_addresses').select('*').eq('entity_id', entity.id).then(({ data }) => {
        setOtherAddresses(data || []);
      });
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
        billing_directions: '',
        billing_method: 'hardcopy',
    payment_terms: '',
    notes: '',
        is_active: true,
        parent_id: '',
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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
         <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm">
                  <Users size={22} />
               </div>
               <div>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Contact Management</p>
                  <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">Contacts</h1>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
               <div className="relative group w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                  <input 
                     type="text" 
                     placeholder="Search contact..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
                  />
               </div>

               <Button 
                  onClick={() => handleOpenModal()}
                  className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-sm flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
               >
                  <Plus size={16} /> Add Contact
               </Button>
            </div>
         </div>

         {/* Filter Tabs */}
         <div className="mt-4 flex flex-wrap items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
            {(['all', 'customer', 'supplier', 'vendor', 'broker'] as const).map(tab => (
               <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-md text-xs font-medium uppercase tracking-wide transition-all ${
                     activeTab === tab 
                     ? 'bg-slate-900 text-white shadow-sm' 
                     : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
               >
                  {tab}
               </button>
            ))}
         </div>
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
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Roles</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Contact</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {loading ? (
                        <tr>
                           <td colSpan={6} className="px-4 py-16 text-center">
                              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                              <p className="text-xs text-slate-400">Loading contacts...</p>
                           </td>
                        </tr>
                     ) : filteredEntities.length === 0 ? (
                        <tr>
                           <td colSpan={6} className="px-4 py-16 text-center">
                              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                 <Users size={24} className="text-slate-300" />
                              </div>
                              <p className="text-xs text-slate-400">No contacts found</p>
                           </td>
                        </tr>
                     ) : (
                        filteredEntities.map((ent) => (
                           <tr key={ent.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-4 py-3">
                                 <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded">
                                    {ent.entity_code}
                                 </span>
                              </td>
                              <td className="px-4 py-3">
                                 <div className="text-sm font-medium text-slate-900">{ent.name}</div>
                                 {ent.parent && (
                                   <div className="text-xs text-blue-500 mt-0.5">Child of {ent.parent.name}</div>
                                 )}
                                 <div className="text-xs text-slate-400 mt-0.5">{ent.legal_name || '-'}</div>
                              </td>
                              <td className="px-4 py-3">
                                 <div className="flex flex-wrap gap-1">
                                    {ent.is_customer && <Badge className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-medium px-2 py-0.5 rounded">Customer</Badge>}
                                    {ent.is_supplier && <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-medium px-2 py-0.5 rounded">Supplier</Badge>}
                                    {ent.is_vendor && <Badge className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-medium px-2 py-0.5 rounded">Vendor</Badge>}
                                     {ent.is_broker && <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium px-2 py-0.5 rounded">Broker</Badge>}
                                  </div>
                                  {ent.payment_terms && (
                                    <div className="text-[10px] text-emerald-600 font-medium mt-1">TOP: {ent.payment_terms}</div>
                                  )}
                               </td>
                              <td className="px-4 py-3">
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                       <Phone size={12} className="text-slate-400" />
                                       <span className="text-sm">{ent.phone || ent.mobile || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                       <Mail size={12} />
                                       <span className="text-xs truncate max-w-[180px]">{ent.email || '-'}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-4 py-3">
                                 <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                    ent.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                 }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${ent.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                    {ent.is_active ? 'Active' : 'Inactive'}
                                 </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <button 
                                       onClick={() => handleOpenModal(ent)}
                                       className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    >
                                       <Edit2 size={14} />
                                    </button>
                                    <button 
                                       onClick={() => { setSelectedEntity(ent); setIsDeleteModalOpen(true); }}
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
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Parent Entity (Optional)</label>
                    <select 
                      value={formData.parent_id || ''}
                      onChange={(e) => setFormData({...formData, parent_id: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-blue-50/20"
                    >
                      <option value="">No Parent (Main Entity)</option>
                      {entities.filter(e => e.is_customer && e.id !== selectedEntity?.id).map(p => (
                        <option key={p.id} value={p.id}>[{p.entity_code}] {p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Display Name *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. PT Maju Bersama"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>

                  {formData.is_customer && (
                    <div className="animate-in slide-in-from-top-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Billing Method</label>
                      <select 
                        value={formData.billing_method}
                        onChange={(e) => setFormData({...formData, billing_method: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-indigo-50/30"
                      >
                        <option value="hardcopy">HARDCOPY (Tunggu Dokumen Fisik)</option>
                        <option value="epod">E-POD (Langsung Tagih Setelah Scan)</option>
                      </select>
                      <p className="text-[9px] text-slate-400 mt-1 italic">Hardcopy: Butuh tanda terima SJ fisik. E-POD: Cukup verifikasi digital.</p>
                    </div>
                  )}
                  {(formData.is_customer || formData.is_vendor) && (
                    <div className="animate-in slide-in-from-top-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Payment Terms (TOP)</label>
                      <select 
                        value={formData.payment_terms}
                        onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-emerald-50/30"
                      >
                        <option value="">Select TOP...</option>
                        <option value="COD">COD (Cash on Delivery)</option>
                        <option value="7 days">7 days</option>
                        <option value="14 days">14 days</option>
                        <option value="30 days">30 days</option>
                        <option value="45 days">45 days</option>
                        <option value="60 days">60 days</option>
                        <option value="90 days">90 days</option>
                      </select>
                      <p className="text-[9px] text-slate-400 mt-1 italic">Terms of Payment — countdown starts from invoice acceptance.</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Legal Name</label>
                    <input 
                      type="text" 
                      value={formData.legal_name || ''}
                      onChange={(e) => setFormData({...formData, legal_name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">NPWP / Tax ID</label>
                    <input 
                      type="text" 
                      value={formData.tax_id || ''}
                      onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Email</label>
                    <input 
                      type="email" 
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Phone</label>
                    <input 
                      type="text" 
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">WhatsApp</label>
                    <input 
                      type="text" 
                      value={formData.whatsapp || ''}
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
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Petunjuk Alamat Penagihan</label>
                    <input 
                      type="text" 
                      value={formData.billing_directions || ''}
                      onChange={(e) => setFormData({...formData, billing_directions: e.target.value})}
                      placeholder="Contoh: Gedung A, Lantai 3, Sebelah Lift"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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
                      address_name: '', address_type: 'warehouse', address: '', city: '', province: '', postal_code: '', latitude: 0, longitude: 0, contact_person: '', contact_phone: '', address_directions: ''
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
                            value={addr.contact_person || ''}
                            onChange={(e) => {
                              const newAddrs = [...otherAddresses];
                              newAddrs[idx].contact_person = e.target.value;
                              setOtherAddresses(newAddrs);
                            }}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                          <input 
                            placeholder="Contact Phone"
                            value={addr.contact_phone || ''}
                            onChange={(e) => {
                              const newAddrs = [...otherAddresses];
                              newAddrs[idx].contact_phone = e.target.value;
                              setOtherAddresses(newAddrs);
                            }}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                        <div className="col-span-full">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Petunjuk Lokasi</label>
                          <input 
                            type="text"
                            placeholder="Contoh: Masuk dari gerbang samping, sebelah pos satpam"
                            value={addr.address_directions || ''}
                            onChange={(e) => {
                              const newAddrs = [...otherAddresses];
                              newAddrs[idx].address_directions = e.target.value;
                              setOtherAddresses(newAddrs);
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
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
