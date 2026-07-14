'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { X, Loader2, Plus, Trash2, Search, Settings } from 'lucide-react';

interface BOMFormModalProps {
  editId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface ComponentRow {
  component_sku_id: string;
  quantity_required: string;
  componentSearch: string;
  showDropdown: boolean;
  _key: number;
}

export default function BOMFormModal({ editId, onClose, onSuccess }: BOMFormModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const [kitSkuId, setKitSkuId] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);

  const [bomNumber, setBomNumber] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [components, setComponents] = useState<ComponentRow[]>([]);

  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const initialize = async () => {
      await fetchCustomers();
      const allProds = await fetchProductsDirect();
      if (editId) {
        await fetchBOMDetails(allProds);
      } else {
        setBomNumber(`BOM-${Date.now().toString().slice(-6)}`);
        setComponents([{ component_sku_id: '', quantity_required: '1', componentSearch: '', showDropdown: false, _key: Date.now() }]);
      }
    };
    initialize();
  }, [editId, profile?.tenant_id]);

  const fetchCustomers = async () => {
    if (!profile?.tenant_id) return;
    try {
      const { data, error } = await supabase
        .from('md_entities')
        .select('id, name, entity_code')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_customer', true)
        .order('name');
      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
    }
  };

  const fetchProductsDirect = async () => {
    if (!profile?.tenant_id) return [];
    try {
      const { data, error } = await supabase
        .from('md_product_skus')
        .select('id, sku_code, name, unit, base_uom, customer_id')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setProducts(data || []);
      return data || [];
    } catch (err: any) {
      toast.error('Failed to load products for catalog selection');
      return [];
    }
  };

  const fetchBOMDetails = async (allProducts: any[]) => {
    setLoading(true);
    try {
      const { data: bom, error: bomErr } = await supabase
        .from('md_bill_of_materials')
        .select('*')
        .eq('id', editId)
        .single();
      if (bomErr) throw bomErr;

      setKitSkuId(bom.kit_sku_id || '');
      setBomNumber(bom.bom_number || '');
      setName(bom.name || '');
      setNotes(bom.notes || '');
      setIsActive(bom.is_active ?? true);

      // Find customer of kit sku
      const kitProduct = allProducts.find(p => p.id === bom.kit_sku_id);
      if (kitProduct?.customer_id) {
        setSelectedCustomerId(kitProduct.customer_id);
      }

      const { data: items, error: itemsErr } = await supabase
        .from('md_bom_items')
        .select('*')
        .eq('bom_id', editId);
      if (itemsErr) throw itemsErr;

      if (items && items.length > 0) {
        setComponents(items.map(item => {
          const compProduct = allProducts.find(p => p.id === item.component_sku_id);
          return {
            component_sku_id: item.component_sku_id,
            quantity_required: String(item.quantity_required),
            componentSearch: compProduct ? compProduct.name : '',
            showDropdown: false,
            _key: Math.random() + Date.now(),
          };
        }));
      } else {
        setComponents([{ component_sku_id: '', quantity_required: '1', componentSearch: '', showDropdown: false, _key: Date.now() }]);
      }
    } catch (err: any) {
      toast.error('Failed to load BOM details: ' + err.message);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const addComponentRow = () => {
    setComponents([...components, { component_sku_id: '', quantity_required: '1', componentSearch: '', showDropdown: false, _key: Date.now() + Math.random() }]);
  };

  const removeComponentRow = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const updateComponentRow = (index: number, updates: Partial<ComponentRow> | keyof ComponentRow, value?: any) => {
    setComponents(prev => prev.map((c, i) => {
      if (i !== index) return c;
      if (typeof updates === 'string') {
        return { ...c, [updates]: value };
      }
      return { ...c, ...updates };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    if (!kitSkuId) return toast.error('Kit Product SKU is required');
    if (!bomNumber.trim()) return toast.error('BOM Code is required');
    
    const validComponents = components.filter(c => c.component_sku_id && Number(c.quantity_required) > 0);
    if (validComponents.length === 0) {
      return toast.error('Please add at least one valid component product with quantity > 0');
    }

    setSaving(true);
    try {
      let bomId = editId;

      const bomPayload = {
        tenant_id: profile.tenant_id,
        kit_sku_id: kitSkuId,
        bom_number: bomNumber.trim().toUpperCase(),
        name: name.trim() || undefined,
        notes: notes.trim() || undefined,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      if (editId) {
        const { error: updErr } = await supabase
          .from('md_bill_of_materials')
          .update(bomPayload)
          .eq('id', editId);
        if (updErr) throw updErr;

        // Delete old items
        const { error: delErr } = await supabase
          .from('md_bom_items')
          .delete()
          .eq('bom_id', editId);
        if (delErr) throw delErr;
      } else {
        const { data: newBom, error: insErr } = await supabase
          .from('md_bill_of_materials')
          .insert({
            ...bomPayload,
            created_by: profile.id,
          })
          .select('id')
          .single();
        if (insErr) throw insErr;
        bomId = newBom.id;
      }

      // Insert new items
      const itemsPayload = validComponents.map(c => ({
        bom_id: bomId,
        component_sku_id: c.component_sku_id,
        quantity_required: Number(c.quantity_required),
      }));

      const { error: itemsErr } = await supabase
        .from('md_bom_items')
        .insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      toast.success(editId ? 'BOM updated successfully' : 'BOM created successfully');
      onSuccess();
    } catch (err: any) {
      toast.error('Failed to save BOM: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filter products by selected customer
  const filteredProducts = products.filter(p => p.customer_id === selectedCustomerId);

  // Target autocomplete list
  const targetAutocompleteList = filteredProducts.filter(p => {
    const term = targetSearch.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.sku_code.toLowerCase().includes(term);
  });

  const selectedTargetProduct = products.find(p => p.id === kitSkuId);
  const displayTargetText = targetSearch || (selectedTargetProduct ? `${selectedTargetProduct.name} (${selectedTargetProduct.sku_code})` : '');

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase flex items-center gap-2">
              <Settings className="text-blue-600" size={24} />
              {editId ? 'Edit Bill of Materials' : 'Create Bill of Materials'}
            </h2>
            <p className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest">Predefined Kitting / Bundling Recipe Specifications</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-2xl transition-all">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 py-20 flex flex-col items-center justify-center bg-slate-50/30">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Recipe...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-slate-50/30">
            
            {/* Kit Configuration */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kit SKU output</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Select */}
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600">Pemilik Barang (Customer) *</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      const newCustId = e.target.value;
                      setSelectedCustomerId(newCustId);
                      setKitSkuId('');
                      setTargetSearch('');
                      setComponents([{ component_sku_id: '', quantity_required: '1', componentSearch: '', showDropdown: false, _key: Date.now() }]);
                    }}
                    disabled={!!editId}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:border-blue-500 transition-all outline-none bg-white disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Target Kit SKU Search Autocomplete */}
                <div className="space-y-2 relative">
                  <label className="block text-xs font-bold text-slate-600">Target Kit Product SKU *</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={displayTargetText}
                      disabled={!selectedCustomerId}
                      placeholder={selectedCustomerId ? "Type to search kit product..." : "Select Customer first..."}
                      onChange={(e) => {
                        setTargetSearch(e.target.value);
                        setShowTargetDropdown(true);
                      }}
                      onClick={() => {
                        if (selectedCustomerId) {
                          setTargetSearch('');
                          setShowTargetDropdown(true);
                        }
                      }}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-bold focus:border-blue-500 transition-all outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
                    />

                    {showTargetDropdown && selectedCustomerId && targetAutocompleteList.length > 0 && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowTargetDropdown(false)} />
                        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                          {targetAutocompleteList.map(p => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setKitSkuId(p.id);
                                setTargetSearch('');
                                setShowTargetDropdown(false);
                              }}
                              className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-xs font-bold border-b border-slate-100 last:border-0"
                            >
                              <div className="text-slate-900">{p.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">SKU: {p.sku_code}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-600">BOM Code / Number</label>
                  <input
                    type="text"
                    value={bomNumber}
                    onChange={(e) => setBomNumber(e.target.value)}
                    placeholder="e.g. BOM-MEAL-01"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-300 focus:border-blue-500 transition-all outline-none bg-white"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600">BOM Name / Description</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Paket Meal Box Hemat A"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-300 focus:border-blue-500 transition-all outline-none bg-white"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600">Recipe Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide special assembly or packing notes..."
                    rows={2}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold placeholder:text-slate-300 focus:border-blue-500 transition-all outline-none bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-xs font-bold text-slate-700">Active BOM Recipe</label>
                </div>
              </div>
            </div>

            {/* Components Recipe */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipe Components (Inputs)</h3>
                <button
                  type="button"
                  onClick={addComponentRow}
                  className="px-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1"
                >
                  <Plus size={14} /> Add Row
                </button>
              </div>

              <div className="space-y-3">
                {components.map((comp, idx) => {
                  const selectedCompProduct = products.find(p => p.id === comp.component_sku_id);
                  const displayCompText = comp.componentSearch || (selectedCompProduct ? `${selectedCompProduct.name} (${selectedCompProduct.sku_code})` : '');

                  // Filter products matching search term, and excluding the target kit SKU
                  const compAutocompleteList = filteredProducts
                    .filter(p => p.id !== kitSkuId)
                    .filter(p => {
                      const term = comp.componentSearch.toLowerCase();
                      return p.name.toLowerCase().includes(term) || p.sku_code.toLowerCase().includes(term);
                    });

                  return (
                    <div key={comp._key} className="flex flex-col md:flex-row md:items-center gap-3 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl relative group">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-3 space-y-1 relative">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Component SKU *</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={displayCompText}
                              disabled={!selectedCustomerId}
                              placeholder={selectedCustomerId ? "Type to search component SKU..." : "Select Customer first..."}
                              onChange={(e) => updateComponentRow(idx, { componentSearch: e.target.value, showDropdown: true })}
                              onClick={() => {
                                if (selectedCustomerId) {
                                  updateComponentRow(idx, { componentSearch: '', showDropdown: true });
                                }
                              }}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold focus:border-blue-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-400"
                            />

                            {comp.showDropdown && selectedCustomerId && compAutocompleteList.length > 0 && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => updateComponentRow(idx, { showDropdown: false })} />
                                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-40 overflow-y-auto">
                                  {compAutocompleteList.map(p => (
                                    <div
                                      key={p.id}
                                      onClick={() => {
                                        updateComponentRow(idx, { 
                                          component_sku_id: p.id, 
                                          componentSearch: '', 
                                          showDropdown: false 
                                        });
                                      }}
                                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-xs font-bold border-b border-slate-50 last:border-0"
                                    >
                                      <div className="text-slate-900">{p.name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">SKU: {p.sku_code}</div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Quantity Required</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={comp.quantity_required}
                              onChange={(e) => updateComponentRow(idx, 'quantity_required', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-right outline-none focus:border-blue-500 bg-white"
                              placeholder="1"
                            />
                            <span className="text-[10px] font-bold text-slate-400 uppercase select-none w-10 shrink-0">
                              {products.find(p => p.id === comp.component_sku_id)?.unit || 'PCS'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeComponentRow(idx)}
                        disabled={components.length <= 1}
                        className="absolute top-2 right-2 md:relative md:top-auto md:right-auto p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition-all disabled:opacity-30 self-end"
                        title="Remove Row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/10 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editId ? 'Save Changes' : 'Create Recipe'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
}
