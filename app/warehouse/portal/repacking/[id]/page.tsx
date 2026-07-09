'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ChevronLeft, Loader2, CheckCircle2, MapPin, 
  User, Package, Box, Layers, Lock, ArrowRight, Play,
  Plus, Trash2, Scan
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { fetchRepackingDetailsAdmin, completeRepackingOrderAdmin, updateRepackingStageAdmin } from './actions';
import { supabase } from '@/lib/supabaseClient';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';

export default function RepackingTaskExecutionPage() {
  const router = useRouter();
  const params = useParams();
  const repackingId = params.id as string;
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [repacking, setRepacking] = useState<any>(null);
  
  const [sourceItems, setSourceItems] = useState<any[]>([]);
  const [resultItems, setResultItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  
  // Local checklists for pipeline stages
  const [currentStage, setCurrentStage] = useState(1);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [targetLocations, setTargetLocations] = useState<Record<string, string>>({});
  const [putAway, setPutAway] = useState<Record<string, boolean>>({});
  const [putawayEntries, setPutawayEntries] = useState<Record<string, { id: string; locationCode: string; qty: string }[]>>({});

  // Picking Stage Inputs
  const [pickedProductSkus, setPickedProductSkus] = useState<Record<string, string>>({});
  const [pickedLocations, setPickedLocations] = useState<Record<string, string>>({});
  const [pickedQuantities, setPickedQuantities] = useState<Record<string, string>>({});
  const [pickedPutawaySrcs, setPickedPutawaySrcs] = useState<Record<string, string>>({});

  const [repackingLocationId, setRepackingLocationId] = useState<string>('');

  const isBuildDown = repacking?.description?.includes('Break-Down') || repacking?.description?.includes('repacking build down') || repacking?.description?.toLowerCase().includes('break');

  interface ActiveScan {
    type: 'PICK_SKU' | 'PICK_LOC' | 'PUTAWAY_LOC' | 'PUTAWAY_SRC';
    itemId: string;
    entryId?: string;
    expected?: string;
  }
  const [activeScan, setActiveScan] = useState<ActiveScan | null>(null);

  const isItemPicked = (itemId: string) => {
    const item = sourceItems.find(s => s.id === itemId);
    if (!item) return false;
    const pickedSku = (pickedProductSkus[itemId] || '').trim().toUpperCase();
    const pickedLoc = (pickedLocations[itemId] || '').trim().toUpperCase();
    const pickedQty = Number(pickedQuantities[itemId]);
    
    return pickedSku === item.product?.sku_code?.trim().toUpperCase() &&
           pickedLoc === (item.source_location?.code || '').trim().toUpperCase() &&
           pickedQty === item.quantity;
  };

  const handleScanSuccess = (decodedText: string) => {
    if (!activeScan) return;
    const { type, itemId, entryId, expected } = activeScan;

    if (type === 'PICK_SKU') {
      setPickedProductSkus(prev => ({
        ...prev,
        [itemId]: decodedText
      }));
      toast.success(`SKU terscan: ${decodedText}`);
    } else if (type === 'PICK_LOC') {
      setPickedLocations(prev => ({
        ...prev,
        [itemId]: decodedText
      }));
      toast.success(`Lokasi terscan: ${decodedText}`);
    } else if (type === 'PUTAWAY_LOC') {
      if (!entryId) return;
      const newEntries = [...(putawayEntries[itemId] || [])];
      const idx = newEntries.findIndex(e => e.id === entryId);
      if (idx !== -1) {
        newEntries[idx].locationCode = decodedText;
        setPutawayEntries({ ...putawayEntries, [itemId]: newEntries });
      }
      toast.success(`Lokasi Tujuan terscan: ${decodedText}`);
    } else if (type === 'PUTAWAY_SRC') {
      if (!entryId) return;
      setPickedPutawaySrcs(prev => ({
        ...prev,
        [entryId]: decodedText
      }));
      if (decodedText.trim().toUpperCase() === expected?.trim().toUpperCase()) {
        toast.success(`Lokasi Asal cocok: ${decodedText}`);
      } else {
        toast.error(`Lokasi Asal tidak cocok! Diharapkan: ${expected}, Terbaca: ${decodedText}`);
      }
    }

    setActiveScan(null);
  };

  useEffect(() => {
    // Load staff session
    const storedSession = localStorage.getItem('sentralogis_wh_session');
    if (storedSession) {
      setSession(JSON.parse(storedSession));
    }
    
    fetchData();
  }, [repackingId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch repacking details via Server Action
      const data = await fetchRepackingDetailsAdmin(repackingId);
      setRepacking(data.repacking);
      if (data.repacking?.current_stage) {
        setCurrentStage(data.repacking.current_stage);
      }
      
      const items = data.entries || [];
      const sources = items.filter((i: any) => i.item_type === 'SOURCE');
      const results = items.filter((i: any) => i.item_type === 'RESULT');
      
      setSourceItems(sources);
      setResultItems(results);
      
      // Initialize targets and putawayEntries
      const initialTargets: Record<string, string> = {};
      const initialPutaway: Record<string, { id: string; locationCode: string; qty: string }[]> = {};
      results.forEach((r: any) => {
        if (r.target_location_id) initialTargets[r.id] = r.target_location_id;
        initialPutaway[r.id] = [{
          id: Math.random().toString(36).substr(2, 9),
          locationCode: r.target_location?.code || '',
          qty: r.quantity.toString()
        }];
      });
      setTargetLocations(initialTargets);
      setPutawayEntries(initialPutaway);

      // 2. Fetch locations
      const { data: locData } = await supabase
        .from('md_warehouse_locations')
        .select('id, code')
        .order('code');
      if (locData) setLocations(locData);

    } catch (err: any) {
      toast.error('Gagal mengambil data: ' + err.message);
      router.push('/warehouse/portal');
    } finally {
      setLoading(false);
    }
  };

  // Role check helpers
  const isPicker = session?.role === 'PUTAWAY' || session?.role === 'TALLY' || session?.role === 'ADMIN';
  const isProcessor = session?.role === 'ADD_SERVICE' || session?.role === 'TALLY' || session?.role === 'ADMIN';
  const isPutawayStaff = session?.role === 'PUTAWAY' || session?.role === 'ADMIN';

  // Completion checking
  const allPicked = sourceItems.length > 0 && sourceItems.every(s => isItemPicked(s.id));
  const allChecked = resultItems.length > 0 && resultItems.every(r => checked[r.id]);
  const allLocated = resultItems.length > 0 && resultItems.every(r => targetLocations[r.id]);
  const allPutAway = resultItems.length > 0 && resultItems.every(r => putAway[r.id]);

  const handleNextStage = async () => {
    if (currentStage === 1) {
      // Validate picking inputs
      for (const item of sourceItems) {
        const pickedSku = (pickedProductSkus[item.id] || '').trim();
        const pickedLoc = (pickedLocations[item.id] || '').trim();
        const pickedQty = Number(pickedQuantities[item.id] || 0);
        
        if (!pickedSku) {
          return toast.error(`SKU belum diisi untuk ${item.product?.name}`);
        }
        if (pickedSku.toUpperCase() !== item.product?.sku_code?.trim().toUpperCase()) {
          return toast.error(`SKU tidak cocok untuk ${item.product?.name}! Diharapkan: ${item.product?.sku_code}, Diisi: ${pickedSku}`);
        }
        if (!pickedLoc) {
          return toast.error(`Rak asal belum diisi untuk ${item.product?.name}`);
        }
        if (pickedLoc.toUpperCase() !== (item.source_location?.code || '').trim().toUpperCase()) {
          return toast.error(`Rak asal tidak cocok untuk ${item.product?.name}! Diharapkan: ${item.source_location?.code}, Diisi: ${pickedLoc}`);
        }
        if (isNaN(pickedQty) || pickedQty <= 0) {
          return toast.error(`Quantity tidak valid untuk ${item.product?.name}`);
        }
        if (pickedQty !== item.quantity) {
          return toast.error(`Quantity tidak cocok untuk ${item.product?.name}! Diharapkan: ${item.quantity}, Diisi: ${pickedQty}`);
        }
      }

      if (isBuildDown && !repackingLocationId) {
        return toast.error('Silakan pilih Lokasi Kerja Repacking terlebih dahulu');
      }
      try {
        await updateRepackingStageAdmin(repackingId, 2);
        setCurrentStage(2);
        toast.success('Fase Picking selesai! Masuk ke proses repacking.');
      } catch (err: any) {
        toast.error('Gagal memperbarui fase: ' + err.message);
      }
    } else if (currentStage === 2) {
      if (!allChecked) return toast.error('Semua material hasil harus diverifikasi (checked)');
      try {
        await updateRepackingStageAdmin(repackingId, 3);
        setCurrentStage(3);
        toast.success('Proses repacking selesai! Masuk ke fase putaway.');
      } catch (err: any) {
        toast.error('Gagal memperbarui fase: ' + err.message);
      }
    }
  };

  const handleCompleteOrder = async () => {
    // If build down, validate intermediate repacking source location (workspace)
    if (isBuildDown) {
      const repackingLocCode = locations.find(l => l.id === repackingLocationId)?.code || 'Area Repacking';
      for (const item of resultItems) {
        const entries = putawayEntries[item.id] || [];
        for (const entry of entries) {
          const srcCode = (pickedPutawaySrcs[entry.id] || '').trim();
          if (!srcCode) {
            return toast.error(`Lokasi Asal (meja repack) harus diisi untuk produk ${item.product?.name}`);
          }
          if (srcCode.toUpperCase() !== repackingLocCode.toUpperCase()) {
            return toast.error(`Lokasi Asal "${srcCode}" tidak cocok! Diharapkan: ${repackingLocCode}`);
          }
        }
      }
    }

    // 1. Gather all unique location codes scanned/typed
    const allCodes = new Set<string>();
    for (const item of resultItems) {
      const entries = putawayEntries[item.id] || [];
      if (entries.length === 0) {
        return toast.error(`Lokasi simpan belum diisi untuk ${item.product?.name}`);
      }
      for (const entry of entries) {
        if (!entry.locationCode.trim()) {
          return toast.error(`Lokasi rak harus diisi untuk produk ${item.product?.name}`);
        }
        allCodes.add(entry.locationCode.trim().toUpperCase());
      }
    }

    setSubmitting(true);
    try {
      // 2. Fetch UUIDs for all location codes
      const { data: locs, error: locErr } = await supabase
        .from('md_warehouse_locations')
        .select('id, code')
        .eq('warehouse_id', repacking.warehouse_id)
        .in('code', Array.from(allCodes));

      if (locErr) throw locErr;
      
      const locMap: Record<string, string> = {};
      locs?.forEach(l => locMap[l.code.toUpperCase()] = l.id);

      // Verify all codes were found
      for (const code of Array.from(allCodes)) {
        if (!locMap[code]) {
          throw new Error(`Rak "${code}" tidak ditemukan di database!`);
        }
      }

      // 3. Build splitPayload using the resolved UUIDs
      const splitPayload: Record<string, { locationId: string; qty: number }[]> = {};
      for (const item of resultItems) {
        const entries = putawayEntries[item.id] || [];
        let totalQty = 0;
        const itemEntries: { locationId: string; qty: number }[] = [];
        
        for (const entry of entries) {
          const qtyNum = Number(entry.qty);
          if (isNaN(qtyNum) || qtyNum <= 0) {
            throw new Error(`Quantity tidak valid untuk produk ${item.product?.name}`);
          }
          totalQty += qtyNum;
          itemEntries.push({
            locationId: locMap[entry.locationCode.trim().toUpperCase()],
            qty: qtyNum
          });
        }
        
        if (Math.abs(totalQty - item.quantity) > 0.01) {
          throw new Error(`Total quantity putaway (${totalQty}) harus sama dengan quantity target (${item.quantity}) untuk produk ${item.product?.name}`);
        }
        
        splitPayload[item.id] = itemEntries;
      }

      await completeRepackingOrderAdmin(
        repackingId,
        session?.name || 'Staf Portal',
        splitPayload,
        session?.staff_id,
        repackingLocationId || undefined
      );
      toast.success('Pekerjaan Repacking berhasil diselesaikan!');
      router.push('/warehouse/portal');
    } catch (err: any) {
      toast.error('Gagal menyelesaikan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-900 font-black tracking-widest text-[10px] uppercase">Loading Repacking Task...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12">
      {/* Header */}
      <div className="bg-slate-900 text-white p-5 sticky top-0 z-30 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => router.push('/warehouse/portal')}
            className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300 hover:text-white transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase leading-none">{repacking?.order_number}</h1>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
              {repacking?.order_type} ORDER
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Pipeline Stepper */}
        <Card className="p-5 border-none shadow-xl shadow-slate-200/50 bg-white">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Progres Alur Gudang</h2>
          <div className="flex items-center justify-between relative">
            <div className="absolute left-6 right-6 top-5 h-0.5 bg-slate-100 -z-0"></div>
            
            {/* Stage 1 */}
            <div className="flex flex-col items-center z-10">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border-2 ${currentStage === 1 ? 'bg-indigo-600 border-indigo-200 text-white shadow-md shadow-indigo-600/20' : currentStage > 1 ? 'bg-emerald-500 border-emerald-200 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                {currentStage > 1 ? '✓' : '1'}
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider mt-2 text-slate-600">Picking</span>
            </div>

            <ArrowRight size={16} className="text-slate-300 z-10" />

            {/* Stage 2 */}
            <div className="flex flex-col items-center z-10">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border-2 ${currentStage === 2 ? 'bg-indigo-600 border-indigo-200 text-white shadow-md shadow-indigo-600/20' : currentStage > 2 ? 'bg-emerald-500 border-emerald-200 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                {currentStage > 2 ? '✓' : '2'}
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider mt-2 text-slate-600">Repack</span>
            </div>

            <ArrowRight size={16} className="text-slate-300 z-10" />

            {/* Stage 3 */}
            <div className="flex flex-col items-center z-10">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border-2 ${currentStage === 3 ? 'bg-indigo-600 border-indigo-200 text-white shadow-md shadow-indigo-600/20' : 'bg-white border-slate-200 text-slate-400'}`}>
                3
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider mt-2 text-slate-600">Putaway</span>
            </div>
          </div>
        </Card>

        {/* Stage Content */}
        {currentStage === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                Fase 1: Picking Material Sumber ({sourceItems.length})
              </h3>
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase rounded-lg border border-indigo-100">
                Role: PUTAWAY / TALLY
              </span>
            </div>

            {!isPicker && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800 text-xs font-medium">
                <Lock size={16} className="shrink-0 mt-0.5" />
                <span>
                  Role Anda saat ini adalah <strong>{session?.role}</strong>. Hanya staf dengan role <strong>PUTAWAY</strong> atau <strong>TALLY</strong> yang dapat menyelesaikan checklist picking.
                </span>
              </div>
            )}

            <div className="space-y-3">
              {sourceItems.map(item => (
                <div 
                  key={item.id}
                  className={`p-5 rounded-2xl border bg-white flex flex-col gap-4 transition-all border-slate-100 shadow-sm ${isItemPicked(item.id) ? 'border-emerald-200 bg-emerald-50/20' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={isItemPicked(item.id)}
                      readOnly
                      className="w-5 h-5 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500/20 pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-900 text-sm truncate">{item.product?.name}</h4>
                      <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">Target Qty: {item.quantity} {item.product?.unit}</span>
                        <span className="flex items-center gap-1"><MapPin size={12}/> Rak Asal: {item.source_location?.code || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Input Fields for Picking verification */}
                  {isPicker && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                      
                      {/* Product SKU Input */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">SKU Produk (Scan Barcode)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={pickedProductSkus[item.id] || ''}
                            onChange={(e) => setPickedProductSkus({ ...pickedProductSkus, [item.id]: e.target.value })}
                            className="flex-1 h-12 px-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold font-mono placeholder:text-slate-300"
                            placeholder="Ketik/scan SKU..." 
                          />
                          <button 
                            onClick={() => setActiveScan({ type: 'PICK_SKU', itemId: item.id })}
                            className="h-12 w-12 shrink-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border-2 border-slate-200 transition-colors"
                          >
                            <Scan size={20} />
                          </button>
                        </div>
                      </div>

                      {/* Rak Asal Input */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Rak Asal (Scan Barcode)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={pickedLocations[item.id] || ''}
                            onChange={(e) => setPickedLocations({ ...pickedLocations, [item.id]: e.target.value })}
                            className="flex-1 h-12 px-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold font-mono placeholder:text-slate-300"
                            placeholder="Ketik/scan rak..." 
                          />
                          <button 
                            onClick={() => setActiveScan({ type: 'PICK_LOC', itemId: item.id })}
                            className="h-12 w-12 shrink-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border-2 border-slate-200 transition-colors"
                          >
                            <Scan size={20} />
                          </button>
                        </div>
                      </div>

                      {/* Qty Input */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Qty Diambil</label>
                        <input 
                          type="number"
                          value={pickedQuantities[item.id] || ''}
                          onChange={(e) => setPickedQuantities({ ...pickedQuantities, [item.id]: e.target.value })}
                          className="w-full h-12 px-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-lg font-bold text-center placeholder:text-slate-300"
                          placeholder={`Target: ${item.quantity}`}
                        />
                      </div>

                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Repacking Location Selector for Build Down */}
            {isBuildDown && isPicker && (
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-widest leading-normal">
                  Pilih Lokasi Kerja Repacking (Tempat meletakkan barang yang akan di-repack)
                </label>
                <select
                  value={repackingLocationId}
                  onChange={(e) => setRepackingLocationId(e.target.value)}
                  className="w-full h-12 px-4 border border-slate-200 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="">Pilih Lokasi...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleNextStage}
              disabled={!isPicker}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/10 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              Lanjutkan ke Repack <ArrowRight size={14} />
            </button>
          </div>
        )}

        {currentStage === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                Fase 2: Proses Repacking & Check ({resultItems.length})
              </h3>
              <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-[9px] font-black uppercase rounded-lg border border-purple-100">
                Role: ADD SERVICE / TALLY
              </span>
            </div>

            {!isProcessor && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800 text-xs font-medium">
                <Lock size={16} className="shrink-0 mt-0.5" />
                <span>
                  Role Anda saat ini adalah <strong>{session?.role}</strong>. Hanya staf dengan role <strong>ADD_SERVICE (Add. Service / Repacking)</strong> atau <strong>TALLY</strong> yang dapat menyelesaikan checklist pengerjaan ini.
                </span>
              </div>
            )}

            <div className="space-y-3">
              {resultItems.map(item => (
                <div 
                  key={item.id}
                  onClick={() => isProcessor && setChecked(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  className={`p-5 rounded-2xl border bg-white flex items-center gap-4 transition-all ${isProcessor ? 'cursor-pointer active:scale-[0.99]' : ''} ${checked[item.id] ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100 shadow-sm'}`}
                >
                  <input
                    type="checkbox"
                    checked={!!checked[item.id]}
                    onChange={() => {}} // handled by div click
                    disabled={!isProcessor}
                    className="w-5 h-5 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500/20"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-900 text-sm truncate">{item.product?.name}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      SKU: {item.product?.sku_code}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded">Target Qty: {item.quantity} {item.product?.unit}</span>
                      {item.batch_number && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded">Batch: {item.batch_number}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleNextStage}
              disabled={!allChecked}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/10 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              Lanjutkan ke Putaway <ArrowRight size={14} />
            </button>
          </div>
        )}

        {currentStage === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                Fase 3: Putaway & Simpan Hasil ({resultItems.length})
              </h3>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase rounded-lg border border-emerald-100">
                Role: PUTAWAY
              </span>
            </div>

            {!isPutawayStaff && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800 text-xs font-medium">
                <Lock size={16} className="shrink-0 mt-0.5" />
                <span>
                  Role Anda saat ini adalah <strong>{session?.role}</strong>. Hanya staf dengan role <strong>PUTAWAY</strong> yang dapat menetapkan lokasi penyimpanan akhir dan menutup order ini.
                </span>
              </div>
            )}

            <div className="space-y-3">
              {resultItems.map(item => {
                const entries = putawayEntries[item.id] || [];
                return (
                  <div 
                    key={item.id}
                    className="p-5 rounded-2xl border bg-white flex flex-col gap-4 border-slate-100 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-900 text-sm">{item.product?.name}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Target Qty: {item.quantity} {item.product?.unit}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {entries.map((entry, idx) => {
                        const repackingLocCode = locations.find(l => l.id === repackingLocationId)?.code || 'Area Repacking';
                        return (
                          <div key={entry.id} className="flex flex-col gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                            
                            {/* Intermediate Repack Workspace Location input for Build Down */}
                            {isBuildDown && isPutawayStaff && (
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                  Lokasi Asal (Scan Barcode Meja Repack: {repackingLocCode})
                                </label>
                                <div className="flex gap-2">
                                  <input 
                                    type="text" 
                                    value={pickedPutawaySrcs[entry.id] || ''}
                                    onChange={(e) => setPickedPutawaySrcs({ ...pickedPutawaySrcs, [entry.id]: e.target.value })}
                                    className="flex-1 h-12 px-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold font-mono placeholder:text-slate-300 bg-white"
                                    placeholder={`Scan/ketik Lokasi Asal (${repackingLocCode})...`} 
                                  />
                                  <button 
                                    onClick={() => setActiveScan({ type: 'PUTAWAY_SRC', itemId: item.id, entryId: entry.id, expected: repackingLocCode })}
                                    className="h-12 w-12 shrink-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border-2 border-slate-200 transition-colors"
                                  >
                                    <Scan size={20} />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Putaway Target Location and Qty */}
                            <div className="flex gap-2 items-end">
                              
                              {/* Lokasi Tujuan Input */}
                              <div className="flex-1">
                                {idx === 0 && <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Lokasi Tujuan (Scan Barcode)</label>}
                                <div className="flex gap-2">
                                  <input 
                                    type="text" 
                                    value={entry.locationCode}
                                    onChange={(e) => {
                                      const newEntries = [...entries];
                                      newEntries[idx].locationCode = e.target.value;
                                      setPutawayEntries({ ...putawayEntries, [item.id]: newEntries });
                                    }}
                                    disabled={!isPutawayStaff}
                                    className="flex-1 w-full h-12 px-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold font-mono placeholder:text-slate-300 bg-white"
                                    placeholder="Ketik/scan rak..." 
                                  />
                                  <button 
                                    onClick={() => setActiveScan({ type: 'PUTAWAY_LOC', itemId: item.id, entryId: entry.id })}
                                    disabled={!isPutawayStaff}
                                    className="h-12 w-12 shrink-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border-2 border-slate-200 transition-colors disabled:opacity-50"
                                  >
                                    <Scan size={20} />
                                  </button>
                                </div>
                              </div>

                              {/* Qty Input */}
                              <div className="w-24 shrink-0">
                                {idx === 0 && <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 text-center">Qty</label>}
                                <input
                                  type="number"
                                  value={entry.qty}
                                  onChange={(e) => {
                                    const newEntries = [...entries];
                                    newEntries[idx].qty = e.target.value;
                                    setPutawayEntries({ ...putawayEntries, [item.id]: newEntries });
                                  }}
                                  disabled={!isPutawayStaff}
                                  className="w-full h-12 px-2 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-lg font-bold text-center bg-white disabled:opacity-75"
                                />
                              </div>

                              {entries.length > 1 && (
                                <button
                                  onClick={() => {
                                    const newEntries = entries.filter((_, i) => i !== idx);
                                    setPutawayEntries({ ...putawayEntries, [item.id]: newEntries });
                                  }}
                                  disabled={!isPutawayStaff}
                                  className="h-12 w-12 shrink-0 flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50"
                                >
                                  <Trash2 size={20} />
                                </button>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>

                    {isPutawayStaff && (
                      <button
                        onClick={() => {
                          const newEntries = [...entries, { id: Math.random().toString(36).substr(2, 9), locationCode: '', qty: '' }];
                          setPutawayEntries({ ...putawayEntries, [item.id]: newEntries });
                        }}
                        className="mt-1 flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-slate-200 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                      >
                        <Plus size={16} /> Pecah Lokasi
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleCompleteOrder}
              disabled={submitting}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-600/10 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Selesaikan Repacking
            </button>
          </div>
        )}
      </div>

      {/* Barcode Scanner Modal */}
      {activeScan && (
        <BarcodeScanner
          onClose={() => setActiveScan(null)}
          onScanSuccess={handleScanSuccess}
        />
      )}
    </div>
  );
}
