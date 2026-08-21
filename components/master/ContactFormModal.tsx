'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  X, Loader2, Info, Building2, Map as MapIcon, Plus, Trash2, Save 
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
  address_directions: string;
}

interface ContactFormModalProps {
  onClose: () => void;
  onSuccess: (newContact: any) => void;
  tenantId: string;
  initialName?: string;
}

export default function ContactFormModal({ onClose, onSuccess, tenantId, initialName }: ContactFormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [otherAddresses, setOtherAddresses] = useState<EntityAddress[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: initialName || '',
    legal_name: initialName || '',
    tax_id: '',
    email: '',
    phone: '',
    mobile: '',
    whatsapp: '',
    is_customer: true, // Default to customer if opened from WO
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
    billing_method: 'manual',
    notes: '',
    is_active: true,
    parent_id: '', // New field for Parent-Child relationship
  });

  useEffect(() => {
    const fetchParents = async () => {
      const { data } = await supabase
        .from('md_entities')
        .select('id, name, entity_code')
        .eq('tenant_id', tenantId)
        .eq('is_customer', true)
        .order('name');
      setParents(data || []);
    };
    fetchParents();
  }, [tenantId]);

  const generateEntityCode = async () => {
    // [AI] Query ALL tenants' codes to avoid global unique constraint collision
    let prefix = 'ENT';
    if (formData.is_customer) prefix = 'CUS';
    else if (formData.is_supplier) prefix = 'SPP';
    else if (formData.is_vendor) prefix = 'VND';
    else if (formData.is_broker) prefix = 'BRO';

    try {
      const { data } = await supabase
        .from('md_entities')
        .select('entity_code')
        .ilike('entity_code', `${prefix}/%`);

      const numbers = (data || [])
        .map((r) => parseInt(r.entity_code.split('/')[1]))
        .filter((n) => !isNaN(n));

      const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
      const newNumber = (maxNum + 1).toString().padStart(3, '0');
      return `${prefix}/${newNumber}`;
    } catch (err) {
      return `${prefix}/${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Nama wajib diisi');
      return;
    }
    setSubmitting(true);

    try {
      const code = await generateEntityCode();
      const payload = {
        tenant_id: tenantId,
        entity_code: code,
        ...formData,
        parent_id: formData.parent_id || null, // Ensure empty string becomes null
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: entity, error } = await (supabase
        .from('md_entities' as any) as any)
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      if (otherAddresses.length > 0) {
        const addressesToInsert = otherAddresses.map(addr => ({
          entity_id: (entity as any)?.id,
          ...addr
        }));
        await (supabase.from('md_entity_addresses' as any) as any).insert(addressesToInsert);
      }

      toast.success('Kontak berhasil disimpan');
      onSuccess(entity);
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan kontak');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <Card className="w-full max-w-5xl max-h-[95vh] overflow-y-auto shadow-2xl border-none !rounded-[2.5rem] p-0">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-900 italic uppercase">Master Contact Form</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Detailed Entity Management</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-12">
          {/* General Info */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 text-slate-900 font-black text-xs uppercase tracking-widest italic border-l-4 border-slate-900 pl-4">
              <Info size={18} /> General Information
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                {(['is_customer', 'is_supplier', 'is_vendor', 'is_broker'] as const).map(role => (
                  <label key={role} className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${formData[role] ? 'border-slate-900 bg-slate-50 text-slate-900' : 'border-slate-100 text-slate-400'}`}>
                    <input type="checkbox" className="hidden" checked={formData[role]} onChange={(e) => setFormData({...formData, [role]: e.target.checked})} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{role.replace('is_', '')}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Entity (Optional)</label>
                <select 
                  value={formData.parent_id} 
                  onChange={(e) => setFormData({...formData, parent_id: e.target.value})} 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-slate-900 transition-all"
                >
                  <option value="">No Parent (Main Entity)</option>
                  {parents.map(p => (
                    <option key={p.id} value={p.id}>[{p.entity_code}] {p.name}</option>
                  ))}
                </select>
                <p className="text-[8px] font-medium text-slate-400 px-1 italic">Use this for "Consignee" or "Child Company"</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial / Alias *</label>
                <input type="text" placeholder="e.g. TAM" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value.toUpperCase()})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
              </div>
              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name (PT/CV)</label>
                <input type="text" placeholder="e.g. PT Toyota Astra Motor" value={formData.legal_name} onChange={(e) => setFormData({...formData, legal_name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax ID / NPWP</label>
                <input type="text" value={formData.tax_id} onChange={(e) => setFormData({...formData, tax_id: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp</label>
                <input type="text" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" />
              </div>
            </div>
          </section>

          {/* Addresses */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-l-4 border-slate-900 pl-4">
              <div className="flex items-center gap-3 text-slate-900 font-black text-xs uppercase tracking-widest italic">
                <MapIcon size={18} /> Operational Addresses
              </div>
              <button 
                type="button"
                onClick={() => setOtherAddresses([...otherAddresses, { address_name: '', address_type: 'warehouse', address: '', city: '', province: '', postal_code: '', latitude: 0, longitude: 0, contact_person: '', contact_phone: '', address_directions: '' }])}
                className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1 hover:underline"
              >
                <Plus size={14} /> Add New Address
              </button>
            </div>

            <div className="space-y-4">
               {/* Billing Address as First Card */}
               <Card className="p-8 border-slate-200 shadow-none !rounded-[2rem] bg-slate-50/50 space-y-6">
                  <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded uppercase tracking-widest">Main Billing Address</span>
                  <div className="space-y-4">
                     <GoogleMapsInput 
                       defaultValue={formData.billing_address}
                       onPlaceSelect={(place) => setFormData({...formData, billing_address: place.address, billing_city: place.city, billing_province: place.province, billing_postal_code: place.postal_code, billing_latitude: place.latitude, billing_longitude: place.longitude })}
                     />
                     <input type="text" placeholder="Billing directions (e.g. Floor 5, Suite 300)" value={formData.billing_directions} onChange={(e) => setFormData({...formData, billing_directions: e.target.value})} className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium" />
                  </div>
               </Card>

               {otherAddresses.map((addr, idx) => (
                 <Card key={idx} className="p-8 border-slate-200 shadow-none !rounded-[2rem] space-y-6 relative group">
                    <button onClick={() => setOtherAddresses(otherAddresses.filter((_, i) => i !== idx))} className="absolute top-6 right-6 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={20} /></button>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-3 py-1 rounded uppercase tracking-widest">Additional Address #{idx+1}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <input placeholder="Location Name (e.g. Warehouse B)" value={addr.address_name} onChange={(e) => { const n = [...otherAddresses]; n[idx].address_name = e.target.value; setOtherAddresses(n); }} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
                       <GoogleMapsInput defaultValue={addr.address} onPlaceSelect={(place) => { const n = [...otherAddresses]; n[idx].address = place.address; n[idx].city = place.city; n[idx].province = place.province; n[idx].postal_code = place.postal_code; n[idx].latitude = place.latitude; n[idx].longitude = place.longitude; setOtherAddresses(n); }} />
                    </div>
                 </Card>
               ))}
            </div>
          </section>

          <div className="pt-8 flex justify-end gap-4 border-t border-slate-100">
            <button onClick={onClose} className="px-8 py-4 text-sm font-black text-slate-400 uppercase tracking-widest">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="px-12 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center gap-2">
              {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              SAVE FULL CONTACT
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
