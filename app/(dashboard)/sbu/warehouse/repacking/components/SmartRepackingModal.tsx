'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { X, Loader2, Package, Box, Scissors, CheckCircle2, Save } from 'lucide-react';

interface SmartRepackingModalProps {
  onClose: () => void;
  onSuccess: () => void;
  warehouseId: string;
}

export default function SmartRepackingModal({ onClose, onSuccess, warehouseId }: SmartRepackingModalProps) {
  const { profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  // Common Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  
  // Form State
  const [repackDirection, setRepackDirection] = useState<'BUILD_DOWN' | 'BUILD_UP'>('BUILD_DOWN');

  const handleDirectionToggle = (dir: 'BUILD_DOWN' | 'BUILD_UP') => {
    setRepackDirection(dir);
    if (selectedConversionId && selectedConversionId !== 'ADD_NEW') {
      const conv = conversions.find(c => c.id === selectedConversionId);
      if (conv) {
        if (dir === 'BUILD_UP') {
          setSourceProductId(conv.target_product_id);
          setTargetProductId(conv.source_product_id);
        } else {
          setSourceProductId(conv.source_product_id);
          setTargetProductId(conv.target_product_id);
        }
      }
    }
  };
  const [customerId, setCustomerId] = useState<string>('');
  
  const [conversions, setConversions] = useState<any[]>([]);
  const [selectedConversionId, setSelectedConversionId] = useState<string>('');
  
  const [targetProductId, setTargetProductId] = useState<string>('');
  const [sourceProductId, setSourceProductId] = useState<string>('');
  
  const [targetQuantity, setTargetQuantity] = useState<string>('');
  const [targetLocationId, setTargetLocationId] = useState<string>('');
  const [requiredSourceQty, setRequiredSourceQty] = useState<number>(0);
  
  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [pickedInventory, setPickedInventory] = useState<{ [inventoryId: string]: number }>({});

  // Add Master Product State
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('PCS');
  const [productTypeContext, setProductTypeContext] = useState<'SOURCE' | 'TARGET'>('TARGET');

  // Add Master Conversion State
  const [showAddConversion, setShowAddConversion] = useState(false);
  const [convSourceProductId, setConvSourceProductId] = useState('');
  const [convSourceQty, setConvSourceQty] = useState('');
  const [convTargetProductId, setConvTargetProductId] = useState('');
  const [convTargetQty, setConvTargetQty] = useState('');
  const [allProducts, setAllProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomers();
    fetchLocations();
  }, [warehouseId]);

  useEffect(() => {
    if (customerId) {
      fetchAllProducts();
      fetchConversions();
    } else {
      setConversions([]);
      setAllProducts([]);
      setSelectedConversionId('');
      setSourceProductId('');
      setTargetProductId('');
    }
  }, [customerId]);

  useEffect(() => {
    if (sourceProductId && warehouseId && customerId) {
      fetchAvailableInventory();
    } else {
      setAvailableInventory([]);
      setPickedInventory({});
    }
  }, [sourceProductId, warehouseId, customerId]);

  useEffect(() => {
    const conv = conversions.find(c => c.id === selectedConversionId);
    if (conv && targetQuantity) {
      const srcQtyNum = Number(conv.source_qty) || 1;
      const targetQtyNum = Number(conv.target_qty) || 1;

      let smallQty = srcQtyNum;
      let largeQty = targetQtyNum;

      if (srcQtyNum < targetQtyNum) {
        // Source is large, Target is small
        smallQty = targetQtyNum;
        largeQty = srcQtyNum;
      } else {
        // Source is small, Target is large
        smallQty = srcQtyNum;
        largeQty = targetQtyNum;
      }

      const ratio = repackDirection === 'BUILD_UP'
        ? smallQty / largeQty
        : largeQty / smallQty;

      setRequiredSourceQty(Number(targetQuantity) * ratio);
    } else {
      setRequiredSourceQty(0);
    }
  }, [targetQuantity, selectedConversionId, conversions, repackDirection]);

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase.from('md_entities').select('id, name').eq('is_customer', true).eq('tenant_id', profile?.tenant_id);
      if (data) setCustomers(data);
    } catch (err) {}
  };

  const fetchLocations = async () => {
    try {
      const { data } = await supabase.from('md_warehouse_locations').select('id, code').order('code');
      if (data) setLocations(data);
    } catch (err) {}
  };

  const fetchAllProducts = async () => {
    try {
      const { data } = await supabase.from('md_product_skus').select('id, name, sku_code, unit').eq('customer_id', customerId).order('name');
      if (data) setAllProducts(data);
    } catch (err) {}
  };

  const fetchConversions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wh_repacking_conversions')
        .select(`
          id, source_qty, target_qty, source_product_id, target_product_id,
          source_product:md_product_skus!wh_repacking_conversions_source_product_id_fkey(name, sku_code, unit),
          target_product:md_product_skus!wh_repacking_conversions_target_product_id_fkey(name, sku_code, unit)
        `)
        .eq('customer_id', customerId);
        
      if (error) throw error;
      setConversions(data || []);
      
      if (data && data.length === 1 && !selectedConversionId) {
        handleSelectConversion(data[0].id);
      }
    } catch (err: any) {
      toast.error('Gagal memuat konversi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversion = (convId: string) => {
    setSelectedConversionId(convId);
    
    if (convId === 'ADD_NEW') {
      setShowAddConversion(true);
      setSourceProductId('');
      setTargetProductId('');
      return;
    }
    
    setShowAddConversion(false);
    const conv = conversions.find(c => c.id === convId);
    if (conv) {
      const srcQtyNum = Number(conv.source_qty) || 1;
      const targetQtyNum = Number(conv.target_qty) || 1;

      // Determine which one is small and which one is large
      let smallProduct = conv.source_product_id;
      let largeProduct = conv.target_product_id;

      if (srcQtyNum < targetQtyNum) {
        // Source is large, Target is small (e.g. 1 Box -> 12 Pouches)
        smallProduct = conv.target_product_id;
        largeProduct = conv.source_product_id;
      } else {
        // Source is small, Target is large (e.g. 12 Pouches -> 1 Box)
        smallProduct = conv.source_product_id;
        largeProduct = conv.target_product_id;
      }

      if (repackDirection === 'BUILD_UP') {
        setSourceProductId(smallProduct);
        setTargetProductId(largeProduct);
      } else {
        setSourceProductId(largeProduct);
        setTargetProductId(smallProduct);
      }
    } else {
      setSourceProductId('');
      setTargetProductId('');
    }
  };

  const fetchAvailableInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('wh_inventory')
        .select(`
          id, quantity, batch_number, expiry_date, unit_cost, location_id,
          location:location_id(id, code)
        `)
        .eq('warehouse_id', warehouseId)
        .eq('product_sku_id', sourceProductId)
        .gt('quantity', 0)
        .eq('status', 'AVAILABLE')
        .order('received_date', { ascending: true });
        
      if (error) throw error;
      setAvailableInventory(data || []);
      
      const autoPicks: { [key: string]: number } = {};
      let remaining = requiredSourceQty;
      (data || []).forEach(inv => {
        if (remaining <= 0) return;
        const take = Math.min(inv.quantity, remaining);
        autoPicks[inv.id] = take;
        remaining -= take;
      });
      setPickedInventory(autoPicks);
      
    } catch (err: any) {
      toast.error('Gagal memuat inventory: ' + err.message);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProductName || !newProductSku) return toast.error('Isi nama dan SKU produk');
    setLoading(true);
    try {
      const { data, error } = await supabase.from('md_product_skus').insert({
        tenant_id: profile?.tenant_id,
        customer_id: customerId,
        name: newProductName,
        sku_code: newProductSku,
        unit: newProductUnit,
        is_active: true
      }).select('id, name, sku_code, unit').single();
      
      if (error) throw error;
      toast.success('Produk berhasil ditambahkan');
      setAllProducts([...allProducts, data]);
      
      if (productTypeContext === 'TARGET') {
         setConvTargetProductId(data.id);
      } else {
         setConvSourceProductId(data.id);
      }
      
      setShowAddProduct(false);
      setNewProductName('');
      setNewProductSku('');
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConversion = async () => {
    if (!convSourceProductId || !convSourceQty || !convTargetQty || !convTargetProductId) return toast.error('Lengkapi form konversi');
    setLoading(true);
    try {
      const { data, error } = await supabase.from('wh_repacking_conversions').insert({
        tenant_id: profile?.tenant_id,
        customer_id: customerId,
        source_product_id: convSourceProductId,
        source_qty: Number(convSourceQty),
        target_product_id: convTargetProductId,
        target_qty: Number(convTargetQty)
      }).select(`
        id, source_qty, target_qty, source_product_id, target_product_id,
        source_product:md_product_skus!wh_repacking_conversions_source_product_id_fkey(name, sku_code, unit),
        target_product:md_product_skus!wh_repacking_conversions_target_product_id_fkey(name, sku_code, unit)
      `).single();
      
      if (error) throw error;
      toast.success('Master konversi berhasil ditambahkan');
      setConversions([...conversions, data]);
      setShowAddConversion(false);
      handleSelectConversion(data.id);
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPicked = () => {
    return Object.values(pickedInventory).reduce((sum, val) => sum + (Number(val) || 0), 0);
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!customerId) return toast.error('Pilih customer');
    if (!selectedConversionId) return toast.error('Pilih master konversi');
    if (!targetQuantity || Number(targetQuantity) <= 0) return toast.error('Masukkan target kuantitas yang valid');
    
    // Only check putaway location and picking if NOT draft
    if (!isDraft) {
       if (!targetLocationId) return toast.error('Pilih lokasi putaway (penyimpanan hasil)');
       const totalPicked = calculateTotalPicked();
       if (Math.abs(totalPicked - requiredSourceQty) > 0.001) {
         return toast.error(`Jumlah bahan yang di-pick (${totalPicked}) tidak sesuai dengan kebutuhan (${requiredSourceQty})`);
       }
    }

    setSubmitting(true);
    setSaveAsDraft(isDraft);
    try {
      const orderNumber = `REP-${Date.now()}`;
      
      // 1. Create Order
      const { data: order, error: orderError } = await supabase.from('wh_repacking_orders').insert({
        tenant_id: profile?.tenant_id,
        warehouse_id: warehouseId,
        customer_id: customerId,
        order_number: orderNumber,
        order_type: 'REPACKING',
        description: `${repackDirection === 'BUILD_DOWN' ? 'Break-Down' : 'Build-Up'} to ${targetQuantity} units`,
        priority: 'NORMAL',
        created_by: profile?.id,
        status: 'CREATED'
      }).select('id').single();

      if (orderError) throw orderError;

      // 2. Prepare Source Items (from picking)
      const sourcePayloads = [];
      let totalCost = 0;
      
      const totalPicked = calculateTotalPicked();
      
      if (totalPicked > 0) {
         for (const inv of availableInventory) {
           const pickedQty = pickedInventory[inv.id];
           if (pickedQty && pickedQty > 0) {
             sourcePayloads.push({
               repacking_order_id: order.id,
               tenant_id: profile?.tenant_id,
               warehouse_id: warehouseId,
               product_sku_id: sourceProductId,
               item_type: 'SOURCE',
               quantity: pickedQty,
               unit_cost: inv.unit_cost,
               source_location_id: inv.location_id || null,
               target_location_id: null,
               batch_number: inv.batch_number,
               expiry_date: inv.expiry_date
             });
             totalCost += (inv.unit_cost || 0) * pickedQty;
           }
         }
      } else {
         // If draft and absolutely no picking, insert generic item so order is valid shape
         sourcePayloads.push({
             repacking_order_id: order.id,
             tenant_id: profile?.tenant_id,
             warehouse_id: warehouseId,
             product_sku_id: sourceProductId,
             item_type: 'SOURCE',
             quantity: requiredSourceQty,
             unit_cost: 0,
             source_location_id: null,
             target_location_id: null
         });
      }

      // 3. Prepare Result Item
      const resultUnitCost = targetQuantity ? totalCost / Number(targetQuantity) : 0;
      const resultPayload = {
        repacking_order_id: order.id,
        tenant_id: profile?.tenant_id,
        warehouse_id: warehouseId,
        product_sku_id: targetProductId,
        item_type: 'RESULT',
        quantity: Number(targetQuantity),
        unit_cost: resultUnitCost,
        source_location_id: null,
        target_location_id: targetLocationId || null,
      };

      // Insert Items
      const { error: itemsError } = await supabase.from('wh_repacking_items').insert([...sourcePayloads, resultPayload]);
      if (itemsError) throw itemsError;

      // 4. Auto Execute (if NOT draft)
      if (!isDraft) {
         const { error: execError } = await supabase.rpc('activate_repacking_order', {
           p_order_id: order.id,
           p_user_id: profile?.id
         });
         
         if (execError) throw execError;
         toast.success('Repacking Order berhasil diaktifkan!');
      } else {
         toast.success('Repacking Order berhasil disimpan sebagai Draft!');
      }

      onSuccess();
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    } finally {
      setSubmitting(false);
      setSaveAsDraft(false);
    }
  };

  const getSourceProductName = () => {
     if (!sourceProductId) return '-';
     const prod = allProducts.find(p => p.id === sourceProductId);
     return prod ? `${prod.sku_code} - ${prod.name}` : '-';
  };

  const getTargetProductName = () => {
     if (!targetProductId) return '-';
     const prod = allProducts.find(p => p.id === targetProductId);
     return prod ? `${prod.sku_code} - ${prod.name}` : '-';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Smart Repacking</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Target-Driven Workflow</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
          
          {/* Customer & Direction */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Pilih Pelanggan</label>
               <select className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                 <option value="">Pilih Customer...</option>
                 {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
             </div>
             <div>
               <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Repacking Direction</label>
               <div className="flex gap-2">
                  <button onClick={() => handleDirectionToggle('BUILD_DOWN')} className={`flex-1 h-12 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all ${repackDirection === 'BUILD_DOWN' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                    Build-Down
                  </button>
                  <button onClick={() => handleDirectionToggle('BUILD_UP')} className={`flex-1 h-12 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all ${repackDirection === 'BUILD_UP' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                    Build-Up
                  </button>
               </div>
             </div>
          </div>

          {/* Define Target Result */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
             <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Package size={16} className="text-emerald-500"/> Define Target Result</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="md:col-span-2">
                 <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Pilih Conversion Packing</label>
                 <select 
                   disabled={!customerId} 
                   className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50" 
                   value={selectedConversionId} 
                   onChange={(e) => handleSelectConversion(e.target.value)}
                 >
                   <option value="">Pilih Master Conversion...</option>
                   {conversions.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.source_qty} {c.source_product.unit} ({c.source_product.name}) ➡️ {c.target_qty} {c.target_product.unit} ({c.target_product.name})
                      </option>
                   ))}
                   <option value="ADD_NEW" className="font-bold text-indigo-600">+ Buat Konversi Baru...</option>
                 </select>
               </div>
               
               {/* Show selected Target/Source context explicitly if selected */}
               {selectedConversionId && selectedConversionId !== 'ADD_NEW' && (
                  <>
                     <div>
                       <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Product Target (Hasil)</label>
                       <select 
                         className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" 
                         value={targetProductId} 
                         onChange={e => {
                           if (e.target.value === 'ADD_NEW') {
                             window.open('/hq/master-data/products', '_blank');
                             setTargetProductId('');
                           }
                           else { setTargetProductId(e.target.value); }
                         }}
                       >
                         <option value="">Pilih Target...</option>
                         {allProducts.map(p => <option key={p.id} value={p.id}>{p.sku_code} - {p.name}</option>)}
                         <option value="ADD_NEW" className="font-bold text-indigo-600">+ Add New Product...</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Product Source (Bahan)</label>
                       <select 
                         className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none" 
                         value={sourceProductId} 
                         onChange={e => {
                           if (e.target.value === 'ADD_NEW') {
                             window.open('/hq/master-data/products', '_blank');
                             setSourceProductId('');
                           }
                           else { setSourceProductId(e.target.value); }
                         }}
                       >
                         <option value="">Pilih Bahan...</option>
                         {allProducts.map(p => <option key={p.id} value={p.id}>{p.sku_code} - {p.name}</option>)}
                         <option value="ADD_NEW" className="font-bold text-indigo-600">+ Add New Product...</option>
                       </select>
                     </div>
                  </>
               )}

               <div>
                 <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Isi Qty Target</label>
                 <input type="number" min="1" className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" value={targetQuantity} onChange={(e) => setTargetQuantity(e.target.value)} placeholder="Berapa target produk yang dihasilkan?" disabled={!selectedConversionId} />
               </div>
               <div>
                 <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Results Qty Product (Source)</label>
                 <div className="h-12 px-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center text-sm font-black text-orange-700">
                    {requiredSourceQty > 0 ? `${requiredSourceQty} units dibutuhkan` : '-'}
                 </div>
               </div>

               <div className="md:col-span-2">
                 <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Putaway Location (Target Hasil)</label>
                 <select 
                   className="w-full h-12 px-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                   value={targetLocationId} 
                   onChange={(e) => setTargetLocationId(e.target.value)}
                 >
                   <option value="">Pilih Rak/Lokasi Penyimpanan...</option>
                   {Array.from(new Set(availableInventory.filter(inv => inv.location_id).map(inv => inv.location_id))).map((locId: string) => {
                     const l = locations.find(loc => loc.id === locId);
                     if (!l) return null;
                     return <option key={l.id} value={l.id}>{l.code}</option>;
                   })}
                 </select>
                 {sourceProductId && availableInventory.length === 0 && (
                   <p className="text-[10px] text-orange-500 mt-1 font-bold">Belum ada stok bahan (Source) di gudang. Lokasi tidak tersedia.</p>
                 )}
               </div>
             </div>

             {/* Add Conversion Inline Form */}
             {showAddConversion && (
                <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest">Create Master Conversion</h4>
                    <button onClick={() => setShowAddConversion(false)} className="text-indigo-400 hover:text-indigo-600"><X size={16}/></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    
                    {/* Source Side */}
                    <div className="space-y-3 bg-white p-3 rounded-lg border border-indigo-100">
                      <label className="block text-[10px] font-bold text-indigo-900 uppercase">Product Source (Asal)</label>
                      <select className="w-full h-10 px-3 rounded-lg text-sm border-indigo-200" value={convSourceProductId} onChange={e => {
                         if (e.target.value === 'ADD_NEW') { 
                           window.open('/hq/master-data/products', '_blank');
                           setConvSourceProductId('');
                         } else { 
                           setConvSourceProductId(e.target.value); 
                         }
                      }}>
                        <option value="">Pilih Bahan...</option>
                        {allProducts.map(p => <option key={p.id} value={p.id}>{p.sku_code} - {p.name}</option>)}
                        <option value="ADD_NEW" className="font-bold text-indigo-600">+ Add New Product...</option>
                      </select>
                      <input type="number" className="w-full h-10 px-3 rounded-lg text-sm border-indigo-200" value={convSourceQty} onChange={e => setConvSourceQty(e.target.value)} placeholder="Source Qty (e.g. 1)" />
                    </div>

                    {/* Target Side */}
                    <div className="space-y-3 bg-white p-3 rounded-lg border border-indigo-100">
                      <label className="block text-[10px] font-bold text-indigo-900 uppercase">Product Target (Hasil)</label>
                      <select className="w-full h-10 px-3 rounded-lg text-sm border-indigo-200" value={convTargetProductId} onChange={e => {
                         if (e.target.value === 'ADD_NEW') { 
                           window.open('/hq/master-data/products', '_blank');
                           setConvTargetProductId('');
                         } else { 
                           setConvTargetProductId(e.target.value); 
                         }
                      }}>
                        <option value="">Pilih Target...</option>
                        {allProducts.map(p => <option key={p.id} value={p.id}>{p.sku_code} - {p.name}</option>)}
                        <option value="ADD_NEW" className="font-bold text-indigo-600">+ Add New Product...</option>
                      </select>
                      <input type="number" className="w-full h-10 px-3 rounded-lg text-sm border-indigo-200" value={convTargetQty} onChange={e => setConvTargetQty(e.target.value)} placeholder="Target Qty (e.g. 200)" />
                    </div>

                  </div>
                  <button onClick={handleCreateConversion} disabled={loading} className="w-full h-10 bg-indigo-600 text-white rounded-lg text-xs font-black hover:bg-indigo-700 uppercase tracking-widest shadow-sm">Save Rule</button>
                </div>
             )}

             {/* Add Product Inline Form */}
             {showAddProduct && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest">Create Master Product</h4>
                    <button onClick={() => setShowAddProduct(false)} className="text-emerald-400 hover:text-emerald-600"><X size={16}/></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input type="text" placeholder="SKU Code" className="h-10 px-3 rounded-lg text-sm border-emerald-200" value={newProductSku} onChange={e => setNewProductSku(e.target.value)} />
                    <input type="text" placeholder="Product Name" className="h-10 px-3 rounded-lg text-sm border-emerald-200" value={newProductName} onChange={e => setNewProductName(e.target.value)} />
                    <div className="flex gap-2">
                      <input type="text" placeholder="Unit" className="w-full h-10 px-3 rounded-lg text-sm border-emerald-200 uppercase" value={newProductUnit} onChange={e => setNewProductUnit(e.target.value.toUpperCase())} />
                      <button onClick={handleCreateProduct} disabled={loading} className="px-4 bg-emerald-600 text-white rounded-lg text-xs font-black hover:bg-emerald-700">Save</button>
                    </div>
                  </div>
                </div>
             )}
          </div>

          {/* Putaway Product sources */}
          {sourceProductId && requiredSourceQty > 0 && (
             <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Box size={16} className="text-indigo-500"/> Putaway Product sources</h3>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Source Kebutuhan</p>
                    <p className={`text-lg font-black ${calculateTotalPicked() === requiredSourceQty ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {calculateTotalPicked()} / {requiredSourceQty}
                    </p>
                  </div>
                </div>

                {availableInventory.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl">
                    <p className="text-sm font-bold text-slate-500">Stok bahan (Source Product) tidak tersedia di gudang.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Pilih product source (agregat product-qty-storage code)</p>
                    {availableInventory.map(inv => (
                      <div key={inv.id} className={`flex items-center justify-between p-3 rounded-xl border ${pickedInventory[inv.id] > 0 ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 bg-white'}`}>
                         <div className="flex-1">
                            <div className="text-sm font-bold text-slate-900">
                               {getSourceProductName()} - {inv.quantity} Tersedia - {locations.find(l => l.id === inv.location_id)?.code || 'NO-LOC'}
                            </div>
                            <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">
                               Batch: {inv.batch_number || '-'} | Exp: {inv.expiry_date || '-'}
                            </div>
                         </div>
                         <div className="w-32">
                            <input 
                              type="number" 
                              min="0" 
                              max={inv.quantity}
                              placeholder="Pick Qty"
                              className={`w-full h-10 px-3 text-right rounded-lg border text-sm font-bold ${pickedInventory[inv.id] > 0 ? 'border-indigo-400 bg-white' : 'border-slate-200 bg-slate-50'}`}
                              value={pickedInventory[inv.id] || ''}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setPickedInventory({...pickedInventory, [inv.id]: val > inv.quantity ? inv.quantity : val});
                              }}
                            />
                         </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-100 transition-colors uppercase tracking-widest">
            Cancel
          </button>
          
          <div className="flex items-center gap-3">
             <button 
               onClick={() => handleSubmit(true)} 
               disabled={submitting || !selectedConversionId} 
               className="px-6 py-3 bg-amber-100 text-amber-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-200 disabled:opacity-50 transition-all flex items-center gap-2"
             >
               {submitting && saveAsDraft ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />}
               Save to Draft
             </button>
             
             <button 
               onClick={() => { setSaveAsDraft(false); handleSubmit(false); }} 
               disabled={submitting || !sourceProductId || Math.abs(calculateTotalPicked() - requiredSourceQty) > 0.001 || !targetLocationId} 
               className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-sm shadow-indigo-200 flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
             >
               {submitting && !saveAsDraft ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
               Submit & Process
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
