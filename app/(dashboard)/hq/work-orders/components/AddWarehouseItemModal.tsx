import React, { useState, useEffect, useRef } from 'react';
import { X, Package, Building, Search, Plus, Trash2, Loader2, ChevronDown } from 'lucide-react';
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
    warehouseId: initialData?.item_data?.destination_location_id || initialData?.item_data?.origin_location_id || initialData?.item_data?.warehouse_id || '',
    toWarehouseId: initialData?.item_data?.to_warehouse_id || '',
    toLocationId: initialData?.item_data?.to_location_id || '',
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
  const [locations, setLocations] = useState<any[]>([]);
  const [relatedContacts, setRelatedContacts] = useState<any[]>([]);
  const [activeAccordion, setActiveAccordion] = useState<'operation' | 'manifest' | 'logistics' | ''>('operation');
  const prevOperationType = useRef(formData.operationType); // [AI] Track previous operation to prevent Strict Mode clearing manifests

  // Fetch Warehouses
  useEffect(() => {
    const fetchWarehouses = async () => {
      const { data } = await supabase.from('md_warehouses').select('id, code, name').eq('is_active', true);
      if (data) setWarehouses(data);
    };
    fetchWarehouses();
  }, []);

  // Fetch Locations for INTERNAL_MOVEMENT
  useEffect(() => {
    const fetchLocations = async () => {
      if (!formData.warehouseId || formData.operationType !== 'INTERNAL_MOVEMENT') {
        setLocations([]);
        return;
      }
      const { data } = await supabase
        .from('md_locations')
        .select('id, code, name, type')
        .eq('warehouse_id', formData.warehouseId)
        .eq('is_active', true)
        .order('code');
      if (data) setLocations(data);
    };
    fetchLocations();
  }, [formData.warehouseId, formData.operationType]);

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

  // Clear manifests when operation type changes
  useEffect(() => {
    if (prevOperationType.current !== formData.operationType) {
      prevOperationType.current = formData.operationType;
      if (manifests.length > 0) {
        setManifests([]);
        setSkuSearch('');
        setSkuResults([]);
      }
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
        const isStockOp = formData.operationType === 'OUTBOUND' || formData.operationType === 'STOCK_TRANSFER' || formData.operationType === 'INTERNAL_MOVEMENT';
        
        if (isStockOp) {
          // [AI] OUTBOUND/TRANSFER/MOVEMENT: search from wh_inventory filtered by customer + warehouse
          let query = supabase
            .from('wh_inventory')
            .select(`
              id, available_quantity, batch_number, expiry_date, created_at,
              product_sku:product_sku_id(id, sku_code, name, brand_name, unit, base_uom, default_inbound_uom, default_outbound_uom, uom_conversions, volume_m3, weight_kg, storage_rule, customer_id),
              location:location_id(code)
            `)
            .eq('status', 'AVAILABLE')
            .gt('available_quantity', 0)
            .order('expiry_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true });

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
            let filtered = data.filter((item: any) => {
              const sku = item.product_sku;
              if (!sku) return false;
              const q = skuSearch.toLowerCase();
              return (
                (sku.name || '').toLowerCase().includes(q) ||
                (sku.sku_code || '').toLowerCase().includes(q)
              );
            });

            // Map results individually to show location breakdown
            const mappedResults = filtered.map(item => {
              const sku = item.product_sku;
              return {
                inventory_id: item.id,
                id: sku.id,
                sku_code: sku.sku_code,
                name: sku.name,
                brand_name: sku.brand_name,
                unit: sku.unit,
                base_uom: sku.base_uom,
                default_inbound_uom: sku.default_inbound_uom,
                default_outbound_uom: sku.default_outbound_uom,
                uom_conversions: sku.uom_conversions,
                volume_m3: sku.volume_m3,
                weight_kg: sku.weight_kg,
                storage_rule: sku.storage_rule,
                available_qty: item.available_quantity,
                batch_number: item.batch_number,
                expiry_date: item.expiry_date,
                location_code: item.location?.code || 'Unassigned'
              };
            });

            // Re-sort mapped results to group identical SKUs together while maintaining priority
            mappedResults.sort((a, b) => {
               if (a.id === b.id) return 0;
               return a.name.localeCompare(b.name);
            });

            setSkuResults(mappedResults.slice(0, 15));
          }
        } else {
          // [AI] INBOUND / CROSS_DOCKING / VAS: search from master product filtered by customer
          let query = supabase
            .from('md_product_skus')
            .select('id, sku_code, name, brand_name, unit, base_uom, default_inbound_uom, default_outbound_uom, uom_conversions, volume_m3, weight_kg')
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

  const addManifestItem = (item: any) => {
    const isFromStock = formData.operationType === 'OUTBOUND' || formData.operationType === 'STOCK_TRANSFER' || formData.operationType === 'INTERNAL_MOVEMENT';

    const existsIndex = manifests.findIndex(m => {
      if (isFromStock) {
        return m.product_sku_id === item.id && m.location_code === item.location_code && m.batch_number === item.batch_number;
      }
      return m.product_sku_id === item.id;
    });

    if (existsIndex >= 0) return; // Prevent duplicate row, they should just increase qty if same

    const displayUom = formData.operationType === 'INBOUND'
      ? (item.default_inbound_uom || item.unit || 'PCS')
      : (item.default_outbound_uom || item.unit || 'PCS');

    setManifests([...manifests, {
      product_sku_id: item.id,
      sku_code: item.sku_code,
      name: item.name,
      brand_name: item.brand_name,
      unit: displayUom,
      quantity: 1,
      unit_weight_kg: item.weight_kg || 0,
      unit_volume_m3: item.volume_m3 || 0,
      // Stock-sourced fields (OUTBOUND / STOCK_TRANSFER)
      ...(isFromStock ? {
        storage_rule: item.storage_rule || 'FIFO',
        available_qty: item.available_qty || 0,
        batch_number: item.batch_number || '-',
        location_code: item.location_code || '-',
        earliest_expiry: item.expiry_date || null,
        inventory_id: item.inventory_id || null,
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
        to_warehouse_id: formData.toWarehouseId || null,
        to_location_id: formData.toLocationId || null,
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

  const isStockOp = formData.operationType === 'OUTBOUND' || formData.operationType === 'STOCK_TRANSFER' || formData.operationType === 'INTERNAL_MOVEMENT';

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

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 custom-scrollbar">
          {/* ACCORDION 1: OPERATION & LOCATION */}
          <div className={`border rounded-2xl overflow-hidden bg-white shadow-sm transition-colors duration-300 ${activeAccordion === 'operation' ? 'border-amber-200' : 'border-slate-200'}`}>
            <button 
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 'operation' ? (manifests.length > 0 ? 'manifest' : 'operation') : 'operation')}
              className="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black transition-colors ${activeAccordion === 'operation' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>1</div>
                <div className="text-left">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Detail Operasi & Lokasi</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">Tentukan tipe operasi dan gudang</p>
                </div>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${activeAccordion === 'operation' ? 'rotate-180' : ''}`} />
            </button>
            
            {activeAccordion === 'operation' && (
              <div className="p-6 border-t border-slate-100 space-y-6 animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operation Type</label>
                    <select 
                      value={formData.operationType}
                      onChange={(e) => {
                         setFormData({...formData, operationType: e.target.value});
                         // Auto switch to next accordion if simple outbound/inbound? 
                         // No, user still needs to pick warehouse
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                    >
                       <option value="INBOUND">Inbound (Receiving)</option>
                       <option value="OUTBOUND">Outbound (Dispatch)</option>
                       <option value="STOCK_TRANSFER">Transfer (DC to DC/Store)</option>
                       <option value="INTERNAL_MOVEMENT">Internal Movement (Rack to Rack)</option>
                       <option value="CROSS_DOCKING">Cross-Docking</option>
                       <option value="VAS">Value Added Service (VAS)</option>
                    </select>
                  </div>
                  
                  {formData.operationType !== 'STOCK_TRANSFER' && formData.operationType !== 'INTERNAL_MOVEMENT' && (
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
                  )}
                </div>

                {(formData.operationType === 'STOCK_TRANSFER' || formData.operationType === 'INTERNAL_MOVEMENT') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                    {formData.operationType === 'STOCK_TRANSFER' ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gudang Asal (Origin)</label>
                          <select 
                            value={formData.warehouseId}
                            onChange={(e) => setFormData({...formData, warehouseId: e.target.value})}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                          >
                            <option value="">-- Select Origin Warehouse --</option>
                            {warehouses.map(wh => (
                              <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gudang Tujuan (Destination)</label>
                          <select 
                            value={formData.toWarehouseId}
                            onChange={(e) => setFormData({...formData, toWarehouseId: e.target.value})}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                          >
                            <option value="">-- Select Destination Warehouse --</option>
                            {warehouses.filter(wh => wh.id !== formData.warehouseId).map(wh => (
                              <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lokasi Gudang</label>
                          <select 
                            value={formData.warehouseId}
                            onChange={(e) => setFormData({...formData, warehouseId: e.target.value})}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                          >
                            <option value="">-- Select Warehouse --</option>
                            {warehouses.map(wh => (
                              <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tujuan Rak / Lokasi</label>
                          <select 
                            value={formData.toLocationId}
                            onChange={(e) => setFormData({...formData, toLocationId: e.target.value})}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                          >
                            <option value="">-- Select Destination Rack --</option>
                            {locations.map(loc => (
                              <option key={loc.id} value={loc.id}>{loc.code} - {loc.name} ({loc.type})</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end pt-2">
                   <button 
                     type="button"
                     onClick={() => setActiveAccordion('manifest')}
                     className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                   >
                     Continue to Manifest &rarr;
                   </button>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 2: MANIFEST & BARANG */}
          <div className={`border rounded-2xl overflow-hidden bg-white shadow-sm transition-colors duration-300 ${activeAccordion === 'manifest' ? 'border-amber-200' : 'border-slate-200'}`}>
            <button 
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 'manifest' ? '' : 'manifest')}
              className="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black transition-colors ${activeAccordion === 'manifest' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>2</div>
                <div className="text-left">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Manifest Barang</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">{manifests.length} item(s) ditambahkan</p>
                </div>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${activeAccordion === 'manifest' ? 'rotate-180' : ''}`} />
            </button>
            
            {activeAccordion === 'manifest' && (
              <div className="p-6 border-t border-slate-100 space-y-6 animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] italic">
                    {isStockOp ? 'Cari Produk di Stok Inventory' : 'Pilih Produk Master'}
                  </h3>
                  {isStockOp && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                      Mode Tarik Stok Aktif
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    placeholder={isStockOp ? 'Ketik nama barang atau SKU untuk ditarik dari rak...' : 'Ketik nama barang master atau SKU...'}
                    value={skuSearch}
                    onChange={e => setSkuSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-600/10 transition-all shadow-sm"
                  />
                  {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 animate-spin" size={18} />}
                </div>

                {/* Dropdown Results */}
                {skuResults.length > 0 && (
                  <div className="mt-2 bg-white border-2 border-amber-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100">
                    {isStockOp ? (
                      skuResults.map((sku: any, idx: number) => {
                        const isFirstForSku = idx === 0 || skuResults[idx-1].id !== sku.id;
                        return (
                        <div 
                          key={sku.inventory_id || idx} 
                          onClick={() => addManifestItem(sku)}
                          className={`p-4 hover:bg-amber-50/50 cursor-pointer flex justify-between items-center group relative overflow-hidden transition-colors ${isFirstForSku ? 'bg-amber-50/30' : ''}`}
                        >
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                            <div className="md:col-span-5">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="text-sm font-black text-slate-900 group-hover:text-amber-700 transition-colors truncate">{sku.name}</div>
                                {isFirstForSku && (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-widest rounded-md animate-pulse shrink-0">
                                    Rek: {sku.storage_rule || 'FIFO'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{sku.brand_name || 'Generic Brand'} | {sku.sku_code}</div>
                            </div>
                            
                            <div className="md:col-span-7 flex flex-wrap gap-2 items-center text-xs">
                              <span className="font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">{sku.available_qty} <span className="font-medium text-[10px]">Tersedia</span></span>
                              <span className="font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">Rak: {sku.location_code}</span>
                              
                              {sku.batch_number && sku.batch_number !== '-' && (
                                 <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-[10px]">Batch: {sku.batch_number}</span>
                              )}

                              {sku.storage_rule && (
                                <span className={`px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-widest ${
                                  sku.storage_rule === 'FEFO' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}>{sku.storage_rule}</span>
                              )}
                              
                              {sku.expiry_date && (
                                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-md border border-rose-100">Exp: {new Date(sku.expiry_date).toLocaleDateString('id-ID')}</span>
                              )}
                            </div>
                          </div>
                          <button type="button" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-amber-600 group-hover:text-white transition-all shrink-0 ml-4 shadow-sm group-hover:shadow-amber-600/30">
                            <Plus size={16} />
                          </button>
                        </div>
                      )})
                    ) : (
                      skuResults.map((sku: any) => (
                        <div 
                          key={sku.id} 
                          onClick={() => addManifestItem(sku)}
                          className="p-4 hover:bg-slate-50 cursor-pointer flex justify-between items-center group transition-colors"
                        >
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm font-black text-slate-900 group-hover:text-amber-600 transition-colors">{sku.name}</div>
                              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{sku.brand_name || 'Generic Brand'} | {sku.sku_code}</div>
                            </div>
                            <div className="flex items-center text-xs font-bold text-slate-600">
                              <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{sku.volume_m3} CBM / {sku.unit}</span>
                            </div>
                          </div>
                          <button type="button" className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-amber-600 group-hover:text-white transition-all shrink-0 ml-4 shadow-sm">
                            <Plus size={16} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Manifest Cart List */}
                <div className="mt-6">
                  {manifests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                        <Package size={24} className="text-slate-300" />
                      </div>
                      <p className="text-sm font-black text-slate-700 mb-1">Belum ada barang di manifest</p>
                      <p className="text-xs font-bold text-slate-400 text-center max-w-sm">
                        {isStockOp
                          ? 'Gunakan bar pencarian di atas untuk menarik barang dari rak.'
                          : 'Cari produk master untuk ditambahkan ke daftar manifest operasi ini.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {manifests.map((m, idx) => (
                        <div key={idx} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 shadow-sm hover:border-amber-300 transition-all">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                            isStockOp ? 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700' : 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700'
                          }`}>
                            <Package size={20} />
                          </div>
                          <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                            <div className="md:col-span-5">
                              <div className="text-sm font-black text-slate-900 truncate" title={m.name}>{m.name}</div>
                              <div className={`text-[10px] font-black uppercase tracking-widest truncate mt-0.5 ${
                                isStockOp ? 'text-blue-600' : 'text-amber-600'
                              }`}>{m.brand_name || 'Generic Brand'} | {m.sku_code}</div>
                            </div>
                            
                            <div className="md:col-span-4 flex flex-wrap gap-2 items-center">
                              {isStockOp && m.available_qty !== undefined && (
                                <span className="font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 text-[10px]">{m.available_qty} <span className="font-medium">Tersedia</span></span>
                              )}
                              {isStockOp && m.location_code && (
                                <span className="font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 text-[10px]">Rak: {m.location_code}</span>
                              )}
                              {isStockOp && m.batch_number && m.batch_number !== '-' && (
                                <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 text-[10px]">Batch: {m.batch_number}</span>
                              )}
                              {isStockOp && m.earliest_expiry && (
                                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-md border border-rose-100">Exp: {new Date(m.earliest_expiry).toLocaleDateString('id-ID')}</span>
                              )}
                            </div>
                            
                            <div className="md:col-span-3 flex items-center justify-end">
                              <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
                                <input 
                                  type="number" 
                                  min="1"
                                  max={isStockOp ? (m.available_qty || 9999) : undefined}
                                  value={m.quantity}
                                  onChange={(e) => updateManifestQty(idx, Number(e.target.value))}
                                  className={`w-16 py-1.5 px-2 text-center text-sm font-black bg-transparent outline-none ${
                                    isStockOp && m.quantity > (m.available_qty || 0)
                                      ? 'text-red-600'
                                      : 'text-slate-900'
                                  }`}
                                />
                                <span className="pr-3 pl-1 text-[10px] font-black text-slate-400 uppercase">{m.unit}</span>
                              </div>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeManifestItem(idx)}
                            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                            title="Hapus item"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                   <button 
                     type="button"
                     onClick={() => setActiveAccordion('logistics')}
                     className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                   >
                     Continue to Logistics &rarr;
                   </button>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 3: LOGISTICS & COMMERCIAL */}
          <div className={`border rounded-2xl overflow-hidden bg-white shadow-sm transition-colors duration-300 ${activeAccordion === 'logistics' ? 'border-amber-200' : 'border-slate-200'}`}>
            <button 
              type="button"
              onClick={() => setActiveAccordion(activeAccordion === 'logistics' ? '' : 'logistics')}
              className="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black transition-colors ${activeAccordion === 'logistics' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>3</div>
                <div className="text-left">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Logistik & Komersial</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">Armada, revenue, dan catatan tambahan</p>
                </div>
              </div>
              <ChevronDown className={`text-slate-400 transition-transform duration-300 ${activeAccordion === 'logistics' ? 'rotate-180' : ''}`} />
            </button>
            
            {activeAccordion === 'logistics' && (
              <div className="p-6 border-t border-slate-100 space-y-6 animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {formData.operationType === 'INBOUND' ? 'Shipper (Pengirim)' : 
                       formData.operationType === 'OUTBOUND' ? 'Consignee (Penerima)' : 'Contact (Pengirim/Penerima)'}
                    </label>
                    <select 
                      value={formData.contactId}
                      onChange={(e) => setFormData({...formData, contactId: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                    >
                      <option value="">-- Asumsikan sama dengan Customer (Default) --</option>
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

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimated Revenue (IDR)</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">Rp</span>
                       <input 
                         type="number"
                         min="0"
                         value={formData.estRevenue}
                         onChange={(e) => setFormData({...formData, estRevenue: e.target.value})}
                         placeholder="0"
                         className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                       />
                    </div>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Notes / Special Handling</label>
                      <textarea 
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        placeholder="Fragile items, specific bay needed, instruksi ke tim gudang..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                      />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STICKY FOOTER */}
        <div className="p-6 border-t border-slate-200 bg-white shrink-0 flex items-center justify-between shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] relative z-10">
          <div className="hidden md:flex items-center gap-8">
             <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Total Items</span>
                <span className="font-black text-slate-900 text-lg leading-none">{manifests.length} <span className="text-xs text-slate-500 font-bold ml-1">SKU</span></span>
             </div>
             <div className="w-px h-8 bg-slate-200"></div>
             <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Est. Volume</span>
                <span className="font-black text-amber-600 text-lg leading-none">{formData.estVolumeCBM} <span className="text-xs font-bold ml-1">CBM</span></span>
             </div>
             <div className="w-px h-8 bg-slate-200"></div>
             <div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Est. Tonase</span>
                <span className="font-black text-amber-600 text-lg leading-none">{formData.estTonnage} <span className="text-xs font-bold ml-1">Ton</span></span>
             </div>
          </div>
          
          {/* Mobile view summary */}
          <div className="md:hidden text-xs font-black text-slate-500 uppercase tracking-widest">
            {manifests.length} Items | {formData.estVolumeCBM} CBM
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              className="px-8 py-3.5 bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-500 shadow-xl shadow-amber-600/20 active:scale-95 transition-all flex items-center gap-3"
            >
              <Package size={18} /> 
              {initialData ? 'Update Manifest' : 'Save Manifest'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
