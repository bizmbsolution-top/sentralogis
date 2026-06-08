import React, { useState, useEffect, useRef } from 'react';
import { X, Package, Building, Search, Plus, Trash2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabaseClient';

interface AddWarehouseItemModalProps {
  initialData?: any;
  customerId: string;
  defaultExecutionDate: string;
  defaultExecutionTime: string;
  onClose: () => void;
  onAdd: (item: any) => void;
}

export default function AddWarehouseItemModal({
  initialData,
  customerId,
  defaultExecutionDate,
  defaultExecutionTime,
  onClose,
  onAdd
}: AddWarehouseItemModalProps) {
  const [formData, setFormData] = useState({
    operationType: initialData?.item_data?.operation_type || 'INBOUND',
    warehouseId: initialData?.item_data?.destination_location_id || initialData?.item_data?.origin_location_id || '',
    unitCount: initialData?.item_data?.unit_count || 1,
    vehicleType: initialData?.item_data?.vehicle_type_name || 'Fuso',
    estVolumeCBM: initialData?.item_data?.est_volume_cbm || '',
    estTonnage: initialData?.item_data?.est_tonnage || '',
    estRevenue: initialData?.item_data?.est_revenue || '',
    notes: initialData?.item_data?.notes || '',
    contactId: initialData?.item_data?.shipper_id || initialData?.item_data?.consignee_id || ''
  });

  const [manifests, setManifests] = useState<any[]>(initialData?.manifests || []);
  const [skuSearch, setSkuSearch] = useState('');
  const [skuResults, setSkuResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [relatedContacts, setRelatedContacts] = useState<any[]>([]);
  const isInitialMount = useRef(true); // [AI] Track first mount to skip clearing manifests

  // Fetch Warehouses
  useEffect(() => {
    const fetchWarehouses = async () => {
      const { data } = await supabase.from('md_warehouses').select('id, code, name').eq('is_active', true);
      if (data) setWarehouses(data);
    };
    fetchWarehouses();
  }, []);

  // Fetch Related Contacts (Shipper/Consignee)
  useEffect(() => {
    const fetchContacts = async () => {
      if (!customerId) {
        setRelatedContacts([]);
        return;
      }
      
      const { data } = await supabase
        .from('md_entities')
        .select('id, entity_code, name')
        .or(`id.eq.${customerId},parent_id.eq.${customerId}`)
        .eq('is_active', true)
        .order('name');
        
      if (data) {
        setRelatedContacts(data);
      }
    };
    fetchContacts();
  }, [customerId]);

  // Clear manifests when operation type changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; // [AI] Skip clearing manifests on first render (edit mode)
    }
    if (manifests.length > 0) {
      setManifests([]);
      setSkuSearch('');
      setSkuResults([]);
    }
  }, [formData.operationType]);

  // Debounced SKU Search — OUTBOUND searches from inventory stock, INBOUND from master product
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!skuSearch.trim()) {
        setSkuResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        if (formData.operationType === 'OUTBOUND') {
          // [AI] OUTBOUND: search from wh_inventory filtered by customer + warehouse
          let query = supabase
            .from('wh_inventory')
            .select(`
              id, available_quantity, batch_number, expiry_date,
              product_sku:product_sku_id(id, sku_code, name, brand_name, unit, volume_m3, weight_kg, storage_rule, customer_id),
              location:location_id(code)
            `)
            .eq('status', 'AVAILABLE')
            .gt('available_quantity', 0)
            .order('expiry_date', { ascending: true });

          // [AI] Filter by customer's products only (via product_sku.customer_id)
          if (customerId) {
            query = query.eq('product_sku.customer_id', customerId);
          }

          // [AI] Filter by selected warehouse (only show inventory in that WH)
          if (formData.warehouseId) {
            query = query.eq('warehouse_id', formData.warehouseId);
          }

          const { data, error } = await query;

          if (!error && data) {
            // Filter by search term on product name or SKU code
            const filtered = data.filter((item: any) => {
              const sku = item.product_sku;
              if (!sku) return false;
              const q = skuSearch.toLowerCase();
              return (
                (sku.name || '').toLowerCase().includes(q) ||
                (sku.sku_code || '').toLowerCase().includes(q)
              );
            }).slice(0, 8);

            // Group by SKU to show total available per product
            const grouped = new Map<string, any>();
            filtered.forEach((item: any) => {
              const sku = item.product_sku;
              if (!sku) return;
              if (!grouped.has(sku.id)) {
                grouped.set(sku.id, {
                  id: sku.id,
                  sku_code: sku.sku_code,
                  name: sku.name,
                  brand_name: sku.brand_name,
                  unit: sku.unit,
                  volume_m3: sku.volume_m3,
                  weight_kg: sku.weight_kg,
                  storage_rule: sku.storage_rule,
                  total_available: 0,
                  batches: 0,
                  earliest_expiry: null,
                });
              }
              const g = grouped.get(sku.id);
              g.total_available += item.available_quantity;
              g.batches += 1;
              if (item.expiry_date && (!g.earliest_expiry || item.expiry_date < g.earliest_expiry)) {
                g.earliest_expiry = item.expiry_date;
              }
            });

            setSkuResults(Array.from(grouped.values()));
          }
        } else {
          // [AI] INBOUND / CROSS_DOCKING / VAS: search from master product filtered by customer
          let query = supabase
            .from('md_product_skus')
            .select('id, sku_code, name, brand_name, unit, volume_m3, weight_kg')
            .ilike('name', `%${skuSearch}%`);

          // [AI] Filter by customer's products only
          if (customerId) {
            query = query.eq('customer_id', customerId);
          }

          const { data, error } = await query.limit(5);
          
          if (!error && data) {
            setSkuResults(data);
          }
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [skuSearch, formData.operationType, formData.warehouseId]);

  // Auto calculate Totals when manifests change
  useEffect(() => {
    if (manifests.length > 0) {
      let totalCBM = 0;
      let totalKG = 0;
      manifests.forEach(m => {
        totalCBM += (Number(m.unit_volume_m3) || 0) * (Number(m.quantity) || 0);
        totalKG += (Number(m.unit_weight_kg) || 0) * (Number(m.quantity) || 0);
      });
      
      setFormData(prev => ({
        ...prev,
        estVolumeCBM: totalCBM.toFixed(2),
        estTonnage: (totalKG / 1000).toFixed(2) // Convert KG to Ton
      }));
    }
  }, [manifests]);

  const addManifestItem = (sku: any) => {
    const exists = manifests.find(m => m.product_sku_id === sku.id);
    if (exists) return; // Prevent duplicate row, they should just increase qty

    const isOutbound = formData.operationType === 'OUTBOUND';

    setManifests([...manifests, {
      product_sku_id: sku.id,
      sku_code: sku.sku_code,
      name: sku.name,
      brand_name: sku.brand_name,
      unit: sku.unit,
      quantity: 1,
      unit_weight_kg: sku.weight_kg || 0,
      unit_volume_m3: sku.volume_m3 || 0,
      // OUTBOUND-specific fields
      ...(isOutbound ? {
        storage_rule: sku.storage_rule || 'FIFO',
        available_qty: sku.total_available || 0,
        batches: sku.batches || 0,
        earliest_expiry: sku.earliest_expiry || null,
      } : {})
    }]);
    setSkuSearch('');
    setSkuResults([]);
  };

  const updateManifestQty = (index: number, qty: number) => {
    const updated = [...manifests];
    updated[index].quantity = qty;
    setManifests(updated);
  };

  const removeManifestItem = (index: number) => {
    const updated = [...manifests];
    updated.splice(index, 1);
    setManifests(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedWh = warehouses.find(w => w.id === formData.warehouseId);
    
    // Format to match wo_items structure
    const payload = {
      sbu_type: 'WAREHOUSE',
      quantity: Number(formData.unitCount),
      deal_price: 0,
      total_revenue: Number(formData.estRevenue) || 0,
      manifests: manifests.length > 0 ? manifests : undefined,
      item_data: {
        operation_type: formData.operationType,
        [formData.operationType === 'INBOUND' ? 'destination_location_id' : 'origin_location_id']: formData.warehouseId || null,
        shipper_id: formData.operationType === 'INBOUND' ? formData.contactId || null : null,
        consignee_id: formData.operationType === 'OUTBOUND' ? formData.contactId || null : null,
        warehouse_id: formData.warehouseId || null,
        warehouse_name: selectedWh ? `${selectedWh.code} - ${selectedWh.name}` : null,
        unit_count: Number(formData.unitCount),
        vehicle_type_name: formData.vehicleType,
        est_volume_cbm: Number(formData.estVolumeCBM) || 0,
        est_tonnage: Number(formData.estTonnage) || 0,
        est_revenue: Number(formData.estRevenue) || 0,
        notes: formData.notes
      }
    };
    
    onAdd(payload);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <Card className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-600/20">
              <Building size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 italic tracking-tight uppercase">Warehouse Service</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{initialData ? 'Edit Details' : 'Configure New Item'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
          {/* LEFT: Operation Info */}
          <div className="flex-1 space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] italic border-b border-slate-100 pb-2">Operation Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operation Type</label>
                  <select 
                    value={formData.operationType}
                    onChange={(e) => setFormData({...formData, operationType: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  >
                    <option value="INBOUND">Inbound (Receiving)</option>
                    <option value="OUTBOUND">Outbound (Dispatch)</option>
                    <option value="CROSS_DOCKING">Cross-Docking</option>
                    <option value="VAS">Value Added Service (VAS)</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Warehouse</label>
                  <select 
                    value={formData.warehouseId}
                    onChange={(e) => setFormData({...formData, warehouseId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  >
                    <option value="">-- Select Warehouse --</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {formData.operationType === 'INBOUND' ? 'Shipper (Pengirim)' : 
                     formData.operationType === 'OUTBOUND' ? 'Consignee (Penerima)' : 'Contact (Pengirim/Penerima)'}
                  </label>
                  <select 
                    value={formData.contactId}
                    onChange={(e) => setFormData({...formData, contactId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  >
                    <option value="">-- Select Contact --</option>
                    {relatedContacts.map(contact => (
                      <option key={contact.id} value={contact.id}>{contact.entity_code ? `[${contact.entity_code}] ` : ''}{contact.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Vehicle Type</label>
                  <select 
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({...formData, vehicleType: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  >
                    <option value="Container 20ft">Container 20ft</option>
                    <option value="Container 40ft">Container 40ft</option>
                    <option value="Fuso">Fuso</option>
                    <option value="CDD">CDD</option>
                    <option value="CDE">CDE</option>
                    <option value="Blind Van">Blind Van</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Number of Units/Trucks</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    value={formData.unitCount}
                    onChange={(e) => setFormData({...formData, unitCount: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimated Revenue (IDR)</label>
                  <input 
                    type="number"
                    min="0"
                    value={formData.estRevenue}
                    onChange={(e) => setFormData({...formData, estRevenue: e.target.value})}
                    placeholder="e.g. 5000000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est Volume (CBM) {manifests.length > 0 && <span className="text-amber-500 lowercase ml-1">(auto-calculated)</span>}</label>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    readOnly={manifests.length > 0}
                    value={formData.estVolumeCBM}
                    onChange={(e) => setFormData({...formData, estVolumeCBM: e.target.value})}
                    className={`w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 ${manifests.length > 0 ? 'bg-slate-100 text-slate-500' : 'bg-slate-50'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est Tonnage (Ton) {manifests.length > 0 && <span className="text-amber-500 lowercase ml-1">(auto-calculated)</span>}</label>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    readOnly={manifests.length > 0}
                    value={formData.estTonnage}
                    onChange={(e) => setFormData({...formData, estTonnage: e.target.value})}
                    className={`w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 ${manifests.length > 0 ? 'bg-slate-100 text-slate-500' : 'bg-slate-50'}`}
                  />
                </div>
              </div>
              
              <div className="space-y-2 mt-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Notes / Special Handling</label>
                  <textarea 
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Fragile items, specific bay needed, etc..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
              </div>
            </div>
          </div>

          {/* RIGHT: SKU Manifests */}
          <div className="flex-1 space-y-4 border-l border-slate-100 pl-0 md:pl-8">
            <div className="flex justify-between items-end border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] italic">
                {formData.operationType === 'OUTBOUND' ? 'Stock Products' : 'Product Manifests'}
              </h3>
              <div className="flex items-center gap-2">
                {formData.operationType === 'OUTBOUND' && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                    Dari Inventory Stock
                  </span>
                )}
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{manifests.length} items</span>
              </div>
            </div>

            {/* SKU Search */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder={formData.operationType === 'OUTBOUND' ? 'Search stock product name or SKU...' : 'Search product name or SKU...'}
                  value={skuSearch}
                  onChange={e => setSkuSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 shadow-sm"
                />
                {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 animate-spin" size={16} />}
              </div>

              {/* Dropdown Results */}
              {skuResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                  {formData.operationType === 'OUTBOUND' ? (
                    // OUTBOUND: show stock info (available qty, batches, expiry)
                    skuResults.map((sku: any) => (
                      <div 
                        key={sku.id} 
                        onClick={() => addManifestItem(sku)}
                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{sku.name}</div>
                          <div className="text-[10px] font-bold text-blue-600 mb-1">{sku.brand_name || 'Generic Brand'}</div>
                          <div className="text-xs text-slate-500 flex gap-2 flex-wrap">
                            <span className="font-mono">{sku.sku_code}</span>
                            <span>&bull;</span>
                            <span className="font-bold text-blue-700">{sku.total_available} tersedia</span>
                            <span>&bull;</span>
                            <span>{sku.batches} batch</span>
                            {sku.storage_rule && (
                              <>
                                <span>&bull;</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  sku.storage_rule === 'FEFO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                }`}>{sku.storage_rule}</span>
                              </>
                            )}
                            {sku.earliest_expiry && (
                              <>
                                <span>&bull;</span>
                                <span className="text-[10px]">Exp: {new Date(sku.earliest_expiry).toLocaleDateString('id-ID')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button type="button" className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                          <Plus size={18} />
                        </button>
                      </div>
                    ))
                  ) : (
                    // INBOUND/CROSS_DOCKING/VAS: show master product info
                    skuResults.map((sku: any) => (
                      <div 
                        key={sku.id} 
                        onClick={() => addManifestItem(sku)}
                        className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center group"
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{sku.name}</div>
                          <div className="text-[10px] text-amber-600 font-bold mb-1">{sku.brand_name || 'Generic Brand'}</div>
                          <div className="text-xs text-slate-500 flex gap-2">
                            <span>{sku.sku_code}</span>
                            <span>&bull;</span>
                            <span>{sku.volume_m3} CBM / {sku.unit}</span>
                          </div>
                        </div>
                        <button type="button" className="text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Manifest List */}
            {manifests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Package size={32} className="text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-500">No products added yet</p>
                <p className="text-[10px] text-slate-400 text-center mt-1">
                  {formData.operationType === 'OUTBOUND'
                    ? 'Search and select stock products to build the outbound manifest.'
                    : 'Search and select products above to build the inbound/outbound manifest.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {manifests.map((m, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3 shadow-sm hover:border-amber-200 transition-colors">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      formData.operationType === 'OUTBOUND' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      <Package size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{m.name}</div>
                      <div className={`text-[10px] font-bold truncate ${
                        formData.operationType === 'OUTBOUND' ? 'text-blue-600' : 'text-amber-600'
                      }`}>{m.brand_name || 'Generic Brand'}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium flex gap-2 flex-wrap">
                        <span className="font-mono">{m.sku_code}</span>
                        <span>|</span>
                        <span>{m.unit_weight_kg}kg / {m.unit}</span>
                        {formData.operationType === 'OUTBOUND' && m.available_qty > 0 && (
                          <>
                            <span>|</span>
                            <span className="font-bold text-blue-700">{m.available_qty} tersedia</span>
                          </>
                        )}
                        {formData.operationType === 'OUTBOUND' && m.storage_rule && (
                          <>
                            <span>|</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              m.storage_rule === 'FEFO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                            }`}>{m.storage_rule}</span>
                          </>
                        )}
                        {formData.operationType === 'OUTBOUND' && m.earliest_expiry && (
                          <>
                            <span>|</span>
                            <span className="text-[10px]">Exp: {new Date(m.earliest_expiry).toLocaleDateString('id-ID')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center">
                        <input 
                          type="number" 
                          min="1"
                          max={formData.operationType === 'OUTBOUND' ? (m.available_qty || 9999) : undefined}
                          value={m.quantity}
                          onChange={(e) => updateManifestQty(idx, Number(e.target.value))}
                          className={`w-16 py-1.5 px-2 text-center text-sm font-bold border rounded-lg outline-none focus:border-amber-500 ${
                            formData.operationType === 'OUTBOUND' && m.quantity > (m.available_qty || 0)
                              ? 'bg-red-50 border-red-300 text-red-600'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        />
                        <span className="ml-2 text-xs font-bold text-slate-400">{m.unit}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeManifestItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-6 py-3 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="px-8 py-3 bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-500 shadow-xl shadow-amber-600/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <Package size={16} /> 
            {initialData ? 'Update Item' : 'Save to Manifest'}
          </button>
        </div>
      </Card>
    </div>
  );
}
