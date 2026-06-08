'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getLocalReceipts, saveTallyLocally, OfflineReceipt, OfflineReceiptItem } from '@/lib/tallyStore';
import { Camera, ChevronLeft, Save, Box, CheckCircle2, AlertTriangle, Play, Square, Image as ImageIcon } from 'lucide-react';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';
import { toast } from 'react-hot-toast';

export default function TallyInboundExecution({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [receipt, setReceipt] = useState<OfflineReceipt | null>(null);
  const [items, setItems] = useState<OfflineReceiptItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'ITEM' | 'RACK'>('ITEM');
  const [activePutawayItemId, setActivePutawayItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReceipt = async () => {
      try {
        const allLocal = await getLocalReceipts();
        const found = allLocal.find(r => r.id === unwrappedParams.id);
        if (found) {
          setReceipt(found);
          setItems(found.items);
        } else {
          toast.error('Receipt tidak ditemukan di memori lokal');
          router.push('/tally');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadReceipt();
  }, [unwrappedParams.id, router]);

  const handleScanSuccess = (decodedText: string) => {
    if (scannerMode === 'ITEM') {
      // Find item matching SKU code
      const itemIndex = items.findIndex(i => i.sku_code.toUpperCase() === decodedText.toUpperCase() || i.product_name.toUpperCase().includes(decodedText.toUpperCase()));
      
      if (itemIndex !== -1) {
        toast.success(`SKU Ditemukan: ${items[itemIndex].sku_code}`);
        // Auto increment good qty by 1
        handleItemChange(items[itemIndex].id, 'actual_good_qty', String(Number(items[itemIndex].actual_good_qty) + 1));
      } else {
        toast.error('SKU tidak ditemukan dalam receipt ini!');
      }
    } else if (scannerMode === 'RACK' && activePutawayItemId) {
      toast.success(`Rak dipindai: ${decodedText}`);
      // Show prompt for qty
      const qtyStr = window.prompt(`Berapa qty yang dimasukkan ke rak ${decodedText}?`);
      const qty = parseInt(qtyStr || '0');
      
      if (qty > 0) {
        const item = items.find(i => i.id === activePutawayItemId);
        if (item) {
          const totalPut = (item.putaway_records || []).reduce((sum, r) => sum + r.qty, 0);
          const remaining = item.actual_good_qty - totalPut;
          
          if (qty > remaining) {
            alert(`Peringatan: Qty putaway (${qty}) melebihi remaining (${remaining})! Mohon periksa kembali.`);
          } else {
            setItems(prev => prev.map(i => {
              if (i.id === activePutawayItemId) {
                const newRecs = [...(i.putaway_records || []), { id: Date.now().toString(), location_code: decodedText, qty }];
                return { ...i, putaway_records: newRecs };
              }
              return i;
            }));
            toast.success('Berhasil dialokasikan!');
          }
        }
      }
    }
  };

  const handleItemChange = (itemId: string, field: string, val: string) => {
    const numericVal = parseInt(val) || 0;
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, [field]: numericVal };
      }
      return item;
    }));
  };

  if (loading || !receipt) return null;

  const isCompleted = receipt.status === 'COMPLETED';

  // State handlers for new metadata
  const handleReceiptChange = (field: keyof OfflineReceipt, val: any) => {
    setReceipt(prev => prev ? { ...prev, [field]: val } : null);
    if (receipt) {
      saveTallyLocally(receipt.id, items, undefined, { [field]: val }).catch(console.error);
    }
  };

  const handlePhotoCapture = (field: '_localVehiclePhoto' | '_localPodPhoto', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleReceiptChange(field, e.target.files[0]);
    }
  };

  const currentMetadata = receipt ? {
    transporter_name_manual: receipt.transporter_name_manual,
    driver_name_manual: receipt.driver_name_manual,
    driver_phone: receipt.driver_phone,
    _localVehiclePhoto: receipt._localVehiclePhoto,
    _localPodPhoto: receipt._localPodPhoto,
  } : {};

  const handleArrive = async () => {
    if (!receipt) return;
    await saveTallyLocally(receipt.id, items, 'TRUCK_ARRIVED', currentMetadata);
    setReceipt(prev => prev ? { ...prev, status: 'TRUCK_ARRIVED' } : null);
    toast.success('Truk berhasil dicatat tiba!');
  };

  const handleStartUnload = async () => {
    if (!receipt) return;
    await saveTallyLocally(receipt.id, items, 'UNLOADING', {
      ...currentMetadata,
      unloading_start_time: new Date().toISOString()
    });
    setReceipt(prev => prev ? { ...prev, status: 'UNLOADING' } : null);
    toast.success('Mulai bongkar muat!');
  };

  const handleStopUnload = async () => {
    if (!receipt) return;
    await saveTallyLocally(receipt.id, items, 'CHECKING', {
      ...currentMetadata,
      unloading_end_time: new Date().toISOString()
    });
    setReceipt(prev => prev ? { ...prev, status: 'CHECKING' } : null);
    toast.success('Selesai bongkar muat, lanjut validasi!');
  };

  const handleSave = async (nextStatus: string) => {
    if (!receipt) return;

    // [AI] Validate qty when advancing from CHECKING
    if (receipt.status === 'CHECKING' && nextStatus === 'PUTAWAY_IN_PROGRESS') {
      for (const item of items) {
        const totalScanned = (item.actual_good_qty || 0) + (item.quarantine_qty || 0) + (item.rejected_qty || 0);
        const expected = item.expected_qty || 0;

        if (totalScanned === 0 && expected > 0) {
          toast.error(`Item "${item.product_name}" belum diisi qty sama sekali!`);
          return;
        }

        if (totalScanned < expected) {
          const shortage = expected - totalScanned;
          toast.error(`Item "${item.product_name}" kurang ${shortage} pcs! (Isi: ${totalScanned}, Target: ${expected})`, { duration: 5000 });
          return;
        }

        if (totalScanned > expected) {
          const overage = totalScanned - expected;
          toast.error(`Item "${item.product_name}" lebih ${overage} pcs! (Isi: ${totalScanned}, Target: ${expected}). Hubungi supervisor.`, { duration: 5000 });
          return;
        }
      }
    }

    try {
      await saveTallyLocally(receipt.id, items, nextStatus, currentMetadata);
      setReceipt(prev => prev ? { ...prev, status: nextStatus as any } : null);
      toast.success('Data disimpan lokal! (Tunggu Sync)');
      if (nextStatus === 'COMPLETED') {
        router.push('/tally');
      }
    } catch (e) {
      toast.error('Gagal menyimpan ke memori lokal');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="font-mono font-black text-slate-900 text-lg leading-tight">{receipt.receipt_number}</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              {receipt.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        {!isCompleted && receipt.status === 'CHECKING' && (
          <button 
            onClick={() => { setScannerMode('ITEM'); setIsScannerOpen(true); }}
            className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            <Camera size={20} />
          </button>
        )}
      </div>

      {/* CONTENT BASED ON STATUS */}
      <div className="flex-1 p-4 space-y-4 pb-24">
        
        {/* ARRIVAL FORM */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 relative z-10">
          <h2 className="font-bold text-slate-800 border-b pb-2">1. Pencatatan Truk Tiba</h2>
          
          <div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nama Transporter (Manual)</label>
              <input 
                type="text" 
                value={receipt.transporter_name_manual || ''}
                onChange={e => handleReceiptChange('transporter_name_manual', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
                placeholder={receipt.transporter || "Cth: PT Logistik Cepat"}
                disabled={isCompleted}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nama Supir</label>
                <input 
                  type="text" 
                  value={receipt.driver_name_manual || ''}
                  onChange={e => handleReceiptChange('driver_name_manual', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
                  disabled={isCompleted}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">No HP</label>
                <input 
                  type="tel" 
                  value={receipt.driver_phone || ''}
                  onChange={e => handleReceiptChange('driver_phone', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
                  disabled={isCompleted}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Foto Kendaraan</label>
              <label className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl h-24 ${isCompleted ? 'bg-slate-100' : 'bg-slate-50 cursor-pointer hover:bg-slate-100'}`}>
                <Camera className="text-slate-400 mb-1" size={24} />
                <span className="text-[10px] font-bold text-slate-500">{receipt._localVehiclePhoto ? 'Telah Difoto' : (receipt.vehicle_photo_url ? 'Foto Tersimpan' : 'Ambil Foto')}</span>
                {!isCompleted && <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoCapture('_localVehiclePhoto', e)} />}
              </label>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Foto Dokumen (POD)</label>
              <label className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl h-24 ${isCompleted ? 'bg-slate-100' : 'bg-slate-50 cursor-pointer hover:bg-slate-100'}`}>
                <ImageIcon className="text-slate-400 mb-1" size={24} />
                <span className="text-[10px] font-bold text-slate-500">{receipt._localPodPhoto ? 'Telah Difoto' : (receipt.pod_document_url ? 'Foto Tersimpan' : 'Ambil Foto')}</span>
                {!isCompleted && <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoCapture('_localPodPhoto', e)} />}
              </label>
            </div>
          </div>
        </div>

        {/* TRUCK_ARRIVED -> START UNLOADING */}
        {receipt.status === 'TRUCK_ARRIVED' && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Play size={32} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Mulai Bongkar Muat</h2>
              <p className="text-sm text-slate-500">Tekan tombol di bawah saat tim mulai membongkar barang dari truk untuk mencatat waktu mulai (Start Time).</p>
            </div>
          </div>
        )}

        {/* UNLOADING -> STOP UNLOADING */}
        {receipt.status === 'UNLOADING' && (
          <div className="bg-white rounded-xl border border-rose-200 p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-4 bg-rose-50/30">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 animate-pulse">
              <Square size={32} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Proses Bongkar Berjalan</h2>
              <p className="text-sm text-slate-500">Waktu sedang berjalan. Tekan tombol di bawah jika bongkar muat telah selesai.</p>
            </div>
          </div>
        )}

        {/* CHECKING -> ITEMS LIST */}
        {(receipt.status === 'CHECKING' || receipt.status === 'PUTAWAY_IN_PROGRESS' || receipt.status === 'COMPLETED') && items.map((item) => {
          const totalScanned = item.actual_good_qty + item.quarantine_qty + item.rejected_qty;
          const isComplete = totalScanned >= item.expected_qty;
          const isMismatch = receipt.status === 'CHECKING' && totalScanned > 0 && totalScanned !== item.expected_qty;
          const isShortage = isMismatch && totalScanned < item.expected_qty;
          const isOverage = isMismatch && totalScanned > item.expected_qty;

          return (
            <div key={item.id} className={`bg-white rounded-xl border p-4 shadow-sm transition-all ${
              isOverage ? 'border-rose-300 bg-rose-50/30' :
              isShortage ? 'border-amber-300 bg-amber-50/30' :
              isComplete ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
            }`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900 text-sm">{item.product_name}</h3>
                  <div className="font-mono text-[10px] text-slate-500 mt-0.5">{item.sku_code}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Target</span>
                  <span className="font-black text-lg text-slate-700">{item.expected_qty}</span>
                </div>
              </div>

              {receipt.status === 'CHECKING' && (
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-600 uppercase mb-1">Good</label>
                    <input 
                      type="number" 
                      min="0"
                      value={item.actual_good_qty || ''}
                      onChange={(e) => handleItemChange(item.id, 'actual_good_qty', e.target.value)}
                      className="w-full bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-2 text-center font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-600 uppercase mb-1">Quarantine</label>
                    <input 
                      type="number" 
                      min="0"
                      value={item.quarantine_qty || ''}
                      onChange={(e) => handleItemChange(item.id, 'quarantine_qty', e.target.value)}
                      className="w-full bg-amber-50 border border-amber-200 rounded-lg px-2 py-2 text-center font-bold text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-rose-600 uppercase mb-1">Reject</label>
                    <input 
                      type="number" 
                      min="0"
                      value={item.rejected_qty || ''}
                      onChange={(e) => handleItemChange(item.id, 'rejected_qty', e.target.value)}
                      className="w-full bg-rose-50 border border-rose-200 rounded-lg px-2 py-2 text-center font-bold text-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  {/* Qty Mismatch Warning */}
                  {receipt.status === 'CHECKING' && totalScanned > 0 && totalScanned !== item.expected_qty && (
                    <div className={`col-span-3 mt-2 p-2.5 rounded-lg flex items-center gap-2 ${
                      totalScanned > item.expected_qty
                        ? 'bg-rose-50 border border-rose-200'
                        : 'bg-amber-50 border border-amber-200'
                    }`}>
                      <AlertTriangle size={14} className={totalScanned > item.expected_qty ? 'text-rose-500' : 'text-amber-500'} />
                      <span className={`text-xs font-bold ${
                        totalScanned > item.expected_qty ? 'text-rose-700' : 'text-amber-700'
                      }`}>
                        {totalScanned > item.expected_qty
                          ? `LEBIH ${totalScanned - item.expected_qty} pcs dari target ${item.expected_qty}`
                          : `KURANG ${item.expected_qty - totalScanned} pcs dari target ${item.expected_qty}`
                        }
                      </span>
                      <span className={`ml-auto text-[10px] font-bold ${
                        totalScanned > item.expected_qty ? 'text-rose-500' : 'text-amber-500'
                      }`}>
                        {totalScanned} / {item.expected_qty}
                      </span>
                    </div>
                  )}

                  {/* Qty Matched Indicator */}
                  {receipt.status === 'CHECKING' && totalScanned > 0 && totalScanned === item.expected_qty && (
                    <div className="col-span-3 mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-700">Jumlah sesuai ({totalScanned} / {item.expected_qty})</span>
                    </div>
                  )}

                  {/* Damage Photo Upload if rejected/quarantine > 0 */}
                  {(item.quarantine_qty > 0 || item.rejected_qty > 0) && (
                    <div className="col-span-3 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-[10px] font-bold text-amber-700 uppercase mb-2"><AlertTriangle size={12} className="inline mr-1 -mt-0.5" /> Ada Barang Rusak. Wajib Upload Foto:</p>
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-amber-300 rounded-lg h-16 bg-white cursor-pointer">
                        <span className="text-xs font-bold text-amber-600">{item._localPhotoFile ? 'Foto Terlampir' : 'Ambil Foto Barang Rusak'}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment" 
                          className="hidden" 
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              setItems(prev => prev.map(i => i.id === item.id ? { ...i, _localPhotoFile: e.target.files![0] } : i));
                            }
                          }} 
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
              {/* PUTAWAY IN PROGRESS VIEW */}
              {receipt.status === 'PUTAWAY_IN_PROGRESS' && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500">Total Good: {item.actual_good_qty}</span>
                    <span className="text-xs font-bold text-amber-600">
                      Remaining: {item.actual_good_qty - (item.putaway_records || []).reduce((sum, r) => sum + r.qty, 0)}
                    </span>
                  </div>
                  
                  {item.putaway_records?.map(r => (
                    <div key={r.id} className="flex justify-between items-center text-xs bg-slate-50 p-2 rounded mb-1 border border-slate-100">
                      <span className="font-mono font-bold">{r.location_code}</span>
                      <span className="font-bold text-slate-700">{r.qty} {item.unit}</span>
                    </div>
                  ))}

                  {item.actual_good_qty - (item.putaway_records || []).reduce((sum, r) => sum + r.qty, 0) > 0 && (
                    <button 
                      onClick={() => {
                        setActivePutawayItemId(item.id);
                        setScannerMode('RACK');
                        setIsScannerOpen(true);
                      }}
                      className="w-full mt-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Camera size={14} /> Scan Rak Putaway
                    </button>
                  )}
                </div>
              )}
              
              {/* COMPLETED VIEW */}
              {receipt.status === 'COMPLETED' && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-xs font-bold text-emerald-600">Good: {item.actual_good_qty}</span>
                    <span className="text-xs font-bold text-amber-600">Quar: {item.quarantine_qty}</span>
                    <span className="text-xs font-bold text-rose-600">Rej: {item.rejected_qty}</span>
                  </div>
                  {item.putaway_records?.map(r => (
                    <div key={r.id} className="flex justify-between items-center text-[10px] bg-slate-50 px-2 py-1 rounded mb-1">
                      <span className="font-mono text-slate-500">{r.location_code}</span>
                      <span className="font-bold text-slate-700">{r.qty} {item.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Action Bar */}
      {!isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-safe">
          <div className="flex gap-2">
            <button 
              onClick={() => handleSave(receipt.status)} 
              className="px-4 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold flex items-center justify-center active:scale-95 transition-transform"
              title="Simpan Perubahan Tanpa Lanjut Status"
            >
              <Save size={18} />
            </button>

            {receipt.status === 'EXPECTED' && (
              <button onClick={handleArrive} className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                Konfirmasi Kedatangan
              </button>
            )}
            
            {receipt.status === 'TRUCK_ARRIVED' && (
              <button onClick={handleStartUnload} className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Play size={18} /> Mulai Bongkar
              </button>
            )}
            
            {receipt.status === 'UNLOADING' && (
              <button onClick={handleStopUnload} className="flex-1 py-3.5 bg-rose-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Square size={18} /> Selesai Bongkar
              </button>
            )}
            
            {receipt.status === 'CHECKING' && (
              <button 
                onClick={() => handleSave('PUTAWAY_IN_PROGRESS')}
                className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Save size={18} /> Selesai Validasi
              </button>
            )}
            
            {receipt.status === 'PUTAWAY_IN_PROGRESS' && (
              <button 
                onClick={() => handleSave('COMPLETED')}
                className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <CheckCircle2 size={18} /> Selesaikan Inbound
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scanner Modal Overlay */}
      {isScannerOpen && (
        <BarcodeScanner 
          onScanSuccess={handleScanSuccess} 
          onClose={() => setIsScannerOpen(false)} 
        />
      )}
    </div>
  );
}
