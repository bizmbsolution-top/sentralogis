'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { QueueItem, GroundSite } from '@/lib/domain/ground/types';
import { recognizeLicensePlate, recognizeContainerNumber, matchPlate, terminateWorker } from '@/lib/ground/ocr';
import { useGroundPwaInstall } from '@/lib/ground/usePwaInstall';
import {
  Loader2, MapPin, Truck, LogOut, Camera,
  CheckCircle2, AlertCircle, WifiOff, RefreshCw, X,
  ShieldCheck, Download, User, Phone, Hash,
  DoorOpen, DoorClosed, Scan, AlertTriangle
} from 'lucide-react';

export default function GroundStaffDashboard() {
  const router = useRouter();
  const { canInstall, isInstalled, install } = useGroundPwaInstall();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [currentSite, setCurrentSite] = useState<GroundSite | null>(null);
  const [allSites, setAllSites] = useState<GroundSite[]>([]);
  const [siteLoading, setSiteLoading] = useState(true);
  const [showSitePicker, setShowSitePicker] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gateInJo, setGateInJo] = useState<QueueItem | null>(null);
  const [gateOutJo, setGateOutJo] = useState<QueueItem | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/ground/login'); return; }
      setUser(u);
      const { data: p } = await supabase.from('ground_staff_profiles').select('*, tenant:tenants(name)').eq('user_id', u.id).maybeSingle();
      if (!p) { await supabase.auth.signOut(); router.push('/ground/login'); return; }
      setProfile(p);
    };
    check();
  }, [router]);

  useEffect(() => {
    return () => { terminateWorker(); };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  const detectSite = useCallback(async () => {
    if (!navigator.geolocation) { setSiteLoading(false); return; }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const res = await fetch(`/api/ground/site?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
      const data = await res.json();
      if (data.site) setCurrentSite(data.site);
      if (data.allSites) setAllSites(data.allSites);
    } catch { }
    setSiteLoading(false);
  }, []);

  useEffect(() => { if (user) detectSite(); }, [user, detectSite]);

  const fetchQueue = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setQueueLoading(true);
    try {
      const res = await fetch(`/api/ground/queue?tenant_id=${profile.tenant_id}${currentSite?.id ? `&site_id=${currentSite.id}` : ''}`);
      const data = await res.json();
      if (data.queue) setQueue(data.queue);
    } catch { setError('Gagal memuat antrian'); }
    setQueueLoading(false);
  }, [profile?.tenant_id, currentSite?.id]);

  useEffect(() => { if (profile && currentSite) fetchQueue(); }, [profile, currentSite, fetchQueue]);

  const handleRefresh = async () => { setRefreshing(true); await fetchQueue(); setRefreshing(false); };
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/ground/login'); };
  const selectSite = async (site: GroundSite) => { setCurrentSite(site); setShowSitePicker(false); localStorage.setItem('ground_staff_site_id', site.id); };

  const awaitingGateIn = queue.filter(q => q.flow_stage === 'awaiting_gate_in');
  const gateInDone = queue.filter(q => q.flow_stage === 'gate_in_done');
  const gateOutDone = queue.filter(q => q.flow_stage === 'gate_out_done');

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32">
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-emerald-500" />
              <h1 className="text-sm font-black text-white tracking-tight">{profile.tenant?.name || 'Ground Staff'}</h1>
            </div>
            <button onClick={() => setShowSitePicker(true)} className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${currentSite ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {currentSite ? currentSite.name : 'Deteksi Lokasi...'}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && <WifiOff size={16} className="text-amber-500" />}
            <button onClick={handleRefresh} disabled={refreshing} className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center active:scale-90 transition-all">
              <RefreshCw size={16} className={`text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleLogout} className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center active:scale-90 transition-all">
              <LogOut size={16} className="text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {!isOnline && (
        <div className="bg-amber-600 px-4 py-2">
          <p className="text-[10px] font-black text-amber-100 text-center uppercase tracking-widest">
            Offline — Data akan tersimpan dan dikirim saat koneksi kembali
          </p>
        </div>
      )}

      {canInstall && !isInstalled && (
        <div className="bg-emerald-900/40 border-b border-emerald-800 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-emerald-400" />
              <p className="text-[10px] font-bold text-emerald-300">Install aplikasi Ground Staff</p>
            </div>
            <button onClick={install} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
              Install
            </button>
          </div>
        </div>
      )}

      {showSitePicker && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowSitePicker(false)}>
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm border border-slate-800" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-black text-white uppercase tracking-widest mb-4">Pilih Lokasi</h2>
            {allSites.length === 0 && siteLoading && (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>
            )}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {allSites.map((site) => (
                <button key={site.id} onClick={() => selectSite(site)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    currentSite?.id === site.id ? 'bg-emerald-900/30 border-emerald-700' : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}>
                  <p className="text-sm font-bold text-white">{site.name}</p>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">{site.address}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-rose-900/50 border border-rose-800 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <p className="text-xs font-bold text-rose-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto"><X size={14} className="text-rose-400" /></button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-center">
            <p className="text-lg font-black text-amber-400">{awaitingGateIn.length}</p>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Menunggu Gate In</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-center">
            <p className="text-lg font-black text-blue-400">{gateInDone.length}</p>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Siap Gate Out</p>
          </div>
          <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-center">
            <p className="text-lg font-black text-emerald-400">{gateOutDone.length}</p>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Selesai</p>
          </div>
        </div>

        {queueLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : queue.length === 0 ? (
          <div className="bg-slate-900 rounded-2xl p-8 text-center border border-slate-800">
            <Truck size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">Belum ada antrian</p>
            <p className="text-[10px] text-slate-600 mt-1">Tunggu dispatcher mengirim JO</p>
          </div>
        ) : (
          <>
            {awaitingGateIn.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DoorOpen size={14} className="text-amber-500" />
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gate In — {awaitingGateIn.length} truk</h2>
                </div>
                <div className="space-y-3">
                  {awaitingGateIn.map((item) => (
                    <JoCard
                      key={item.jo_id}
                      item={item}
                      onGateIn={() => setGateInJo(item)}
                      onGateOut={() => setGateOutJo(item)}
                    />
                  ))}
                </div>
              </div>
            )}

            {gateInDone.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DoorClosed size={14} className="text-blue-500" />
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gate Out — {gateInDone.length} truk</h2>
                </div>
                <div className="space-y-3">
                  {gateInDone.map((item) => (
                    <JoCard
                      key={item.jo_id}
                      item={item}
                      onGateIn={() => setGateInJo(item)}
                      onGateOut={() => setGateOutJo(item)}
                    />
                  ))}
                </div>
              </div>
            )}

            {gateOutDone.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Selesai — {gateOutDone.length}</h2>
                </div>
                <div className="space-y-3">
                  {gateOutDone.map((item) => (
                    <JoCard
                      key={item.jo_id}
                      item={item}
                      onGateIn={() => setGateInJo(item)}
                      onGateOut={() => setGateOutJo(item)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {gateInJo && (
        <GateInModal
          jo={gateInJo}
          currentSite={currentSite}
          onClose={() => setGateInJo(null)}
          onComplete={() => { setGateInJo(null); fetchQueue(); }}
        />
      )}

      {gateOutJo && (
        <GateOutModal
          jo={gateOutJo}
          currentSite={currentSite}
          onClose={() => setGateOutJo(null)}
          onComplete={() => { setGateOutJo(null); fetchQueue(); }}
        />
      )}
    </div>
  );
}

function JoCard({
  item,
  onGateIn,
  onGateOut,
}: {
  item: QueueItem;
  onGateIn: () => void;
  onGateOut: () => void;
}) {
  const stageColor = {
    awaiting_gate_in: 'border-amber-700/50 bg-amber-900/10',
    gate_in_done: 'border-blue-700/50 bg-blue-900/10',
    gate_out_done: 'border-emerald-700/50 bg-emerald-900/10',
  }[item.flow_stage];

  const stageLabel = {
    awaiting_gate_in: { text: 'MENUNGGU GATE IN', color: 'text-amber-400 bg-amber-900/30' },
    gate_in_done: { text: 'GATE IN SELESAI', color: 'text-blue-400 bg-blue-900/30' },
    gate_out_done: { text: 'SELESAI', color: 'text-emerald-400 bg-emerald-900/30' },
  }[item.flow_stage];

  return (
    <div className={`rounded-2xl p-4 border ${stageColor} transition-all`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black text-white">{item.jo_number}</span>
            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest ${stageColor ? stageLabel.color : ''}`}>
              {stageLabel.text}
            </span>
          </div>
          <p className="text-[10px] font-medium text-slate-500 truncate">
            {item.pickup_location} → {item.dropoff_location}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {item.fleet_plate && (
          <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-2.5 py-1.5">
            <Truck size={12} className="text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-black text-white truncate">{item.fleet_plate}</p>
              <p className="text-[8px] font-bold text-slate-500 truncate">{item.fleet_type || 'Truck'}</p>
            </div>
          </div>
        )}
        {item.driver_name && (
          <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-2.5 py-1.5">
            <User size={12} className="text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-black text-white truncate">{item.driver_name}</p>
              <p className="text-[8px] font-bold text-slate-500">Driver</p>
            </div>
          </div>
        )}
        {item.transporter_name && (
          <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-2.5 py-1.5">
            <Hash size={12} className="text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-black text-white truncate">{item.transporter_name}</p>
              <p className="text-[8px] font-bold text-slate-500">Vendor</p>
            </div>
          </div>
        )}
        {item.container_number && (
          <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-2.5 py-1.5">
            <Scan size={12} className="text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[9px] font-black text-white truncate">{item.container_number}</p>
              <p className="text-[8px] font-bold text-slate-500">Kontainer</p>
            </div>
          </div>
        )}
      </div>

      {item.last_event && (
        <div className="flex items-center gap-2 mb-3 pt-2 border-t border-slate-700/30">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[9px] font-bold text-slate-500">
            {item.last_event_type?.replace(/_/g, ' ')} — {item.last_event_at ? new Date(item.last_event_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
        </div>
      )}

      <div className="flex gap-2">
        {item.flow_stage === 'awaiting_gate_in' && (
          <button onClick={onGateIn}
            className="flex-1 h-10 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-amber-600/20">
            <Camera size={14} /> Gate In
          </button>
        )}
        {item.flow_stage === 'gate_in_done' && (
          <button onClick={onGateOut}
            className="flex-1 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-blue-600/20">
            <Camera size={14} /> Gate Out
          </button>
        )}
        {item.flow_stage === 'gate_out_done' && (
          <div className="flex-1 h-10 bg-emerald-900/30 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-800/30">
            <CheckCircle2 size={14} /> Selesai
          </div>
        )}
      </div>
    </div>
  );
}

function GateInModal({
  jo,
  currentSite,
  onClose,
  onComplete,
}: {
  jo: QueueItem;
  currentSite: GroundSite | null;
  onClose: () => void;
  onComplete: () => void;
}) {
  type Step = 'photo' | 'ocr_result' | 'driver_confirm' | 'submitting' | 'done';
  const [step, setStep] = useState<Step>('photo');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<{ rawText: string; normalizedPlate: string; confidence: number } | null>(null);
  const [plateMatch, setPlateMatch] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.click();
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setPhotoData(reader.result as string);
      reader.readAsDataURL(file);
    };
  };

  const handleOcr = async () => {
    if (!photoData) return;
    setStep('submitting');
    setError(null);
    try {
      const result = await recognizeLicensePlate(photoData);
      setOcrResult(result);
      const matched = matchPlate(result.normalizedPlate, jo.fleet_plate || '');
      setPlateMatch(matched);
      setStep('ocr_result');
    } catch (err: any) {
      setError('Gagal memproses OCR: ' + err.message);
      setStep('photo');
    }
  };

  const handleConfirmDriver = async () => {
    setStep('submitting');
    setError(null);
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}

      const eventType =
        currentSite?.site_type === 'port' ? 'GATE_IN_PORT' :
        currentSite?.site_type === 'factory' ? 'GATE_IN_FACTORY' : 'GATE_IN_DEPOT';

      const res = await fetch('/api/ground/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_order_id: jo.jo_id,
          event_type: eventType,
          site_id: currentSite?.id || null,
          latitude: lat,
          longitude: lng,
          photo_base64: photoData,
          ocr_json: {
            plate_ocr: ocrResult?.normalizedPlate || null,
            plate_raw: ocrResult?.rawText || null,
            plate_confidence: ocrResult?.confidence || 0,
            plate_match: plateMatch,
            driver_confirmed: true,
          },
          container_number: undefined,
          notes: `Gate In — Plat: ${ocrResult?.normalizedPlate || 'N/A'}, Driver: ${jo.driver_name || 'N/A'}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan Gate In');
      }

      setStep('done');
      setTimeout(onComplete, 1200);
    } catch (err: any) {
      setError(err.message);
      setStep('ocr_result');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight">Gate In — {jo.jo_number}</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{jo.fleet_plate} • {jo.driver_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center">
            <X size={14} className="text-slate-400" />
          </button>
        </div>

        <div className="p-5">
          {step === 'photo' && (
            <div className="space-y-4">
              <div className="text-center">
                <Camera size={32} className="text-amber-400 mx-auto mb-2" />
                <p className="text-sm font-black text-white">Foto Nomor Polisi</p>
                <p className="text-[10px] text-slate-500 mt-1">Ambil foto plat nomor truk untuk validasi</p>
              </div>

              {!photoData ? (
                <button onClick={handleCapture}
                  className="w-full aspect-video bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-all">
                  <Camera size={40} className="text-slate-500" />
                  <p className="text-xs font-bold text-slate-400">Tap untuk Ambil Foto</p>
                </button>
              ) : (
                <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                  <img src={photoData} alt="Plat Nomor" className="w-full h-full object-cover" />
                  <button onClick={() => setPhotoData(null)}
                    className="absolute top-2 right-2 w-8 h-8 bg-slate-900/80 rounded-xl flex items-center justify-center">
                    <X size={14} className="text-white" />
                  </button>
                </div>
              )}

              <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Plat yang Diharapkan</p>
                <p className="text-sm font-black text-white">{jo.fleet_plate || 'Tidak diketahui'}</p>
              </div>

              <button onClick={handleOcr} disabled={!photoData}
                className="w-full h-11 bg-amber-600 disabled:opacity-40 hover:bg-amber-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-amber-600/20">
                <Scan size={14} /> Validasi Plat Nomor
              </button>
            </div>
          )}

          {step === 'ocr_result' && (
            <div className="space-y-4">
              <div className="text-center">
                {plateMatch ? (
                  <><CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-black text-emerald-400">Plat Nomor Cocok!</p></>
                ) : (
                  <><AlertTriangle size={40} className="text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-black text-amber-400">Plat Nomor Tidak Cocok</p></>
                )}
              </div>

              <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">OCR Result</span>
                  <span className="text-[9px] font-bold text-slate-400">{ocrResult?.confidence?.toFixed(0)}%</span>
                </div>
                <p className="text-sm font-black text-white font-mono">{ocrResult?.normalizedPlate || '-'}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                  <span className="text-[9px] font-bold text-slate-500">Diharapkan</span>
                  <span className="text-xs font-black text-white">{jo.fleet_plate}</span>
                </div>
              </div>

              <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Driver</p>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  <p className="text-sm font-black text-white">{jo.driver_name || 'Tidak diketahui'}</p>
                </div>
                {jo.driver_phone && (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone size={12} className="text-slate-500" />
                    <p className="text-[10px] font-bold text-slate-400">{jo.driver_phone}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setStep('photo'); setPhotoData(null); setOcrResult(null); setPlateMatch(null); }}
                  className="flex-1 h-11 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 active:scale-95 transition-all">
                  Foto Ulang
                </button>
                <button onClick={handleConfirmDriver}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-600/20">
                  <ShieldCheck size={14} /> Konfirmasi Driver
                </button>
              </div>

              {error && <p className="text-[10px] font-bold text-rose-400 text-center">{error}</p>}
            </div>
          )}

          {step === 'submitting' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
              <p className="text-xs font-bold text-slate-400">Memproses...</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 size={48} className="text-emerald-400 mb-3" />
              <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Gate In Berhasil</p>
              <p className="text-[10px] text-slate-500 mt-1">Truck tercatat masuk</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GateOutModal({
  jo,
  currentSite,
  onClose,
  onComplete,
}: {
  jo: QueueItem;
  currentSite: GroundSite | null;
  onClose: () => void;
  onComplete: () => void;
}) {
  type Step = 'photo' | 'ocr_result' | 'confirm' | 'submitting' | 'done';
  const [step, setStep] = useState<Step>('photo');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<{ rawText: string; normalizedNumber: string; confidence: number } | null>(null);
  const [containerNumber, setContainerNumber] = useState(jo.container_number || '');
  const [error, setError] = useState<string | null>(null);

  const handleCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.click();
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setPhotoData(reader.result as string);
      reader.readAsDataURL(file);
    };
  };

  const handleOcr = async () => {
    if (!photoData) return;
    setStep('submitting');
    setError(null);
    try {
      const result = await recognizeContainerNumber(photoData);
      setOcrResult(result);
      if (result.normalizedNumber.length >= 4) {
        setContainerNumber(result.normalizedNumber);
      }
      setStep('ocr_result');
    } catch (err: any) {
      setError('Gagal memproses OCR: ' + err.message);
      setStep('photo');
    }
  };

  const handleSubmit = async () => {
    setStep('submitting');
    setError(null);
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}

      const eventType =
        currentSite?.site_type === 'port' ? 'GATE_OUT_PORT' :
        currentSite?.site_type === 'factory' ? 'GATE_OUT_FACTORY' : 'GATE_OUT_DEPOT';

      const res = await fetch('/api/ground/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_order_id: jo.jo_id,
          event_type: eventType,
          site_id: currentSite?.id || null,
          latitude: lat,
          longitude: lng,
          photo_base64: photoData,
          ocr_json: {
            container_ocr: ocrResult?.normalizedNumber || null,
            container_raw: ocrResult?.rawText || null,
            container_confidence: ocrResult?.confidence || 0,
          },
          container_number: containerNumber || undefined,
          notes: `Gate Out — Kontainer: ${containerNumber || 'N/A'}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan Gate Out');
      }

      setStep('done');
      setTimeout(onComplete, 1200);
    } catch (err: any) {
      setError(err.message);
      setStep('ocr_result');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight">Gate Out — {jo.jo_number}</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{jo.fleet_plate} • {jo.driver_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center">
            <X size={14} className="text-slate-400" />
          </button>
        </div>

        <div className="p-5">
          {step === 'photo' && (
            <div className="space-y-4">
              <div className="text-center">
                <Scan size={32} className="text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-black text-white">Foto Nomor Kontainer</p>
                <p className="text-[10px] text-slate-500 mt-1">Ambil foto nomor kontainer untuk pencatatan</p>
              </div>

              {!photoData ? (
                <button onClick={handleCapture}
                  className="w-full aspect-video bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-all">
                  <Camera size={40} className="text-slate-500" />
                  <p className="text-xs font-bold text-slate-400">Tap untuk Ambil Foto</p>
                </button>
              ) : (
                <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                  <img src={photoData} alt="Kontainer" className="w-full h-full object-cover" />
                  <button onClick={() => setPhotoData(null)}
                    className="absolute top-2 right-2 w-8 h-8 bg-slate-900/80 rounded-xl flex items-center justify-center">
                    <X size={14} className="text-white" />
                  </button>
                </div>
              )}

              <button onClick={handleOcr} disabled={!photoData}
                className="w-full h-11 bg-blue-600 disabled:opacity-40 hover:bg-blue-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-600/20">
                <Scan size={14} /> Scan Kontainer
              </button>
            </div>
          )}

          {step === 'ocr_result' && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle2 size={40} className="text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-black text-white">Hasil Scan</p>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nomor Kontainer</label>
                <input type="text" value={containerNumber} onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                  placeholder="TGHU-1234567"
                  className="w-full h-11 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-black focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-600 font-mono" />
              </div>

              {ocrResult && (
                <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">OCR Raw</span>
                    <span className="text-[9px] font-bold text-slate-400">{ocrResult.confidence?.toFixed(0)}%</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 font-mono">{ocrResult.rawText}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setStep('photo'); setPhotoData(null); setOcrResult(null); }}
                  className="flex-1 h-11 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 active:scale-95 transition-all">
                  Foto Ulang
                </button>
                <button onClick={handleSubmit} disabled={!containerNumber}
                  className="flex-1 h-11 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-600/20">
                  <CheckCircle2 size={14} /> Gate Out
                </button>
              </div>

              {error && <p className="text-[10px] font-bold text-rose-400 text-center">{error}</p>}
            </div>
          )}

          {step === 'submitting' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-xs font-bold text-slate-400">Memproses Gate Out...</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 size={48} className="text-emerald-400 mb-3" />
              <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Gate Out Berhasil</p>
              <p className="text-[10px] text-slate-500 mt-1">Truck tercatat keluar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
