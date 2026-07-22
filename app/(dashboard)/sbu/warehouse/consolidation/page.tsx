'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { toast } from 'react-hot-toast'
import {
  Package, Layers, Printer, Plus, Search, MapPin, CheckSquare, Square,
  Loader2, ArrowRight, CheckCircle2, AlertCircle, Box, Truck, Camera, Trash2
} from 'lucide-react'
import { fetchConsolidationDataAdmin, registerParcelInboundAdmin, createMasterBoxAdmin } from './actions'
import ManifestPrintModal from './components/ManifestPrintModal'
import ParcelPrintModal from './components/ParcelPrintModal'
import GoogleMapsInput from '@/components/master/GoogleMapsInput'

type TabMode = 'inbound' | 'create' | 'manifests';

export default function ParcelConsolidationPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabMode>('inbound');
  
  const [parcels, setParcels] = useState<any[]>([]);
  const [masterBoxes, setMasterBoxes] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Modal states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedBoxForPrint, setSelectedBoxForPrint] = useState<any | null>(null);
  const [selectedParcelForPrint, setSelectedParcelForPrint] = useState<any | null>(null);

  // Selection states for Create Master Box
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedParcelIds, setSelectedParcelIds] = useState<Set<string>>(new Set());
  const [packingMaterial, setPackingMaterial] = useState<string>('Kardus Master L');
  const [masterBoxLocationId, setMasterBoxLocationId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Register form state
  const [regForm, setRegForm] = useState({
    customer_id: '',
    shipper_name: '',
    consignee_name: '',
    destination_city: 'SURABAYA',
    consignee_address: '',
    qty: 1,
    weight_kg: 2.5,
    length_cm: 30,
    width_cm: 20,
    height_cm: 15,
    location_id: '',
    notes: ''
  });

  // Photo & Inner items state
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [innerItems, setInnerItems] = useState<{
    item_id: string;
    product_name: string;
    qty: number;
    weight_kg: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
  }[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemWeight, setNewItemWeight] = useState(0.5);
  const [newItemLength, setNewItemLength] = useState(10);
  const [newItemWidth, setNewItemWidth] = useState(10);
  const [newItemHeight, setNewItemHeight] = useState(10);

  useEffect(() => {
    loadData();
  }, [profile]);

  async function loadData() {
    try {
      setLoading(true);
      const whId = profile?.warehouse_id || undefined;
      const data = await fetchConsolidationDataAdmin(whId);
      setParcels(data.parcels);
      setMasterBoxes(data.masterBoxes);
      setLocations(data.locations);
      setCustomers(data.customers);

      // Auto select first city if available
      const pending = data.parcels.filter((p: any) => p.status === 'RECEIVED' || p.status === 'PUTAWAY');
      if (pending.length > 0 && !selectedCity) {
        setSelectedCity(pending[0].destination_city);
      }
    } catch (e: any) {
      toast.error('Gagal memuat data konsolidasi: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return toast.error('Masukkan nama produk/SKU');
    const autoId = `ITM-${Math.floor(100000 + Math.random() * 900000)}`;
    const newItem = {
      item_id: autoId,
      product_name: newItemName.trim(),
      qty: newItemQty,
      weight_kg: newItemWeight,
      length_cm: newItemLength,
      width_cm: newItemWidth,
      height_cm: newItemHeight
    };
    const nextList = [...innerItems, newItem];
    setInnerItems(nextList);

    // Auto calculate total weight and update outer form
    const totalW = nextList.reduce((acc, it) => acc + (it.weight_kg * it.qty), 0);
    setRegForm(prev => ({
      ...prev,
      weight_kg: Number(totalW.toFixed(2))
    }));

    setNewItemName('');
    setNewItemQty(1);
    setNewItemWeight(0.5);
    setNewItemLength(10);
    setNewItemWidth(10);
    setNewItemHeight(10);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.shipper_name || !regForm.consignee_name || !regForm.destination_city) {
      toast.error('Lengkapi Pengirim, Penerima, dan Kota Tujuan');
      return;
    }

    try {
      setSubmitting(true);
      const tenantId = profile?.tenant_id || '';
      let whId = profile?.warehouse_id || '';
      
      if (!whId && locations.length > 0) {
        whId = locations[0].warehouse_id || '';
      }

      let finalQty = regForm.qty;
      let finalWeight = regForm.weight_kg;
      let finalL = regForm.length_cm;
      let finalW = regForm.width_cm;
      let finalH = regForm.height_cm;

      if (innerItems.length > 0) {
        finalQty = innerItems.reduce((s, i) => s + i.qty, 0);
        finalWeight = Number(innerItems.reduce((s, i) => s + (i.weight_kg * i.qty), 0).toFixed(2));
        finalL = Math.max(...innerItems.map(i => i.length_cm || 10), 10);
        finalW = Math.max(...innerItems.map(i => i.width_cm || 10), 10);
        const totalCbm = innerItems.reduce((s, i) => s + (((i.length_cm * i.width_cm * i.height_cm) / 1000000) * i.qty), 0);
        if (finalL > 0 && finalW > 0 && totalCbm > 0) {
          finalH = Math.max(Math.round((totalCbm * 1000000) / (finalL * finalW)), 1);
        } else {
          finalH = Math.max(...innerItems.map(i => i.height_cm || 10), 10);
        }
      }

      const created = await registerParcelInboundAdmin({
        ...regForm,
        qty: finalQty,
        weight_kg: finalWeight,
        length_cm: finalL,
        width_cm: finalW,
        height_cm: finalH,
        destination_city: regForm.destination_city.toUpperCase().trim(),
        tenant_id: tenantId || '00000000-0000-0000-0000-000000000000',
        warehouse_id: whId || '00000000-0000-0000-0000-000000000000',
        photo_url: photoPreview,
        items: innerItems
      });

      toast.success('Parcel inbound berhasil diregistrasi!');
      setShowRegisterModal(false);
      setPhotoPreview('');
      setInnerItems([]);
      setSelectedParcelForPrint(created);
      loadData();
    } catch (e: any) {
      toast.error('Gagal meregistrasi parcel: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMasterBox = async () => {
    if (selectedParcelIds.size === 0) {
      toast.error('Pilih minimal 1 parcel untuk digabungkan');
      return;
    }

    try {
      setSubmitting(true);
      const tenantId = profile?.tenant_id || '00000000-0000-0000-0000-000000000000';
      const whId = profile?.warehouse_id || '00000000-0000-0000-0000-000000000000';
      const staffName = profile?.full_name || profile?.email || 'Staf Gudang';

      // Collect unique parcel IDs from expanded selection
      const uniqueParcelIds = Array.from(new Set(
        Array.from(selectedParcelIds).map(eid => eid.includes('::') ? eid.split('::')[0] : eid)
      ));

      const created = await createMasterBoxAdmin(
        selectedCity || 'HUB',
        uniqueParcelIds,
        packingMaterial,
        whId,
        tenantId,
        staffName,
        masterBoxLocationId
      );

      toast.success(`Master Box ${created.master_box_code} berhasil dibuat & diputaway!`);
      setSelectedParcelIds(new Set());
      setMasterBoxLocationId('');
      await loadData();
      setActiveTab('manifests');
    } catch (e: any) {
      toast.error('Gagal membuat Master Box: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Flatten parcels into per-product rows ──
  // Each product item becomes its own row with a unique expandedId
  type ExpandedRow = {
    expandedId: string;       // unique key: "parcelId" or "parcelId::itemIdx"
    parcelId: string;         // original parcel UUID
    parcel: any;              // full parcel record
    itemIdx: number;          // -1 if no items, else index
    item: any | null;         // individual product item or null
    product_name: string;
    qty: number;
    weight_kg: number;
    dimensions: string;
  };

  const expandedRows: ExpandedRow[] = React.useMemo(() => {
    const rows: ExpandedRow[] = [];
    for (const p of parcels) {
      const items = Array.isArray(p.items) ? p.items : [];
      if (items.length <= 1) {
        // Single or no items — 1 row
        const it = items[0] || null;
        rows.push({
          expandedId: p.id,
          parcelId: p.id,
          parcel: p,
          itemIdx: -1,
          item: it,
          product_name: it ? it.product_name : `Paket ${p.parcel_code}`,
          qty: it ? (it.qty || 1) : (p.qty || 1),
          weight_kg: it ? (it.weight_kg || 0) : (p.weight_kg || 0),
          dimensions: it ? `${it.length_cm || 0}×${it.width_cm || 0}×${it.height_cm || 0} cm` : '-',
        });
      } else {
        // Multiple items — 1 row per product
        items.forEach((it: any, idx: number) => {
          rows.push({
            expandedId: `${p.id}::${idx}`,
            parcelId: p.id,
            parcel: p,
            itemIdx: idx,
            item: it,
            product_name: it.product_name,
            qty: it.qty || 1,
            weight_kg: it.weight_kg || 0,
            dimensions: `${it.length_cm || 0}×${it.width_cm || 0}×${it.height_cm || 0} cm`,
          });
        });
      }
    }
    return rows;
  }, [parcels]);

  const pendingRows = expandedRows.filter(r => r.parcel.status === 'RECEIVED' || r.parcel.status === 'PUTAWAY');
  const availableCities = Array.from(new Set(pendingRows.map(r => r.parcel.destination_city))).sort();
  const filteredPending = pendingRows.filter(r => !selectedCity || r.parcel.destination_city === selectedCity);

  const toggleSelectAll = () => {
    if (selectedParcelIds.size === filteredPending.length) {
      setSelectedParcelIds(new Set());
    } else {
      setSelectedParcelIds(new Set(filteredPending.map(r => r.expandedId)));
    }
  };

  const toggleSelectParcel = (expandedId: string) => {
    const next = new Set(selectedParcelIds);
    if (next.has(expandedId)) next.delete(expandedId);
    else next.add(expandedId);
    setSelectedParcelIds(next);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 font-black text-[10px] rounded-md uppercase tracking-wider">
              Line-Haul Hub
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Parcel Consolidation & Dispatch</h1>
          <p className="text-slate-500 text-sm font-medium">Konsolidasi paket kecil multi-pelanggan ke Master Box berbasis Kota Tujuan Hub</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('inbound')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'inbound' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Layers size={16} /> 1. Inbound Log ({parcels.length})
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'create' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Box size={16} /> 2. Create Master Box ({pendingRows.length})
        </button>
        <button
          onClick={() => setActiveTab('manifests')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'manifests' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Printer size={16} /> 3. Master Boxes & Manifests ({masterBoxes.length})
        </button>
      </div>

      {/* TAB 1: CREATE MASTER BOX BY CITY */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel: City Selector & Pending List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                  📍
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm uppercase">Filter Kota Tujuan Hub</h3>
                  <p className="text-xs text-slate-500 font-medium">Tampilkan parcel dengan kota yang sama untuk dikonsolidasi</p>
                </div>
              </div>
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedParcelIds(new Set());
                }}
                className="px-4 py-2 border-2 border-slate-200 rounded-xl bg-slate-50 text-sm font-black text-slate-900 outline-none focus:border-indigo-600"
              >
                <option value="">Semua Kota ({pendingRows.length})</option>
                {availableCities.map(city => {
                  const cnt = pendingRows.filter(r => r.parcel.destination_city === city).length;
                  return <option key={city} value={city}>{city} ({cnt} Pcs)</option>;
                })}
              </select>
            </div>

            {/* Parcels Grid */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-xs font-black uppercase text-slate-700 hover:text-black"
                >
                  {selectedParcelIds.size > 0 && selectedParcelIds.size === filteredPending.length ? (
                    <CheckSquare size={18} className="text-indigo-600" />
                  ) : (
                    <Square size={18} className="text-slate-400" />
                  )}
                  Pilih Semua ({filteredPending.length} Pcs)
                </button>
                <span className="text-xs font-bold text-indigo-600">
                  {selectedParcelIds.size} Terpilih
                </span>
              </div>

              {filteredPending.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Package size={40} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-slate-600">Tidak ada parcel pending untuk kota {selectedCity || 'ini'}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredPending.map(row => {
                    const isSelected = selectedParcelIds.has(row.expandedId);
                    return (
                      <div
                        key={row.expandedId}
                        onClick={() => toggleSelectParcel(row.expandedId)}
                        className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isSelected ? (
                            <CheckSquare size={20} className="text-indigo-600 shrink-0" />
                          ) : (
                            <Square size={20} className="text-slate-300 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-[10px] px-1.5 py-0.5 bg-slate-900 text-white rounded">
                                {row.parcel.parcel_code}
                              </span>
                              {row.item && (
                                <span className="font-mono font-black text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                                  [{row.item.item_id}]
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded uppercase">
                                {row.parcel.destination_city}
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 text-sm mt-1 truncate">
                              {row.product_name}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                              {row.parcel.shipper_name} → {row.parcel.consignee_name}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-black text-slate-900 text-xs">{row.qty} pcs</div>
                          <div className="text-[10px] font-bold text-slate-500">{row.weight_kg} kg</div>
                          <div className="text-[9px] font-medium text-slate-400">{row.dimensions}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Consolidation Summary Bench */}
          <div className="space-y-6">
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-6 border border-slate-800">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
                  📦
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wider">Consolidation Bench</h3>
                  <p className="text-xs text-slate-400 font-medium">Bungkus parcel terpilih ke Master Box</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-medium">Kota Tujuan:</span>
                  <span className="font-black text-amber-400 uppercase">{selectedCity || 'MULTI CITY'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-medium">Total Paket:</span>
                  <span className="font-black text-white">{selectedParcelIds.size} Pcs</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-medium">Estimasi Berat:</span>
                  <span className="font-black text-emerald-400">
                    {Array.from(selectedParcelIds).reduce((acc, eid) => {
                      const row = expandedRows.find(r => r.expandedId === eid);
                      return acc + (Number(row?.weight_kg) || 0);
                    }, 0).toFixed(2)} KG
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300">Material Pembungkus</label>
                  <select
                    value={packingMaterial}
                    onChange={(e) => setPackingMaterial(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white outline-none focus:border-indigo-500"
                  >
                    <option value="Kardus Master L">📦 Kardus Master L (Heavy Duty)</option>
                    <option value="Palet Kayu + Strapping">🪵 Palet Kayu + Strapping Band</option>
                    <option value="Karung Plastik Jumbo">🛍️ Karung Plastik Jumbo</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300">📍 Putaway Lokasi Simpan Box</label>
                  <select
                    value={masterBoxLocationId}
                    onChange={(e) => setMasterBoxLocationId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-emerald-400 outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Pilih Rak / Staging Area --</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.code} ({[loc.zone, loc.rack, loc.shelf].filter(Boolean).join('-') || loc.location_type || 'Staging Hub'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleCreateMasterBox}
                disabled={selectedParcelIds.size === 0 || submitting}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Box size={18} />}
                Create Master Box & Seal
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: MASTER BOXES & MANIFESTS */}
      {activeTab === 'manifests' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-black uppercase">
                  <th className="text-left px-6 py-4">Master LPN Code</th>
                  <th className="text-left px-6 py-4">Tujuan Hub</th>
                  <th className="text-center px-6 py-4">Total Isi</th>
                  <th className="text-right px-6 py-4">Berat / CBM</th>
                  <th className="text-left px-6 py-4">Material</th>
                  <th className="text-center px-6 py-4">Status</th>
                  <th className="text-center px-6 py-4">Aksi Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {masterBoxes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                      Belum ada Master Box yang dibuat
                    </td>
                  </tr>
                ) : (
                  masterBoxes.map(box => {
                    const childParcels = parcels.filter(p => p.master_box_id === box.id);
                    return (
                      <tr key={box.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-mono font-black text-xs text-slate-900">{box.master_box_code}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-900 text-white font-black text-xs rounded uppercase">
                            {box.destination_city}
                          </span>
                          <div className="text-xs text-slate-500 font-bold mt-1 truncate max-w-xs">{box.consignee_name}</div>
                        </td>
                        <td className="px-6 py-4 text-center font-black text-slate-900">{box.total_parcels} BOX</td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-black text-slate-900">{box.total_weight_kg} KG</div>
                          <div className="text-[10px] font-bold text-slate-400">{box.total_cbm} CBM</div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-600">{box.packing_material}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[10px] rounded uppercase">
                              {box.status}
                            </span>
                            {box.location?.code && (
                              <span className="px-2 py-0.5 bg-indigo-900 text-white font-bold text-[9px] rounded">
                                📍 {box.location.code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => setSelectedBoxForPrint({ box, childParcels })}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 mx-auto"
                          >
                            <Printer size={14} /> Print A6
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1: INBOUND PARCELS LOG & EMBEDDED REGISTER FORM */}
      {activeTab === 'inbound' && (
        <div className="space-y-4">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Daftar Parcel Inbound</h2>
              <p className="text-[11px] text-slate-500 font-medium">Log penerimaan paket dari shipper sebelum dikonsolidasi ke Master Box</p>
            </div>
            <button
              onClick={() => setShowRegisterModal(!showRegisterModal)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 self-start sm:self-auto active:scale-95 ${
                showRegisterModal ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20'
              }`}
            >
              {showRegisterModal ? '✕ Tutup Form' : '+ Register Parcel Inbound'}
            </button>
          </div>

          {/* EMBEDDED REGISTER FORM (COMPACT & FITTING COLUMNS) */}
          {showRegisterModal && (
            <div className="bg-white rounded-2xl border border-indigo-200 shadow-md p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-indigo-950 text-xs uppercase flex items-center gap-2">
                  <Plus size={14} className="text-indigo-600" /> Form Registrasi Parcel Inbound
                </h3>
                <span className="text-[10px] font-bold text-slate-400">Isi data paket dan detail produk tunggal/multi</span>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-600">Nama Pengirim (Shipper)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PT ALPHA TRADING"
                      value={regForm.shipper_name}
                      onChange={e => setRegForm({ ...regForm, shipper_name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-600">Nama Penerima</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TOKO SURYA"
                      value={regForm.consignee_name}
                      onChange={e => setRegForm({ ...regForm, consignee_name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-600">Kota Tujuan Hub</label>
                    <input
                      type="text"
                      required
                      placeholder="SURABAYA"
                      value={regForm.destination_city}
                      onChange={e => setRegForm({ ...regForm, destination_city: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-black uppercase text-indigo-700 outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-600">📍 Lokasi Putaway (Rak)</label>
                    <select
                      value={regForm.location_id}
                      onChange={e => setRegForm({ ...regForm, location_id: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-600 bg-white"
                    >
                      <option value="">-- Pilih Lokasi Rak --</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.code} ({[loc.zone, loc.rack, loc.shelf].filter(Boolean).join('-') || loc.location_type || 'Staging'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-600">Alamat Lengkap Penerima (Google Maps)</label>
                    <GoogleMapsInput
                      placeholder="Ketik alamat penerima..."
                      defaultValue={regForm.consignee_address}
                      onPlaceSelect={(place) => {
                        setRegForm(prev => ({
                          ...prev,
                          consignee_address: place.address,
                          destination_city: place.city ? place.city.toUpperCase() : prev.destination_city
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase text-slate-600">Foto Fisik Parcel</label>
                    <div className="bg-slate-50 px-3 py-1 rounded-xl border border-slate-200 flex items-center justify-between gap-2 h-[34px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Camera size={14} className="text-indigo-600 shrink-0" />
                        <span className="text-[10px] font-bold text-slate-600 truncate">{photoPreview ? 'Foto terpilih' : 'Belum ada foto'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {photoPreview && (
                          <img src={photoPreview} alt="Preview" className="w-6 h-6 rounded object-cover border border-slate-300" />
                        )}
                        <label className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black cursor-pointer transition-all">
                          Pilih
                          <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
                        </label>
                        {photoPreview && (
                          <button type="button" onClick={() => setPhotoPreview('')} className="p-0.5 text-rose-500 hover:bg-rose-50 rounded">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inner Product Items Section */}
                <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-indigo-950">📦 Daftar Isi Produk (Include Dimensi & Berat)</span>
                    <span className="text-[10px] font-bold text-slate-600">{innerItems.length} Produk Ditambahkan</span>
                  </div>
                  
                  <div className="space-y-2 bg-white p-2.5 rounded-xl border border-indigo-100 shadow-xs">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-5 space-y-1">
                        <label className="block text-[9px] font-black uppercase text-slate-500">Nama Produk / SKU</label>
                        <input
                          type="text"
                          placeholder="e.g. SEPATU NIKE AIR MAX / SK-001..."
                          value={newItemName}
                          onChange={e => setNewItemName(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:border-indigo-600 focus:bg-white"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="block text-[9px] font-black uppercase text-slate-500">Qty</label>
                        <input
                          type="number" min="1"
                          value={newItemQty}
                          onChange={e => setNewItemQty(parseInt(e.target.value) || 1)}
                          className="w-full px-1.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-black text-center outline-none focus:border-indigo-600"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="block text-[9px] font-black uppercase text-slate-500">Berat(KG)</label>
                        <input
                          type="number" step="0.1" min="0"
                          value={newItemWeight}
                          onChange={e => setNewItemWeight(parseFloat(e.target.value) || 0)}
                          className="w-full px-1.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-black text-center outline-none focus:border-indigo-600"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="block text-[9px] font-black uppercase text-slate-500">P(cm)</label>
                        <input
                          type="number" min="0"
                          value={newItemLength}
                          onChange={e => setNewItemLength(parseInt(e.target.value) || 0)}
                          className="w-full px-1.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-bold text-center outline-none focus:border-indigo-600"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="block text-[9px] font-black uppercase text-slate-500">L(cm)</label>
                        <input
                          type="number" min="0"
                          value={newItemWidth}
                          onChange={e => setNewItemWidth(parseInt(e.target.value) || 0)}
                          className="w-full px-1.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-bold text-center outline-none focus:border-indigo-600"
                        />
                      </div>
                      <div className="md:col-span-1 space-y-1">
                        <label className="block text-[9px] font-black uppercase text-slate-500">T(cm)</label>
                        <input
                          type="number" min="0"
                          value={newItemHeight}
                          onChange={e => setNewItemHeight(parseInt(e.target.value) || 0)}
                          className="w-full px-1.5 py-1.5 border border-slate-200 bg-slate-50 rounded-lg text-xs font-bold text-center outline-none focus:border-indigo-600"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <button
                          type="button"
                          onClick={handleAddItem}
                          className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase hover:bg-indigo-500 active:scale-95 shadow-sm"
                        >
                          + Add Item
                        </button>
                      </div>
                    </div>
                  </div>

                  {innerItems.length > 0 && (
                    <div className="divide-y divide-indigo-100 bg-white rounded-xl p-2 border border-indigo-100 max-h-32 overflow-y-auto shadow-inner space-y-1">
                      {innerItems.map((it, idx) => (
                        <div key={idx} className="py-1 px-2 flex justify-between items-center text-xs hover:bg-slate-50 rounded-lg">
                          <div className="min-w-0 pr-2">
                            <span className="font-mono font-black text-[10px] text-indigo-700 mr-1.5 bg-indigo-50 px-1.5 py-0.5 rounded">[{it.item_id}]</span>
                            <span className="font-bold text-slate-900 truncate">{it.product_name}</span>
                            <span className="text-[10px] text-slate-500 font-medium ml-2">
                              ({it.length_cm}x{it.width_cm}x{it.height_cm} cm | {it.weight_kg} kg/pcs)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-black text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded">{it.qty} Pcs</span>
                            <button
                              type="button"
                              onClick={() => {
                                const nextList = innerItems.filter((_, i) => i !== idx);
                                setInnerItems(nextList);
                                const totalW = nextList.reduce((acc, item) => acc + (item.weight_kg * item.qty), 0);
                                setRegForm(prev => ({ ...prev, weight_kg: Number(totalW.toFixed(2)) }));
                              }}
                              className="text-rose-400 hover:text-rose-600 font-bold p-1 hover:bg-rose-50 rounded"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* BOTTOM SUMMARY */}
                  {innerItems.length > 0 && (
                    <div className="bg-slate-900 text-white p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs shadow-sm border border-slate-800">
                      <span className="font-black uppercase tracking-wider text-[10px] text-amber-400 flex items-center gap-1.5">
                        📊 Summary ({innerItems.length} Macam):
                      </span>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-black text-[11px]">
                        <span>Qty: <span className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{innerItems.reduce((s, i) => s + i.qty, 0)} Pcs</span></span>
                        <span>Berat: <span className="text-emerald-400">{innerItems.reduce((s, i) => s + (i.weight_kg * i.qty), 0).toFixed(2)} KG</span></span>
                        <span>Vol: <span className="text-cyan-400">{innerItems.reduce((s, i) => s + (((i.length_cm * i.width_cm * i.height_cm) / 1000000) * i.qty), 0).toFixed(4)} CBM</span></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Metrics Grid - Hanya muncul jika tidak ada produk detail di dalam parcel */}
                {innerItems.length === 0 && (
                  <div className="grid grid-cols-5 gap-2 pt-1 border-t border-slate-100">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase text-indigo-700">Qty (Koli)</label>
                      <input
                        type="number" min="1"
                        value={regForm.qty}
                        onChange={e => setRegForm({ ...regForm, qty: parseInt(e.target.value) || 1 })}
                        className="w-full px-2.5 py-1.5 border-2 border-indigo-200 bg-indigo-50/50 rounded-xl text-xs font-black text-center text-indigo-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase text-slate-500">Berat (KG)</label>
                      <input
                        type="number" step="0.1"
                        value={regForm.weight_kg}
                        onChange={e => setRegForm({ ...regForm, weight_kg: parseFloat(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-black text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase text-slate-500">P (cm)</label>
                      <input
                        type="number"
                        value={regForm.length_cm}
                        onChange={e => setRegForm({ ...regForm, length_cm: parseInt(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase text-slate-500">L (cm)</label>
                      <input
                        type="number"
                        value={regForm.width_cm}
                        onChange={e => setRegForm({ ...regForm, width_cm: parseInt(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase text-slate-500">T (cm)</label>
                      <input
                        type="number"
                        value={regForm.height_cm}
                        onChange={e => setRegForm({ ...regForm, height_cm: parseInt(e.target.value) || 0 })}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-center"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50 flex items-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer size={14} />}
                    Save & Print Barcode
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600 font-black uppercase">
                    <th className="text-left px-6 py-4">Parcel Code</th>
                  <th className="text-left px-6 py-4">Pengirim (Shipper)</th>
                  <th className="text-left px-6 py-4">Penerima (Consignee)</th>
                  <th className="text-center px-6 py-4">Kota Tujuan</th>
                  <th className="text-center px-6 py-4">Qty / Berat</th>
                  <th className="text-center px-6 py-4">Status</th>
                  <th className="text-center px-6 py-4">Print Barcode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parcels.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                      Belum ada parcel inbound tercatat
                    </td>
                  </tr>
                ) : (
                  parcels.map(p => {
                    const items = Array.isArray(p.items) ? p.items : [];
                    if (items.length <= 1) {
                      // Single item or no items — show 1 row
                      const singleItem = items[0] || null;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono font-black text-xs text-slate-900">
                            {p.parcel_code}
                            {p.photo_url && <span className="ml-1 text-[10px] text-emerald-600">📸</span>}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800">{p.shipper_name}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{p.consignee_name}</div>
                            <div className="text-xs text-slate-500 truncate max-w-xs">{p.consignee_address || '-'}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-black text-[10px] rounded uppercase">
                              {p.destination_city}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {singleItem ? (
                              <div>
                                <div className="font-bold text-slate-900 text-xs truncate max-w-[140px] mx-auto">{singleItem.product_name}</div>
                                <div className="text-[10px] font-bold text-slate-500">{singleItem.qty} pcs · {singleItem.weight_kg} kg</div>
                              </div>
                            ) : (
                              <div>
                                <div className="font-black text-slate-900">{p.qty || 1} BOX</div>
                                <div className="text-[10px] font-bold text-slate-500">{p.weight_kg} KG / {p.cbm} CBM</div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                p.status === 'RECEIVED' || p.status === 'PUTAWAY' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {p.status === 'RECEIVED' ? 'PUTAWAY' : p.status}
                              </span>
                              {p.location?.code && (
                                <span className="px-2 py-0.5 bg-slate-900 text-white font-bold text-[9px] rounded flex items-center gap-0.5">
                                  📍 {p.location.code}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setSelectedParcelForPrint(p)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 mx-auto"
                            >
                              <Printer size={14} /> Barcode
                            </button>
                          </td>
                        </tr>
                      );
                    }
                    // Multiple items — show header row + sub-rows per product
                    return (
                      <React.Fragment key={p.id}>
                        {/* Parent parcel header row */}
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                          <td className="px-6 py-3 font-mono font-black text-xs text-slate-900" rowSpan={1}>
                            {p.parcel_code}
                            {p.photo_url && <span className="ml-1 text-[10px] text-emerald-600">📸</span>}
                            <div className="mt-0.5 text-[10px] font-bold text-indigo-600">{items.length} produk ↓</div>
                          </td>
                          <td className="px-6 py-3 font-bold text-slate-800">{p.shipper_name}</td>
                          <td className="px-6 py-3">
                            <div className="font-bold text-slate-900">{p.consignee_name}</div>
                            <div className="text-xs text-slate-500 truncate max-w-xs">{p.consignee_address || '-'}</div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-black text-[10px] rounded uppercase">
                              {p.destination_city}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <div className="font-black text-slate-900 text-xs">{items.reduce((s: number, it: any) => s + (it.qty || 1), 0)} pcs total</div>
                            <div className="text-[10px] font-bold text-slate-500">{p.weight_kg} KG / {p.cbm} CBM</div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                p.status === 'RECEIVED' || p.status === 'PUTAWAY' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {p.status === 'RECEIVED' ? 'PUTAWAY' : p.status}
                              </span>
                              {p.location?.code && (
                                <span className="px-2 py-0.5 bg-slate-900 text-white font-bold text-[9px] rounded flex items-center gap-0.5">
                                  📍 {p.location.code}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <button
                              onClick={() => setSelectedParcelForPrint(p)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 mx-auto"
                            >
                              <Printer size={14} /> Barcode
                            </button>
                          </td>
                        </tr>
                        {/* Sub-rows per product item */}
                        {items.map((it: any, itIdx: number) => (
                          <tr key={`${p.id}-item-${itIdx}`} className="bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors border-b border-indigo-100/50">
                            <td className="pl-10 pr-6 py-2">
                              <span className="font-mono font-black text-[10px] text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                                [{it.item_id}]
                              </span>
                            </td>
                            <td colSpan={2} className="px-6 py-2">
                              <div className="font-bold text-slate-900 text-xs">{it.product_name}</div>
                              <div className="text-[10px] text-slate-500 font-medium">
                                {it.length_cm || 0}×{it.width_cm || 0}×{it.height_cm || 0} cm
                              </div>
                            </td>
                            <td className="px-6 py-2 text-center">
                              <span className="text-[10px] font-black text-slate-600">—</span>
                            </td>
                            <td className="px-6 py-2 text-center">
                              <div className="font-black text-indigo-900 text-xs">{it.qty} pcs</div>
                              <div className="text-[10px] font-bold text-slate-500">{it.weight_kg} kg/pcs</div>
                            </td>
                            <td className="px-6 py-2 text-center">
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded uppercase">
                                SKU #{itIdx + 1}/{items.length}
                              </span>
                            </td>
                            <td className="px-6 py-2"></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}




      {/* PRINT MANIFEST MODAL */}
      {selectedBoxForPrint && (
        <ManifestPrintModal
          masterBox={selectedBoxForPrint.box}
          parcels={selectedBoxForPrint.childParcels}
          onClose={() => setSelectedBoxForPrint(null)}
        />
      )}

      {/* PRINT PARCEL BARCODE MODAL */}
      {selectedParcelForPrint && (
        <ParcelPrintModal
          parcel={selectedParcelForPrint}
          onClose={() => setSelectedParcelForPrint(null)}
        />
      )}

    </div>
  )
}
