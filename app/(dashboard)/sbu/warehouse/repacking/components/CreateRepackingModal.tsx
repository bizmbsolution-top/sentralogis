'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { X, Loader2, Plus, Package, Box, Scissors, PackagePlus, PackageCheck, Search, Camera, Printer, Users, ClipboardList } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import BarcodeScannerModal from './BarcodeScannerModal';
import PrintLabelModal from './PrintLabelModal';

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku_code: string;
  customer_id?: string;
}

interface Location {
  id: string;
  code: string;
  zone: string | null;
  rack: string | null;
  shelf: string | null;
  bin: string | null;
}

interface ItemRow {
  product_id: string;
  quantity: string;
  unit_cost: string;
  location_id: string;
  batch_number: string;
  expiry_date: string;
  notes: string;
  productSearch: string;
  locationSearch: string;
  showProductDropdown: boolean;
  showLocationDropdown: boolean;
}

interface CreateRepackingModalProps {
  onClose: () => void;
  onSuccess: () => void;
  warehouseId: string;
}

export default function CreateRepackingModal({ onClose, onSuccess, warehouseId }: CreateRepackingModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [orderType, setOrderType] = useState<'REPACKING' | 'BUNDLING' | 'KITTING'>('REPACKING');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [notes, setNotes] = useState('');

  const [sourceItems, setSourceItems] = useState<ItemRow[]>([]);
  const [resultItems, setResultItems] = useState<ItemRow[]>([]);

  // Split products: source from active inventory, result from master
  const [sourceProducts, setSourceProducts] = useState<Product[]>([]);
  const [resultProducts, setResultProducts] = useState<Product[]>([]);
  
  const [locations, setLocations] = useState<Location[]>([]);

  const [scanningTarget, setScanningTarget] = useState<{ type: 'source' | 'result'; index: number; field: 'product' | 'location'; } | null>(null);
  const [printingIndex, setPrintingIndex] = useState<number | null>(null);

  const [activeBom, setActiveBom] = useState<any | null>(null);
  const [checkingBom, setCheckingBom] = useState(false);

  useEffect(() => {
    const checkBoms = async () => {
      const firstResultProduct = resultItems[0]?.product_id;
      if (!firstResultProduct || (orderType !== 'KITTING' && orderType !== 'BUNDLING') || !profile?.tenant_id) {
        setActiveBom(null);
        return;
      }

      setCheckingBom(true);
      try {
        const { data, error } = await supabase
          .from('md_bill_of_materials')
          .select(`
            *,
            kit:kit_sku_id(name, sku_code),
            md_bom_items(id, quantity_required, component_sku_id, component:component_sku_id(name, sku_code, unit, base_uom))
          `)
          .eq('tenant_id', profile.tenant_id)
          .eq('kit_sku_id', firstResultProduct)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;
        setActiveBom(data || null);
      } catch (err) {
        console.error('Error checking BOM:', err);
        setActiveBom(null);
      } finally {
        setCheckingBom(false);
      }
    };

    checkBoms();
  }, [orderType, resultItems[0]?.product_id, profile?.tenant_id]);

  const allocateComponent = (componentSkuId: string, requiredQty: number) => {
    const items = sourceProducts.filter(p => p.id === componentSkuId);
    if (items.length === 0) {
      return [{
        product_id: componentSkuId,
        quantity: String(requiredQty),
        unit_cost: '',
        location_id: '',
        batch_number: '',
        expiry_date: '',
        notes: 'STOK TIDAK TERSEDIA DI GUDANG',
        productSearch: '',
        locationSearch: '',
        showProductDropdown: false,
        showLocationDropdown: false
      }];
    }

    let remaining = requiredQty;
    const rows = [];
    
    for (const item of items) {
      if (remaining <= 0) break;
      const take = Math.min(item.available_qty, remaining);
      rows.push({
        product_id: item.id,
        quantity: String(take),
        unit_cost: item.unit_cost ? String(item.unit_cost) : '',
        location_id: item.location_id,
        batch_number: item.batch_number || '',
        expiry_date: item.expiry_date || '',
        notes: `Auto-allocated from batch ${item.batch_number || 'N/A'} (Available: ${item.available_qty})`,
        productSearch: '',
        locationSearch: '',
        showProductDropdown: false,
        showLocationDropdown: false
      });
      remaining -= take;
    }

    if (remaining > 0) {
      if (rows.length > 0) {
        rows[rows.length - 1].quantity = String(Number(rows[rows.length - 1].quantity) + remaining);
        rows[rows.length - 1].notes += ` (+ ${remaining} shortage)`;
      } else {
        rows.push({
          product_id: componentSkuId,
          quantity: String(remaining),
          unit_cost: '',
          location_id: '',
          batch_number: '',
          expiry_date: '',
          notes: 'Shortage',
          productSearch: '',
          locationSearch: '',
          showProductDropdown: false,
          showLocationDropdown: false
        });
      }
    }
    return rows;
  };

  const handleAutoPopulateBOM = () => {
    if (!activeBom) return;
    
    const targetQtyStr = resultItems[0]?.quantity;
    const targetQty = Number(targetQtyStr);
    if (!targetQtyStr || isNaN(targetQty) || targetQty <= 0) {
      toast.error('Tentukan quantity Result Item terlebih dahulu untuk menghitung komponen BOM');
      return;
    }

    if (!activeBom.md_bom_items || activeBom.md_bom_items.length === 0) {
      toast.error('BOM tidak memiliki item komponen');
      return;
    }

    const newSourceItems: ItemRow[] = [];
    for (const bomItem of activeBom.md_bom_items) {
      const requiredQty = bomItem.quantity_required * targetQty;
      const allocatedRows = allocateComponent(bomItem.component_sku_id, requiredQty);
      newSourceItems.push(...allocatedRows);
    }

    setSourceItems(newSourceItems);
    toast.success(`Berhasil auto-populate ${activeBom.md_bom_items.length} komponen BOM untuk ${targetQty} unit kit!`);
  };

  const orderTypes = [
    { id: 'REPACKING', label: 'Repacking', icon: Scissors, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    { id: 'BUNDLING', label: 'Bundling', icon: PackagePlus, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { id: 'KITTING', label: 'Kitting', icon: PackageCheck, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  ];

  const priorities = [
    { id: 'LOW', label: 'Low', color: 'text-slate-600', bg: 'bg-slate-100' },
    { id: 'NORMAL', label: 'Normal', color: 'text-blue-600', bg: 'bg-blue-100' },
    { id: 'HIGH', label: 'High', color: 'text-orange-600', bg: 'bg-orange-100' },
    { id: 'URGENT', label: 'Urgent', color: 'text-rose-600', bg: 'bg-rose-100' },
  ];

  useEffect(() => {
    if (warehouseId) fetchCustomers();
    fetchLocations();
  }, [warehouseId]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_customers_in_warehouse', { p_warehouse_id: warehouseId });
      
      if (error) {
        console.warn('RPC get_active_customers_in_warehouse failed, using fallback query:', error);
        
        // 2-step fallback query to bypass RPC issues
        const { data: invData, error: invError } = await supabase
          .from('wh_inventory')
          .select('product_sku_id, customer_id, md_product_skus(customer_id)')
          .eq('warehouse_id', warehouseId)
          .gt('quantity', 0)
          .eq('status', 'AVAILABLE');
          
        if (invError) throw invError;
        
        const customerIds = new Set<string>();
        invData?.forEach((item: any) => {
          if (item.customer_id) customerIds.add(item.customer_id);
          else if (item.md_product_skus?.customer_id) customerIds.add(item.md_product_skus.customer_id);
        });
        
        if (customerIds.size === 0) {
          setCustomers([]);
          return;
        }
        
        const { data: custData, error: custError } = await supabase
          .from('md_entities')
          .select('id, name')
          .in('id', Array.from(customerIds));
          
        if (custError) throw custError;
        setCustomers(custData || []);
        
      } else if (data) {
        setCustomers(data);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat pelanggan: ' + err.message);
    }
  };

  const fetchSourceProducts = async (customerId: string) => {
    try {
      console.log('Fetching source products/inventory for warehouse:', warehouseId, 'customer:', customerId);
      
      const { data: invData, error: invError } = await supabase
        .from('wh_inventory')
        .select(`
          id,
          product_sku_id,
          location_id,
          quantity,
          batch_number,
          expiry_date,
          unit_cost,
          customer_id,
          product_sku:product_sku_id(id, name, sku_code, customer_id, base_uom, uom_conversions, sku_level, conversion_to_base, unit),
          location:location_id(id, code)
        `)
        .eq('warehouse_id', warehouseId)
        .gt('quantity', 0)
        .eq('status', 'AVAILABLE');
        
      if (invError) throw invError;
      
      console.log('Inventory data fetched:', invData);
      
      const mappedInventory = (invData || [])
        .filter((item: any) => {
          const itemCustId = item.customer_id || item.product_sku?.customer_id;
          return itemCustId === customerId;
        })
        .map((item: any) => ({
          id: item.product_sku_id,
          name: item.product_sku?.name || 'Unknown Product',
          sku_code: item.product_sku?.sku_code || 'N/A',
          customer_id: customerId,
          
          inventory_id: item.id,
          location_id: item.location_id,
          location_code: item.location?.code || 'N/A',
          batch_number: item.batch_number || '',
          expiry_date: item.expiry_date || '',
          unit_cost: item.unit_cost || 0,
          available_qty: item.quantity || 0,

          // UoM details mapping
          unit: item.product_sku?.unit || 'BOX',
          base_uom: item.product_sku?.base_uom || 'PCS',
          uom_conversions: item.product_sku?.uom_conversions || [],
          sku_level: item.product_sku?.sku_level || '',
          conversion_to_base: item.product_sku?.conversion_to_base || 1,
        }));
        
      console.log('Mapped source inventory:', mappedInventory);
      setSourceProducts(mappedInventory);
      
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat produk sumber: ' + err.message);
    }
  };

  const fetchResultProducts = async (customerId: string) => {
    try {
      // Get all master products for this customer (since results might be new SKUs with 0 stock)
      const { data, error } = await supabase.from('md_product_skus')
        .select('id, name, sku_code, customer_id, base_uom, uom_conversions, sku_level, conversion_to_base, unit')
        .eq('customer_id', customerId)
        .order('name');
      if (error) {
        console.error('Error fetching result products:', error);
        toast.error('Gagal memuat master produk: ' + error.message);
      } else if (data) {
        setResultProducts(data);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat master produk: ' + err.message);
    }
  };

  const getUomConversion = (productSku: any) => {
    if (!productSku) return null;
    
    let conversions: any[] = [];
    try {
      if (typeof productSku.uom_conversions === 'string') {
        conversions = JSON.parse(productSku.uom_conversions) || [];
      } else if (Array.isArray(productSku.uom_conversions)) {
        conversions = productSku.uom_conversions;
      }
    } catch (e) {
      console.error('Failed to parse uom_conversions:', e);
    }
    
    const currentUnit = productSku.unit || 'BOX';
    let conv = conversions.find((c: any) => 
      String(c.from_uom).toUpperCase() === currentUnit.toUpperCase() ||
      String(c.to_uom).toUpperCase() === currentUnit.toUpperCase()
    );
    
    if (conv) {
      const multiplier = Number(conv.multiplier);
      if (multiplier > 1) {
        const fromUom = String(conv.from_uom).toUpperCase();
        const toUom = String(conv.to_uom).toUpperCase();
        if (fromUom === currentUnit.toUpperCase()) {
          return { unit: fromUom, targetUom: toUom, multiplier };
        } else {
          return { unit: toUom, targetUom: fromUom, multiplier };
        }
      }
    }
    
    const multiplier = Number(productSku.conversion_to_base) || 1;
    const unit = productSku.unit || 'PCS';
    const baseUom = productSku.base_uom || 'PCS';
    
    if (multiplier > 1 && unit.toUpperCase() !== baseUom.toUpperCase()) {
      return { unit, targetUom: baseUom, multiplier };
    }
    
    return null;
  };

  const findBaseUnitSku = (product: any, allProducts: any[]) => {
    if (!product) return null;
    const conv = getUomConversion(product);
    const targetUom = conv ? conv.targetUom.toUpperCase() : 'PCS';
    
    const prefix = product.sku_code.split('-')[0];
    return allProducts.find((p: any) => 
      p.id !== product.id && 
      p.sku_code.startsWith(prefix) && 
      (p.sku_level === 'BASE_UNIT' || Number(p.conversion_to_base) === 1 || 
       String(p.unit).toUpperCase() === targetUom || String(p.base_uom).toUpperCase() === targetUom ||
       p.unit === 'PCS' || p.base_uom === 'PCS' || p.unit === 'PACK' || p.base_uom === 'PACK')
    );
  };

  const getProductTotalStock = (productId: string) => {
    const matched = sourceProducts.filter(p => p.id === productId);
    if (matched.length === 0) return null;
    
    const totalQty = matched.reduce((sum, item) => sum + Number(item.available_qty || 0), 0);
    const firstItem = matched[0];
    const conv = getUomConversion(firstItem);
    
    return {
      totalQty,
      unit: firstItem.unit || 'BOX',
      conv,
      baseQty: conv ? totalQty * conv.multiplier : totalQty,
      targetUom: conv ? conv.targetUom : (firstItem.base_uom || 'PCS')
    };
  };

  const handleExtractSmallestUnit = (sourceItem: ItemRow, sourceIndex: number, prod: any) => {
    const qty = Number(sourceItem.quantity);
    if (!qty || qty <= 0) {
      toast.error('Masukkan jumlah quantity source item terlebih dahulu');
      return;
    }
    
    const conv = getUomConversion(prod);
    if (!conv) {
      toast.error('Konversi unit tidak ditemukan untuk produk ini');
      return;
    }
    
    const baseProduct = findBaseUnitSku(prod, resultProducts);
    if (!baseProduct) {
      toast.error(`Unit terkecil (${conv.targetUom}) untuk produk ini tidak ditemukan di master data!`);
      return;
    }
    
    const multiplier = conv.multiplier;
    const convertedQty = qty * multiplier;
    
    const sourceCost = Number(sourceItem.unit_cost) || 0;
    const convertedCost = sourceCost > 0 ? String(sourceCost / multiplier) : '';
    
    const newResultRow: ItemRow = {
      product_id: baseProduct.id,
      quantity: String(convertedQty),
      unit_cost: convertedCost,
      location_id: sourceItem.location_id,
      batch_number: sourceItem.batch_number,
      expiry_date: sourceItem.expiry_date,
      notes: `Pecahan unit terkecil dari ${qty} ${conv.unit} SKU ${prod.sku_code}`,
      productSearch: '',
      locationSearch: '',
      showProductDropdown: false,
      showLocationDropdown: false
    };
    
    setResultItems([...resultItems, newResultRow]);
    toast.success(`Berhasil memecah menjadi ${convertedQty} ${baseProduct.base_uom || baseProduct.unit}`);
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase.from('md_warehouse_locations').select('id, code, zone, rack, shelf, bin').order('code');
      if (!error && data) setLocations(data);
    } catch (err) {}
  };

  const getSelectedProduct = (productId: string, isSource: boolean) => {
    const arr = isSource ? sourceProducts : resultProducts;
    return arr.find(p => p.id === productId);
  };
  const getSelectedLocation = (locationId: string) => locations.find(l => l.id === locationId);

  const createEmptyRow = (): ItemRow => ({
    product_id: '', quantity: '', unit_cost: '', location_id: '', batch_number: '', expiry_date: '', notes: '',
    productSearch: '', locationSearch: '', showProductDropdown: false, showLocationDropdown: false
  });

  const addSourceItem = () => {
    if (!selectedCustomerId) return toast.error('Please select a Customer first');
    setSourceItems([...sourceItems, createEmptyRow()]);
  };
  const removeSourceItem = (index: number) => setSourceItems(sourceItems.filter((_, i) => i !== index));
  const updateSourceItem = (index: number, updates: Partial<ItemRow> | keyof ItemRow, value?: any) => {
    setSourceItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (typeof updates === 'string') {
        return { ...item, [updates]: value };
      }
      return { ...item, ...updates };
    }));
  };

  const addResultItem = () => {
    if (!selectedCustomerId) return toast.error('Please select a Customer first');
    setResultItems([...resultItems, createEmptyRow()]);
  };
  const removeResultItem = (index: number) => setResultItems(resultItems.filter((_, i) => i !== index));
  const updateResultItem = (index: number, updates: Partial<ItemRow> | keyof ItemRow, value?: any) => {
    setResultItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (typeof updates === 'string') {
        return { ...item, [updates]: value };
      }
      return { ...item, ...updates };
    }));
  };

  const handleScanResult = (decodedText: string) => {
    if (!scanningTarget) return;
    const { type, index, field } = scanningTarget;
    
    if (field === 'product') {
      const targetArray = type === 'source' ? sourceProducts : resultProducts;
      const match = targetArray.find(p => p.sku_code.toLowerCase() === decodedText.toLowerCase());
      
      if (match) {
        if (type === 'source') updateSourceItem(index, 'product_id', match.id);
        else updateResultItem(index, 'product_id', match.id);
        toast.success(`Product ${match.name} scanned!`);
      } else {
        if (type === 'source') {
           toast.error(`Barcode ${decodedText} not found in available inventory for this customer!`);
        } else {
           toast.error(`Barcode ${decodedText} not found in master data for this customer!`);
        }
      }
    } else if (field === 'location') {
      const match = locations.find(l => l.code.toLowerCase() === decodedText.toLowerCase());
      if (match) {
        if (type === 'source') updateSourceItem(index, 'location_id', match.id);
        else updateResultItem(index, 'location_id', match.id);
        toast.success(`Location ${match.code} scanned!`);
      } else {
        toast.error(`No location found with barcode: ${decodedText}`);
      }
    }
    setScanningTarget(null);
  };

  const validateForm = () => {
    if (!selectedCustomerId) return toast.error('Customer is required'), false;
    if (!description.trim()) return toast.error('Description is required'), false;
    if (sourceItems.length === 0) return toast.error('At least one source item is required'), false;
    if (resultItems.length === 0) return toast.error('At least one result item is required'), false;

    for (let i = 0; i < sourceItems.length; i++) {
      const item = sourceItems[i];
      if (!item.product_id) return toast.error(`Source item ${i + 1}: Product is required`), false;
      if (!item.quantity || Number(item.quantity) <= 0) return toast.error(`Source item ${i + 1}: Valid quantity is required`), false;
      
      const inv = sourceProducts.find((p: any) => 
        p.id === item.product_id && 
        p.location_id === item.location_id && 
        p.batch_number === item.batch_number && 
        p.expiry_date === item.expiry_date
      ) as any;
      if (inv && Number(item.quantity) > inv.available_qty) {
        return toast.error(`Source item ${i + 1}: Qty (${item.quantity}) melebihi stok tersedia (${inv.available_qty})`), false;
      }
    }
    for (let i = 0; i < resultItems.length; i++) {
      if (!resultItems[i].product_id) return toast.error(`Result item ${i + 1}: Product is required`), false;
      if (!resultItems[i].quantity || Number(resultItems[i].quantity) <= 0) return toast.error(`Result item ${i + 1}: Valid quantity is required`), false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const orderNumber = `REP-${Date.now()}`;
      const { data: order, error: orderError } = await supabase.from('wh_repacking_orders').insert({
        tenant_id: profile?.tenant_id, warehouse_id: warehouseId, customer_id: selectedCustomerId,
        order_number: orderNumber, order_type: orderType, description, priority, notes, created_by: profile?.id,
      }).select('id').single();

      if (orderError) throw orderError;

      const sourcePayloads = sourceItems.map(item => ({
        repacking_order_id: order.id, tenant_id: profile?.tenant_id, warehouse_id: warehouseId,
        product_sku_id: item.product_id, item_type: 'SOURCE', quantity: Number(item.quantity),
        unit_cost: item.unit_cost ? Number(item.unit_cost) : null,
        source_location_id: item.location_id || null, target_location_id: null,
        batch_number: item.batch_number || null, expiry_date: item.expiry_date || null, notes: item.notes || null,
      }));

      const resultPayloads = resultItems.map(item => ({
        repacking_order_id: order.id, tenant_id: profile?.tenant_id, warehouse_id: warehouseId,
        product_sku_id: item.product_id, item_type: 'RESULT', quantity: Number(item.quantity),
        unit_cost: item.unit_cost ? Number(item.unit_cost) : null,
        source_location_id: null, target_location_id: item.location_id || null,
        batch_number: item.batch_number || null, expiry_date: item.expiry_date || null, notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase.from('wh_repacking_items').insert([...sourcePayloads, ...resultPayloads]);
      if (itemsError) throw itemsError;

      toast.success(`Order ${orderNumber} created!`);
      onSuccess();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderItemRow = (item: ItemRow, index: number, type: 'source' | 'result') => {
    const isSource = type === 'source';
    const updateFn = isSource ? updateSourceItem : updateResultItem;
    const removeFn = isSource ? removeSourceItem : removeResultItem;
    
    const availableProducts = isSource ? sourceProducts : resultProducts;
    const filteredProducts = availableProducts.filter((p: any) => {
      const search = item.productSearch.toLowerCase();
      const matchName = p.name.toLowerCase().includes(search);
      const matchSku = p.sku_code.toLowerCase().includes(search);
      const matchBatch = isSource && p.batch_number?.toLowerCase().includes(search);
      const matchLoc = isSource && p.location_code?.toLowerCase().includes(search);
      return matchName || matchSku || matchBatch || matchLoc;
    });
    
    const filteredLocations = locations.filter(l => l.code.toLowerCase().includes(item.locationSearch.toLowerCase()) || (l.zone && l.zone.toLowerCase().includes(item.locationSearch.toLowerCase())));

    return (
      <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-black text-slate-900">{isSource ? 'Source' : 'Result'} Item #{index + 1}</h4>
          <div className="flex items-center gap-2">
            {!isSource && item.product_id && (
              <button onClick={() => setPrintingIndex(index)} className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center hover:bg-purple-200 transition-all" title="Print Label"><Printer size={16} /></button>
            )}
            <button onClick={() => removeFn(index)} className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center hover:bg-rose-200 transition-all"><X size={16} /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 relative">
            <label className="block text-xs font-black text-slate-700">Product</label>
            <div className="relative flex">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={item.productSearch || getSelectedProduct(item.product_id, isSource)?.name || ''}
                  placeholder="Search product..."
                  onChange={(e) => updateFn(index, { productSearch: e.target.value, showProductDropdown: true })}
                  onClick={() => updateFn(index, { showProductDropdown: true })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-l-lg text-sm font-medium focus:border-indigo-500 outline-none"
                />
              </div>
              <button onClick={() => setScanningTarget({ type, index, field: 'product' })} className="px-3 bg-indigo-50 border-y border-r border-indigo-200 rounded-r-lg text-indigo-600 hover:bg-indigo-100 transition-colors" title="Scan Product Barcode"><Camera size={18} /></button>
              
              {item.showProductDropdown && filteredProducts.length > 0 && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => updateFn(index, { showProductDropdown: false })} />
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                    {filteredProducts.map((product: any) => {
                      if (isSource) {
                        return (
                          <div 
                            key={product.inventory_id} 
                            onClick={() => updateFn(index, { 
                              product_id: product.id, 
                              location_id: product.location_id,
                              batch_number: product.batch_number,
                              expiry_date: product.expiry_date,
                              unit_cost: product.unit_cost ? String(product.unit_cost) : '',
                              productSearch: '', 
                              showProductDropdown: false 
                            })} 
                            className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm border-b border-slate-100 last:border-0"
                          >
                            <div className="font-black text-slate-900">{product.name}</div>
                            <div className="text-xs text-slate-500 flex flex-wrap gap-x-2 gap-y-1 mt-0.5">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-700">SKU: {product.sku_code}</span>
                              <span className="bg-blue-50 px-1.5 py-0.5 rounded text-[10px] text-blue-700 font-bold">
                                Qty: {product.available_qty} {product.unit || 'BOX'}
                                {(() => {
                                  const conv = getUomConversion(product);
                                  return conv ? ` (${product.available_qty * conv.multiplier} ${conv.targetUom})` : '';
                                })()}
                              </span>
                              {product.batch_number && <span className="bg-purple-50 px-1.5 py-0.5 rounded text-[10px] text-purple-700">Batch: {product.batch_number}</span>}
                              {product.expiry_date && <span className="bg-amber-50 px-1.5 py-0.5 rounded text-[10px] text-amber-700">Exp: {product.expiry_date}</span>}
                              <span className="bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] text-emerald-700">Loc: {product.location_code}</span>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div 
                            key={product.id} 
                            onClick={() => updateFn(index, { 
                              product_id: product.id, 
                              productSearch: '', 
                              showProductDropdown: false 
                            })} 
                            className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm border-b border-slate-100 last:border-0"
                          >
                            <div className="font-black text-slate-900">{product.name}</div>
                            <div className="text-xs text-slate-500 flex flex-wrap gap-x-2 gap-y-1 mt-0.5">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-700">SKU: {product.sku_code}</span>
                              {(() => {
                                const stockInfo = getProductTotalStock(product.id);
                                if (!stockInfo) return null;
                                return (
                                  <span className="bg-purple-50 px-1.5 py-0.5 rounded text-[10px] text-purple-700 font-bold">
                                    Stok Gudang: {stockInfo.totalQty} {stockInfo.unit}
                                    {stockInfo.conv && ` (${stockInfo.baseQty} ${stockInfo.targetUom})`}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </>
              )}
            </div>
            {isSource && sourceProducts.length === 0 && selectedCustomerId && (
               <div className="text-[10px] text-rose-500 font-bold">No active inventory found for this customer.</div>
            )}
            {isSource && (() => {
              const prod = getSelectedProduct(item.product_id, true) as any;
              if (!prod) return null;
              
              const conv = getUomConversion(prod);
              if (conv) {
                return (
                  <div className="mt-2 flex items-center justify-between text-xs text-indigo-600 bg-indigo-50/50 border border-indigo-100 rounded-lg p-2 font-bold gap-2">
                    <span>Konversi: 1 {conv.unit} = {conv.multiplier} {conv.targetUom}</span>
                    <button 
                      type="button"
                      onClick={() => handleExtractSmallestUnit(item, index, prod)}
                      className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded-md hover:bg-indigo-700 transition-all font-black uppercase tracking-wider shrink-0"
                    >
                      Ambil Unit Terkecil
                    </button>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div className="space-y-2 relative">
            <label className="block text-xs font-black text-slate-700">{isSource ? 'Source Location' : 'Target Location'}</label>
            <div className="relative flex">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={item.locationSearch || getSelectedLocation(item.location_id)?.code || ''}
                  placeholder="Search location..."
                  onChange={(e) => updateFn(index, { locationSearch: e.target.value, showLocationDropdown: true })}
                  onClick={() => updateFn(index, { showLocationDropdown: true })}
                  disabled={isSource}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-l-lg text-sm font-medium focus:border-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              <button 
                onClick={() => setScanningTarget({ type, index, field: 'location' })} 
                disabled={isSource} 
                className="px-3 bg-indigo-50 border-y border-r border-indigo-200 rounded-r-lg text-indigo-600 hover:bg-indigo-100 transition-colors disabled:bg-slate-100 disabled:text-slate-400" 
                title="Scan Location QR"
              >
                <Camera size={18} />
              </button>
 
              {item.showLocationDropdown && filteredLocations.length > 0 && !isSource && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => updateFn(index, { showLocationDropdown: false })} />
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                    {filteredLocations.map(loc => (
                      <div key={loc.id} onClick={() => updateFn(index, { location_id: loc.id, locationSearch: '', showLocationDropdown: false })} className="px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm">
                        <div className="font-black text-slate-900">{loc.code}</div>
                        <div className="text-xs text-slate-500">{loc.zone && `${loc.zone} • `}{loc.rack && `Rack ${loc.rack}`}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-black text-slate-700">Quantity</label>
              {isSource ? (() => {
                const inv = sourceProducts.find((p: any) => 
                  p.id === item.product_id && 
                  p.location_id === item.location_id && 
                  p.batch_number === item.batch_number && 
                  p.expiry_date === item.expiry_date
                ) as any;
                if (!inv) return null;
                const conv = getUomConversion(inv);
                return (
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                    Stok: {inv.available_qty} {inv.unit || 'BOX'}
                    {conv && ` (${inv.available_qty * conv.multiplier} ${conv.targetUom})`}
                  </span>
                );
              })() : (() => {
                if (!item.product_id) return null;
                const stockInfo = getProductTotalStock(item.product_id);
                if (!stockInfo) return null;
                return (
                  <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                    Stok: {stockInfo.totalQty} {stockInfo.unit}
                    {stockInfo.conv && ` (${stockInfo.baseQty} ${stockInfo.targetUom})`}
                  </span>
                );
              })()}
            </div>
            <input type="number" value={item.quantity} onChange={(e) => updateFn(index, 'quantity', e.target.value)} placeholder="0" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium outline-none" />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-700">Unit Cost</label>
            <input type="number" value={item.unit_cost} onChange={(e) => updateFn(index, 'unit_cost', e.target.value)} disabled={isSource} placeholder="0.00" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium outline-none disabled:bg-slate-100 disabled:text-slate-500" />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-700">Batch Number</label>
            <input type="text" value={item.batch_number} onChange={(e) => updateFn(index, 'batch_number', e.target.value)} disabled={isSource} placeholder="Batch #" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium outline-none disabled:bg-slate-100 disabled:text-slate-500" />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-700">Expiry Date</label>
            <input type="date" value={item.expiry_date} onChange={(e) => updateFn(index, 'expiry_date', e.target.value)} disabled={isSource} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium outline-none disabled:bg-slate-100 disabled:text-slate-500" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center"><Package size={24} /></div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Create Order</h2>
                <p className="text-sm text-slate-600">Repacking, Bundling, or Kitting</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900"><X size={20} /></button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          <Card className="p-6 border border-slate-200 rounded-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-4">Order Details</h3>
            
            {/* NEW INVENTORY-BASED CUSTOMER SELECTOR */}
            <div className="mb-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <label className="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
                <Users size={16} className="text-blue-600" /> Pemilik Barang (Customer)
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const newCust = e.target.value;
                  setSelectedCustomerId(newCust);
                  fetchSourceProducts(newCust);
                  fetchResultProducts(newCust);
                  
                  if (sourceItems.length > 0 || resultItems.length > 0) {
                    setSourceItems([]);
                    setResultItems([]);
                    toast('Items cleared because customer changed', { icon: '🔄' });
                  }
                }}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:border-indigo-500 outline-none bg-white"
              >
                <option value="" disabled>-- Pilih Pemilik Barang --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {customers.length === 0 && (
                <div className="text-xs text-rose-500 font-bold mt-2">Tidak ada pelanggan dengan stok aktif di gudang ini.</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-black text-slate-700">Order Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {orderTypes.map(type => (
                    <button key={type.id} type="button" onClick={() => setOrderType(type.id as any)} className={`p-4 rounded-xl border-2 transition-all ${orderType === type.id ? `${type.border} ${type.bg} ${type.color}` : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                      <type.icon size={24} className="mx-auto mb-2" />
                      <div className="text-xs font-black text-center">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description..." className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none" />
                <div className="grid grid-cols-4 gap-2">
                  {priorities.map(p => (
                    <button key={p.id} type="button" onClick={() => setPriority(p.id as any)} className={`px-3 py-2 rounded-lg text-xs font-black ${priority === p.id ? `${p.bg} ${p.color} border border-current` : 'bg-slate-100 text-slate-600'}`}>{p.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className={`p-6 border rounded-2xl transition-all ${!selectedCustomerId ? 'opacity-50 pointer-events-none border-slate-200' : 'border-indigo-200'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900">Source Items</h3>
              <button onClick={addSourceItem} disabled={!selectedCustomerId || sourceProducts.length === 0} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black flex items-center gap-2 disabled:bg-slate-300"><Plus size={16} /> Add Source</button>
            </div>
            {sourceItems.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Package size={32} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-600">
                  {!selectedCustomerId ? 'Pilih Pemilik Barang terlebih dahulu' : 
                   sourceProducts.length === 0 ? 'Pelanggan ini tidak memiliki stok aktif yang bisa dibongkar.' : 'No source items added'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">{sourceItems.map((item, index) => renderItemRow(item, index, 'source'))}</div>
            )}
          </Card>

          <Card className={`p-6 border rounded-2xl transition-all ${!selectedCustomerId ? 'opacity-50 pointer-events-none border-slate-200' : 'border-purple-200'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900">Result Items</h3>
              <button onClick={addResultItem} disabled={!selectedCustomerId} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-black flex items-center gap-2 disabled:bg-slate-300"><Plus size={16} /> Add Result</button>
            </div>
            {activeBom && (
              <div className="mb-4 p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">BOM Recipe Detected</h4>
                    <p className="text-sm font-bold text-slate-700 mt-0.5">
                      {activeBom.name || activeBom.bom_number} ({activeBom.md_bom_items?.length || 0} components)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAutoPopulateBOM}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-md shadow-amber-600/10 active:scale-95 shrink-0"
                >
                  <PackagePlus size={14} /> Auto-populate Components
                </button>
              </div>
            )}
            {resultItems.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <Box size={32} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-600">{!selectedCustomerId ? 'Pilih Pemilik Barang terlebih dahulu' : 'No result items added'}</p>
              </div>
            ) : (
              <div className="space-y-4">{resultItems.map((item, index) => renderItemRow(item, index, 'result'))}</div>
            )}
          </Card>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-slate-600 font-bold">{sourceItems.length + resultItems.length} items total</div>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-black">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting || !selectedCustomerId} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black flex items-center gap-2 disabled:bg-slate-300">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />} Create Order
            </button>
          </div>
        </div>
      </div>

      {/* Overlays */}
      {scanningTarget && (
        <BarcodeScannerModal 
          onScan={handleScanResult} 
          onClose={() => setScanningTarget(null)} 
          title={`Scan ${scanningTarget.field === 'product' ? 'Product Barcode' : 'Location QR'}`}
        />
      )}

      {printingIndex !== null && (
        <PrintLabelModal
          productName={getSelectedProduct(resultItems[printingIndex].product_id, false)?.name || 'Unknown Product'}
          skuCode={getSelectedProduct(resultItems[printingIndex].product_id, false)?.sku_code || 'N/A'}
          quantity={Number(resultItems[printingIndex].quantity || 0)}
          batchNumber={resultItems[printingIndex].batch_number}
          expiryDate={resultItems[printingIndex].expiry_date}
          onClose={() => setPrintingIndex(null)}
        />
      )}
    </div>
  );
}
