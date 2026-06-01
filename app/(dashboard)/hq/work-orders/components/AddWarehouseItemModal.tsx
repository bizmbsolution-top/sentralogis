import React, { useState, useEffect } from 'react';
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
    notes: initialData?.item_data?.notes || ''
  });

  const [manifests, setManifests] = useState<any[]>(initialData?.manifests || []);
  const [skuSearch, setSkuSearch] = useState('');
  const [skuResults, setSkuResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Fetch Warehouses
  useEffect(() => {
    const fetchWarehouses = async () => {
      const { data } = await supabase.from('md_warehouses').select('id, code, name').eq('is_active', true);
      if (data) setWarehouses(data);
    };
    fetchWarehouses();
  }, []);

  // Debounced SKU Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!skuSearch.trim()) {
        setSkuResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('md_product_skus')
          .select('id, sku_code, name, brand_name, unit, volume_m3, weight_kg')
          .ilike('name', `%${skuSearch}%`)
          .limit(5);
        
        if (!error && data) {
          setSkuResults(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [skuSearch]);

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

    setManifests([...manifests, {
      product_sku_id: sku.id,
      sku_code: sku.sku_code,
      name: sku.name,
      brand_name: sku.brand_name,
      unit: sku.unit,
      quantity: 1,
      unit_weight_kg: sku.weight_kg || 0,
      unit_volume_m3: sku.volume_m3 || 0
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
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] italic">Product Manifests</h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{manifests.length} items</span>
            </div>

            {/* SKU Search */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search product name or SKU..."
                  value={skuSearch}
                  onChange={e => setSkuSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 shadow-sm"
                />
                {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 animate-spin" size={16} />}
              </div>

              {/* Dropdown Results */}
              {skuResults.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                  {skuResults.map(sku => (
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
                  ))}
                </div>
              )}
            </div>

            {/* Manifest List */}
            {manifests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Package size={32} className="text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-500">No products added yet</p>
                <p className="text-[10px] text-slate-400 text-center mt-1">Search and select products above to build the inbound/outbound manifest.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {manifests.map((m, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3 shadow-sm hover:border-amber-200 transition-colors">
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                      <Package size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{m.name}</div>
                      <div className="text-[10px] font-bold text-amber-600 truncate">{m.brand_name || 'Generic Brand'}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium flex gap-2">
                        <span>{m.sku_code}</span>
                        <span>|</span>
                        <span>{m.unit_weight_kg}kg / {m.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center">
                        <input 
                          type="number" 
                          min="1"
                          value={m.quantity}
                          onChange={(e) => updateManifestQty(idx, Number(e.target.value))}
                          className="w-16 py-1.5 px-2 text-center text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-500"
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
