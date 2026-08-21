'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  X, Save, Loader2, Image as ImageIcon, Trash2, 
  Upload, CheckCircle2, Box, Info, Truck, ShieldCheck, ThermometerSnowflake
} from 'lucide-react';

interface ProductFormModalProps {
  editId?: string | null;
  onClose: () => void;
  onSuccess: (data?: any) => void;
}

const TABS = ['Basic Info', 'Commodity Attributes', 'Dimensions & UOM', 'Storage & Rules', 'Images'];

export default function ProductFormModal({ editId, onClose, onSuccess }: ProductFormModalProps) {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    sku_code: '',
    name: '',
    customer_id: '',
    category_id: '',
    dynamic_attributes: [] as { key: string, value: string }[],
    brand_name: '',
    manufacturer: '',
    upc_code: '',
    ean_code: '',
    hs_code: '',
    
    // Dimensions
    weight_kg: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    
    // UOM
    base_uom: 'PCS',
    default_inbound_uom: 'PALLET',
    default_outbound_uom: 'BOX',
    uom_conversions: [] as any[],
    
    // Storage
    storage_rule: 'FIFO',
    min_stock_level: '0',
    max_stock_level: '',
    reorder_point: '0',
    lead_time_days: '0',
    
    // Flags
    is_hazardous: false,
    requires_cold_storage: false,
    
    // Handling Rules
    requires_qc: false,
    print_barcode_on_inbound: true,
    is_fragile: false,
    temperature_min: '',
    temperature_max: '',

    // Images
    image_urls: [] as string[]
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState('');

  const [uoms, setUoms] = useState<any[]>([]);
  const [isAddingUom, setIsAddingUom] = useState(false);
  const [newUomName, setNewUomName] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchCategories();
    fetchUoms();
    if (editId) fetchProduct();
  }, [editId, profile?.tenant_id]);

  const fetchUoms = async () => {
    const { data } = await supabase.from('md_uoms').select('id, name').order('name');
    setUoms(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from('md_product_categories').select('id, name, parent_id').order('name');
    setCategories(data || []);
  };

  const fetchCustomers = async () => {
    if (!profile?.tenant_id) return;
    const { data } = await supabase.from('md_entities').select('id, name, entity_code').eq('tenant_id', profile.tenant_id).eq('is_customer', true);
    setCustomers(data || []);
  };

  const buildCategoryOptions = (cats: any[], parentId: string | null = null, prefix = ''): any[] => {
    let result: any[] = [];
    cats.filter(c => c.parent_id === parentId).forEach(c => {
      result.push({ ...c, formattedName: `${prefix}${c.name}` });
      result = result.concat(buildCategoryOptions(cats, c.id, `${prefix}${c.name} > `));
    });
    return result;
  };
  const categoryOptions = buildCategoryOptions(categories);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('md_product_skus').select('*').eq('id', editId as string).single();
      if (error) throw error;

      const safeData: Record<string, any> = { ...data };
      Object.keys(safeData).forEach(key => {
        if (safeData[key] === null) safeData[key] = '';
      });
      
      const rules = typeof safeData.handling_rules === 'string' && safeData.handling_rules ? JSON.parse(safeData.handling_rules) : (safeData.handling_rules || {});
      const conversions = typeof safeData.uom_conversions === 'string' && safeData.uom_conversions ? JSON.parse(safeData.uom_conversions) : (safeData.uom_conversions || []);
      const images = typeof safeData.image_urls === 'string' && safeData.image_urls ? JSON.parse(safeData.image_urls) : (safeData.image_urls || []);

      setFormData(prev => ({
        ...prev,
        ...safeData,
        weight_kg: safeData.weight_kg || '',
        length_cm: safeData.length_cm || '',
        width_cm: safeData.width_cm || '',
        height_cm: safeData.height_cm || '',
        min_stock_level: safeData.min_stock_level || '0',
        max_stock_level: safeData.max_stock_level || '',
        reorder_point: safeData.reorder_point || '0',
        lead_time_days: safeData.lead_time_days || '0',
        uom_conversions: conversions,
        image_urls: images,
        requires_qc: rules.requires_qc || false,
        print_barcode_on_inbound: rules.print_barcode_on_inbound ?? true,
        is_fragile: rules.is_fragile || false,
        temperature_min: rules.temperature_min || '',
        temperature_max: rules.temperature_max || '',
        category_id: safeData.category_id || '',
        dynamic_attributes: safeData.dynamic_attributes ? Object.entries(safeData.dynamic_attributes).map(([k, v]) => ({ key: k, value: String(v) })) : [],
      }));
    } catch (err) {
      toast.error('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (formData.image_urls.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setSaving(true);
    const newUrls = [...formData.image_urls];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${profile?.tenant_id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('product-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('product-photos').getPublicUrl(fileName);
        newUrls.push(publicUrl);
      }
      setFormData({ ...formData, image_urls: newUrls });
      toast.success('Images uploaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload images');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAddUom = async () => {
    if (!newUomName.trim()) return;
    if (!profile?.tenant_id) return;
    
    setSaving(true);
    try {
      const payload = {
        tenant_id: profile.tenant_id,
        name: newUomName.trim().toUpperCase(),
      };
      const { data, error } = await supabase.from('md_uoms').insert([payload]).select('id, name').single();
      if (error) throw error;
      
      setUoms([...uoms, data].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData({ ...formData, base_uom: data.name });
      setIsAddingUom(false);
      setNewUomName('');
      toast.success('UOM added');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add UOM');
    } finally {
      setSaving(false);
    }
  };

  const removeImage = (index: number) => {
    const newUrls = [...formData.image_urls];
    newUrls.splice(index, 1);
    setFormData({ ...formData, image_urls: newUrls });
  };

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    if (!profile?.tenant_id) return;
    
    setSaving(true);
    try {
      const payload = {
        tenant_id: profile.tenant_id,
        name: newCategoryName.trim(),
        parent_id: newCategoryParentId || null
      };
      const { data, error } = await supabase.from('md_product_categories').insert([payload]).select('id, name, parent_id').single();
      if (error) throw error;
      
      setCategories([...categories, data].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData({ ...formData, category_id: data.id });
      setIsAddingCategory(false);
      setNewCategoryName('');
      setNewCategoryParentId('');
      toast.success('Category added');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add category');
    } finally {
      setSaving(false);
    }
  };

  const addUomConversion = () => {
    setFormData({
      ...formData,
      uom_conversions: [...formData.uom_conversions, { from_uom: '', to_uom: formData.base_uom, multiplier: '' }]
    });
  };

  const handleSubmit = async () => {
    if (!profile?.tenant_id) return;
    if (!formData.sku_code || !formData.name) {
      toast.error('SKU Code and Name are required');
      return;
    }

    setSaving(true);
    try {
      const volume_m3 = (Number(formData.length_cm) * Number(formData.width_cm) * Number(formData.height_cm)) / 1000000;
      
      const payload = {
        tenant_id: profile.tenant_id,
        sku_code: formData.sku_code,
        name: formData.name,
        unit: formData.default_inbound_uom || formData.base_uom || 'PCS',
        customer_id: formData.customer_id || null,
        category_id: formData.category_id || null,
        brand_name: formData.brand_name,
        manufacturer: formData.manufacturer,
        upc_code: formData.upc_code,
        ean_code: formData.ean_code,
        hs_code: formData.hs_code,
        
        dynamic_attributes: formData.dynamic_attributes.reduce((acc, curr) => {
          if (curr.key) acc[curr.key] = curr.value;
          return acc;
        }, {} as Record<string, string>),
        
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
        length_cm: formData.length_cm ? Number(formData.length_cm) : null,
        width_cm: formData.width_cm ? Number(formData.width_cm) : null,
        height_cm: formData.height_cm ? Number(formData.height_cm) : null,
        volume_m3: volume_m3 > 0 ? volume_m3 : null,
        
        base_uom: formData.base_uom,
        default_inbound_uom: formData.default_inbound_uom,
        default_outbound_uom: formData.default_outbound_uom,
        uom_conversions: JSON.stringify(formData.uom_conversions),
        
        storage_rule: formData.storage_rule,
        min_stock_level: Number(formData.min_stock_level) || 0,
        max_stock_level: formData.max_stock_level ? Number(formData.max_stock_level) : null,
        reorder_point: Number(formData.reorder_point) || 0,
        lead_time_days: Number(formData.lead_time_days) || 0,
        
        is_hazardous: formData.is_hazardous,
        requires_cold_storage: formData.requires_cold_storage,
        
        handling_rules: JSON.stringify({
          requires_qc: formData.requires_qc,
          print_barcode_on_inbound: formData.print_barcode_on_inbound,
          is_fragile: formData.is_fragile,
          temperature_min: formData.temperature_min,
          temperature_max: formData.temperature_max
        }),
        
        image_urls: JSON.stringify(formData.image_urls)
      };

      if (editId) {
        const { error } = await supabase.from('md_product_skus').update(payload).eq('id', editId);
        if (error) throw error;
        toast.success('SKU Updated');
        onSuccess();
      } else {
        const { data, error } = await supabase.from('md_product_skus').insert({ ...payload, created_by: profile.id }).select().single();
        if (error) throw error;
        toast.success('SKU Created');
        onSuccess(data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save SKU');
    } finally {
      setSaving(false);
    }
  };

  const renderBasicInfo = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">SKU Code *</label>
          <input 
            type="text" 
            value={formData.sku_code || ''} 
            onChange={e => setFormData({...formData, sku_code: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold uppercase"
            placeholder="e.g. AQUA-600ML"
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Product Name *</label>
          <input 
            type="text" 
            value={formData.name || ''} 
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold"
            placeholder="e.g. Air Mineral Aqua 600ml"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Customer / Owner</label>
          <select 
            value={formData.customer_id || ''} 
            onChange={e => setFormData({...formData, customer_id: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold"
          >
            <option value="">-- Shared / 3PL Owned --</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Brand Name</label>
          <input 
            type="text" 
            value={formData.brand_name || ''} 
            onChange={e => setFormData({...formData, brand_name: e.target.value})}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold"
          />
        </div>
        <div>
          <div className="flex items-center justify-between ml-1 mb-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Category</label>
            {!isAddingCategory && (
              <button 
                type="button" 
                onClick={() => setIsAddingCategory(true)}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
              >
                + Tambah Kategori
              </button>
            )}
          </div>
          {isAddingCategory ? (
            <div className="flex flex-col gap-2">
              <select 
                value={newCategoryParentId} 
                onChange={e => setNewCategoryParentId(e.target.value)}
                className="w-full px-4 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">-- As Root Category --</option>
                {categoryOptions.map(c => <option key={c.id} value={c.id}>{c.formattedName}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newCategoryName} 
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="New Category Name"
                  className="flex-1 px-4 py-3 bg-indigo-50/50 border border-indigo-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-600"
                  autoFocus
                />
                <button 
                  type="button" 
                  onClick={handleQuickAddCategory}
                  disabled={saving || !newCategoryName.trim()}
                  className="px-4 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold disabled:opacity-50"
                >
                  Save
                </button>
                <button 
                  type="button" 
                  onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); setNewCategoryParentId(''); }}
                  className="px-3 py-3 text-slate-400 hover:bg-slate-100 rounded-2xl"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            <select 
              value={formData.category_id || ''} 
              onChange={e => setFormData({...formData, category_id: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold"
            >
              <option value="">-- Select Category --</option>
              {categoryOptions.map(c => <option key={c.id} value={c.id}>{c.formattedName}</option>)}
            </select>
          )}
        </div>
        <div className="col-span-2 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2"><Box size={14} /> International Barcodes</p>
          <div className="grid grid-cols-3 gap-4">
            <input type="text" placeholder="UPC Code" value={formData.upc_code || ''} onChange={e => setFormData({...formData, upc_code: e.target.value})} className="w-full px-3 py-2 bg-white rounded-xl text-xs font-mono" />
            <input type="text" placeholder="EAN Code" value={formData.ean_code || ''} onChange={e => setFormData({...formData, ean_code: e.target.value})} className="w-full px-3 py-2 bg-white rounded-xl text-xs font-mono" />
            <input type="text" placeholder="HS Code" value={formData.hs_code || ''} onChange={e => setFormData({...formData, hs_code: e.target.value})} className="w-full px-3 py-2 bg-white rounded-xl text-xs font-mono" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAttributes = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
       <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3 mb-6">
          <Info className="text-indigo-600 mt-0.5" size={16} />
          <div>
            <p className="text-xs font-bold text-indigo-900">Dynamic Commodity Attributes</p>
            <p className="text-[10px] text-indigo-700 mt-1">Define specific parameters for this commodity (e.g., Size, Color, Voltage, Material, Flavor).</p>
          </div>
       </div>

       <div className="p-4 border border-slate-200 rounded-2xl bg-white">
          <div className="flex justify-between items-center mb-4">
             <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Attributes List</span>
             <button onClick={() => setFormData({...formData, dynamic_attributes: [...formData.dynamic_attributes, {key: '', value: ''}]})} className="text-[10px] font-bold text-indigo-600 hover:underline px-3 py-1 bg-indigo-50 rounded-lg">+ Add Attribute</button>
          </div>
          {formData.dynamic_attributes.map((attr, idx) => (
             <div key={idx} className="flex items-center gap-3 mb-3">
                <input type="text" placeholder="Attribute Key (e.g. Size)" value={attr.key || ''} onChange={e => {
                   const newAttr = [...formData.dynamic_attributes];
                   newAttr[idx].key = e.target.value;
                   setFormData({...formData, dynamic_attributes: newAttr});
                }} className="flex-1 px-4 py-2 bg-slate-50 rounded-xl text-xs font-bold border border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" />
                <span className="text-xs font-black text-slate-400">:</span>
                <input type="text" placeholder="Value (e.g. XL)" value={attr.value || ''} onChange={e => {
                   const newAttr = [...formData.dynamic_attributes];
                   newAttr[idx].value = e.target.value;
                   setFormData({...formData, dynamic_attributes: newAttr});
                }} className="flex-1 px-4 py-2 bg-slate-50 rounded-xl text-xs font-bold border border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400" />
                <button onClick={() => {
                   const newAttr = [...formData.dynamic_attributes];
                   newAttr.splice(idx, 1);
                   setFormData({...formData, dynamic_attributes: newAttr});
                }} className="p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors"><Trash2 size={16} /></button>
             </div>
          ))}
          {formData.dynamic_attributes.length === 0 && <p className="text-[10px] text-slate-400 italic text-center py-4">No custom attributes added yet.</p>}
       </div>
    </div>
  );

  const renderDimensions = () => {
    const volM3 = (Number(formData.length_cm || 0) * Number(formData.width_cm || 0) * Number(formData.height_cm || 0)) / 1000000;
    
    return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div>
         <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Physical Dimensions (Base Unit)</h4>
         <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">Weight (kg)</label>
              <input type="number" value={formData.weight_kg || ''} onChange={e => setFormData({...formData, weight_kg: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">Length (cm)</label>
              <input type="number" value={formData.length_cm || ''} onChange={e => setFormData({...formData, length_cm: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">Width (cm)</label>
              <input type="number" value={formData.width_cm || ''} onChange={e => setFormData({...formData, width_cm: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">Height (cm)</label>
              <input type="number" value={formData.height_cm || ''} onChange={e => setFormData({...formData, height_cm: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
            </div>
         </div>
         
         <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Base Unit Volume</p>
               <p className="text-[9px] text-emerald-600 mt-0.5">Calculated from L x W x H</p>
            </div>
            <div className="text-right">
               <span className="text-xl font-black text-emerald-700">{volM3.toFixed(6)}</span>
               <span className="text-[10px] font-bold text-emerald-600 ml-1 uppercase">CBM (m³)</span>
            </div>
         </div>
      </div>

      <div className="h-px bg-slate-100 my-4"></div>

      <div>
         <div className="flex justify-between items-end mb-3">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit of Measurement (UOM) Strategy</h4>
           {!isAddingUom ? (
             <button type="button" onClick={() => setIsAddingUom(true)} className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1">+ Add New UOM</button>
           ) : (
             <div className="flex items-center gap-2">
               <input type="text" value={newUomName} onChange={e => setNewUomName(e.target.value.toUpperCase())} placeholder="e.g. LITER" className="px-3 py-1 border border-indigo-200 bg-indigo-50/50 rounded-lg text-xs uppercase font-bold" autoFocus />
               <button type="button" onClick={handleQuickAddUom} disabled={!newUomName.trim() || saving} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">Save</button>
               <button type="button" onClick={() => {setIsAddingUom(false); setNewUomName('');}} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={14} /></button>
             </div>
           )}
         </div>
         <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">Base UOM (Terkecil)</label>
              <select value={formData.base_uom || ''} onChange={e => setFormData({...formData, base_uom: e.target.value})} className="w-full px-4 py-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm font-black uppercase">
                <option value="">-- Select --</option>
                {uoms.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">Default Inbound</label>
              <select value={formData.default_inbound_uom || ''} onChange={e => setFormData({...formData, default_inbound_uom: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase">
                <option value="">-- Select --</option>
                {uoms.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 mb-1 block">Default Outbound</label>
              <select value={formData.default_outbound_uom || ''} onChange={e => setFormData({...formData, default_outbound_uom: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase">
                <option value="">-- Select --</option>
                {uoms.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
         </div>

         <div className="p-4 border border-slate-200 rounded-2xl bg-white">
            <div className="flex justify-between items-center mb-3">
               <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">UOM Conversions</span>
               <button onClick={addUomConversion} className="text-[10px] font-bold text-blue-600 hover:underline">+ Add Conversion</button>
            </div>
            {formData.uom_conversions.map((conv, idx) => (
               <div key={idx} className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold text-slate-400 w-8">1</span>
                  <select value={conv.from_uom || ''} onChange={e => {
                     const newConv = [...formData.uom_conversions];
                     newConv[idx].from_uom = e.target.value;
                     setFormData({...formData, uom_conversions: newConv});
                  }} className="flex-1 px-3 py-2 bg-slate-50 rounded-xl text-xs font-bold uppercase border border-slate-200">
                    <option value="">-- From UOM --</option>
                    {uoms.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                  <span className="text-xs font-black text-slate-400">=</span>
                  <input type="number" placeholder="Multiplier" value={conv.multiplier || ''} onChange={e => {
                     const newConv = [...formData.uom_conversions];
                     newConv[idx].multiplier = e.target.value;
                     setFormData({...formData, uom_conversions: newConv});
                  }} className="w-24 px-3 py-2 bg-slate-50 rounded-xl text-xs font-bold border border-slate-200" />
                  <select value={conv.to_uom || ''} onChange={e => {
                     const newConv = [...formData.uom_conversions];
                     newConv[idx].to_uom = e.target.value;
                     setFormData({...formData, uom_conversions: newConv});
                  }} className="flex-1 px-3 py-2 bg-slate-50 rounded-xl text-xs font-bold uppercase border border-slate-200">
                    <option value="">-- To UOM --</option>
                    {uoms.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                  <button onClick={() => {
                     const newConv = [...formData.uom_conversions];
                     newConv.splice(idx, 1);
                     setFormData({...formData, uom_conversions: newConv});
                  }} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg"><Trash2 size={14} /></button>
               </div>
            ))}
            {formData.uom_conversions.length === 0 && <p className="text-[10px] text-slate-400 italic">No conversions added.</p>}
         </div>
      </div>
    </div>
    );
  };

  const renderStorage = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
       <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Storage Routing Rule</label>
            <select value={formData.storage_rule || ''} onChange={e => setFormData({...formData, storage_rule: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold">
               <option value="FIFO">FIFO (First In First Out)</option>
               <option value="FEFO">FEFO (First Expired First Out)</option>
               <option value="LIFO">LIFO/LEFO (Last In First Out)</option>
               <option value="NONE">NONE (Manual Picking)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Reorder Point (Qty)</label>
            <input type="number" value={formData.reorder_point || ''} onChange={e => setFormData({...formData, reorder_point: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" />
          </div>
       </div>

       <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl">
          <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-4">Special Handling & Compliance</h4>
          <div className="grid grid-cols-2 gap-4">
             <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.requires_qc} onChange={e => setFormData({...formData, requires_qc: e.target.checked})} className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-600/20" />
                <span className="text-sm font-bold text-amber-900">Requires QC on Receipt</span>
             </label>
             <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.print_barcode_on_inbound} onChange={e => setFormData({...formData, print_barcode_on_inbound: e.target.checked})} className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-600/20" />
                <span className="text-sm font-bold text-amber-900">Auto-Print Labels (Inbound)</span>
             </label>
             <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.is_fragile} onChange={e => setFormData({...formData, is_fragile: e.target.checked})} className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-600/20" />
                <span className="text-sm font-bold text-amber-900">Fragile (Handle with Care)</span>
             </label>
             <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.is_hazardous} onChange={e => setFormData({...formData, is_hazardous: e.target.checked})} className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-600/20" />
                <span className="text-sm font-bold text-amber-900">Hazardous Material (Hazmat)</span>
             </label>
          </div>

          <div className="mt-4 pt-4 border-t border-amber-200/50">
             <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input type="checkbox" checked={formData.requires_cold_storage} onChange={e => setFormData({...formData, requires_cold_storage: e.target.checked})} className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-600/20" />
                <span className="text-sm font-bold text-amber-900">Requires Cold Storage</span>
             </label>
             {formData.requires_cold_storage && (
                <div className="flex gap-4 items-center pl-8">
                   <input type="number" placeholder="Min Temp °C" value={formData.temperature_min || ''} onChange={e => setFormData({...formData, temperature_min: e.target.value})} className="w-24 px-3 py-2 bg-white rounded-xl text-xs font-bold" />
                   <span className="text-amber-800">to</span>
                   <input type="number" placeholder="Max Temp °C" value={formData.temperature_max || ''} onChange={e => setFormData({...formData, temperature_max: e.target.value})} className="w-24 px-3 py-2 bg-white rounded-xl text-xs font-bold" />
                </div>
             )}
          </div>
       </div>
    </div>
  );

  const renderImages = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
       <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
          <Info className="text-blue-600 mt-0.5" size={16} />
          <div>
            <p className="text-xs font-bold text-blue-900">International Standard requires at least 3 photos.</p>
            <p className="text-[10px] text-blue-700 mt-1">Recommended: Front View, Side View, and Top/Label View.</p>
          </div>
       </div>

       <div 
         onClick={() => fileInputRef.current?.click()}
         className="border-2 border-dashed border-slate-300 rounded-[2rem] p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all group"
       >
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all mb-4">
             <Upload size={24} />
          </div>
          <p className="text-sm font-black text-slate-900">Click or Drag images here</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Supports JPG, PNG (Max 5MB)</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            multiple 
            className="hidden" 
          />
       </div>

       {formData.image_urls.length > 0 && (
         <div className="grid grid-cols-3 gap-4">
            {formData.image_urls.map((url, idx) => (
               <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 group">
                  <img src={url} alt={`Product ${idx}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                     <button onClick={() => removeImage(idx)} className="w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center hover:scale-110 transition-all">
                        <Trash2 size={16} />
                     </button>
                  </div>
                  {idx === 0 && (
                     <div className="absolute top-2 left-2 bg-blue-600 text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest">Primary</div>
                  )}
               </div>
            ))}
         </div>
       )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900 italic tracking-tight uppercase">
              {editId ? 'Edit SKU' : 'New Product SKU'}
            </h2>
            <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.3em]">Master Catalog Entry</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition-all">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-48 border-r border-slate-100 p-4 space-y-2 shrink-0 overflow-y-auto">
               {TABS.map((tab, idx) => (
                 <button 
                   key={tab}
                   onClick={() => setActiveTab(idx)}
                   className={`w-full text-left px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                     activeTab === idx ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
                   }`}
                 >
                   {tab}
                   {idx === 4 && formData.image_urls.length < 3 && <span className="inline-block w-2 h-2 rounded-full bg-rose-500 ml-2 animate-pulse"></span>}
                 </button>
               ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-8 overflow-y-auto bg-[#F8FAFC]">
               {activeTab === 0 && renderBasicInfo()}
               {activeTab === 1 && renderAttributes()}
               {activeTab === 2 && renderDimensions()}
               {activeTab === 3 && renderStorage()}
               {activeTab === 4 && renderImages()}
            </div>
          </div>
        )}

        <div className="px-8 py-6 border-t border-slate-100 flex justify-end gap-4 shrink-0 bg-white rounded-b-[2.5rem]">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-[10px] font-black text-slate-500 hover:text-slate-900 uppercase tracking-widest transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={saving || loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editId ? 'Save Changes' : 'Register SKU'}
          </button>
        </div>

      </div>
    </div>
  );
}
