'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { QueueItem, GroundSite, PickupFlowStage, DropoffFlowStage } from '@/lib/domain/ground/types';
import { recognizeLicensePlate, recognizeContainerNumber, recognizeSimCard, matchPlate, matchDriverName, terminateWorker } from '@/lib/ground/ocr';
import { useGroundPwaInstall } from '@/lib/ground/usePwaInstall';
import {
  Loader2, MapPin, Truck, LogOut, Camera,
  CheckCircle2, AlertCircle, WifiOff, RefreshCw, X,
  ShieldCheck, Download, User, Phone, Hash,
  DoorOpen, DoorClosed, Scan, AlertTriangle,
  IdCard, FileText, UserCheck, ClipboardList,
} from 'lucide-react';

type StaffRole = 'pic1_gate_in' | 'pic2_gate_out' | 'dropoff_arrival' | 'dropoff_docs';

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
  const [pic1GateInJo, setPic1GateInJo] = useState<QueueItem | null>(null);
  const [pic2GateOutJo, setPic2GateOutJo] = useState<QueueItem | null>(null);
  const [dropoffArrivalJo, setDropoffArrivalJo] = useState<QueueItem | null>(null);
  const [dropoffDocsJo, setDropoffDocsJo] = useState<QueueItem | null>(null);

  const [currentRole, setCurrentRole] = useState<StaffRole>('pic1_gate_in');

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

  const roleTabs: { role: StaffRole; label: string; icon: any; count: number }[] = [
    { role: 'pic1_gate_in', label: 'PIC1 Gate In', icon: UserCheck, count: queue.filter(q => q.pickup_flow_stage === 'awaiting_pic1').length },
    { role: 'pic2_gate_out', label: 'PIC2 Gate Out', icon: ClipboardList, count: queue.filter(q => q.pickup_flow_stage === 'pic1_done').length },
    { role: 'dropoff_arrival', label: 'Dropoff Tiba', icon: Truck, count: queue.filter(q => q.dropoff_flow_stage === 'awaiting_arrival' || q.dropoff_flow_stage === 'arrived').length },
    { role: 'dropoff_docs', label: 'Dropoff Dokumen', icon: FileText, count: queue.filter(q => q.dropoff_flow_stage === 'arrived').length },
  ];

  const filteredQueue = queue.filter((q) => {
    switch (currentRole) {
      case 'pic1_gate_in':
        return q.pickup_flow_stage === 'awaiting_pic1' || q.pickup_flow_stage === 'pic1_done';
      case 'pic2_gate_out':
        return q.pickup_flow_stage === 'pic1_done';
      case 'dropoff_arrival':
        return q.dropoff_flow_stage === 'awaiting_arrival' || q.dropoff_flow_stage === 'arrived';
      case 'dropoff_docs':
        return q.dropoff_flow_stage === 'arrived';
      default:
        return true;
    }
  });

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

      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="grid grid-cols-2 gap-1.5 bg-slate-900 rounded-2xl p-1.5 border border-slate-800">
          {roleTabs.map((tab) => (
            <button key={tab.role} onClick={() => setCurrentRole(tab.role)}
              className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${
                currentRole === tab.role
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}>
              <tab.icon size={14} />
              <span className="truncate">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`ml-auto min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-black ${
                  currentRole === tab.role ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-rose-900/50 border border-rose-800 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <p className="text-xs font-bold text-rose-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto"><X size={14} className="text-rose-400" /></button>
          </div>
        )}

        {queueLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="bg-slate-900 rounded-2xl p-8 text-center border border-slate-800">
            <Truck size={32} className="text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">Tidak ada antrian untuk peran ini</p>
            <p className="text-[10px] text-slate-600 mt-1">Tunggu dispatcher mengirim JO</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQueue.map((item) => (
              <RoleJoCard
                key={item.jo_id}
                item={item}
                role={currentRole}
                onPic1GateIn={() => setPic1GateInJo(item)}
                onPic2GateOut={() => setPic2GateOutJo(item)}
                onDropoffArrival={() => setDropoffArrivalJo(item)}
                onDropoffDocs={() => setDropoffDocsJo(item)}
              />
            ))}
          </div>
        )}
      </main>

      {pic1GateInJo && (
        <PIC1GateInModal
          jo={pic1GateInJo}
          currentSite={currentSite}
          onClose={() => setPic1GateInJo(null)}
          onComplete={() => { setPic1GateInJo(null); fetchQueue(); }}
        />
      )}

      {pic2GateOutJo && (
        <PIC2GateOutModal
          jo={pic2GateOutJo}
          currentSite={currentSite}
          onClose={() => setPic2GateOutJo(null)}
          onComplete={() => { setPic2GateOutJo(null); fetchQueue(); }}
        />
      )}

      {dropoffArrivalJo && (
        <DropoffArrivalModal
          jo={dropoffArrivalJo}
          currentSite={currentSite}
          onClose={() => setDropoffArrivalJo(null)}
          onComplete={() => { setDropoffArrivalJo(null); fetchQueue(); }}
        />
      )}

      {dropoffDocsJo && (
        <DropoffDocumentModal
          jo={dropoffDocsJo}
          currentSite={currentSite}
          onClose={() => setDropoffDocsJo(null)}
          onComplete={() => { setDropoffDocsJo(null); fetchQueue(); }}
        />
      )}
    </div>
  );
}

function RoleJoCard({
  item, role, onPic1GateIn, onPic2GateOut, onDropoffArrival, onDropoffDocs,
}: {
  item: QueueItem;
  role: StaffRole;
  onPic1GateIn: () => void;
  onPic2GateOut: () => void;
  onDropoffArrival: () => void;
  onDropoffDocs: () => void;
}) {
  const stageColorMap: Record<string, string> = {
    awaiting_pic1: 'border-amber-700/50 bg-amber-900/10',
    pic1_done: 'border-blue-700/50 bg-blue-900/10',
    pic2_done: 'border-emerald-700/50 bg-emerald-900/10',
    pickup_complete: 'border-slate-700/50 bg-slate-900/10',
    awaiting_arrival: 'border-amber-700/50 bg-amber-900/10',
    arrived: 'border-blue-700/50 bg-blue-900/10',
    documents_done: 'border-emerald-700/50 bg-emerald-900/10',
    dropoff_complete: 'border-slate-700/50 bg-slate-900/10',
  };

  const flowStage = role === 'pic1_gate_in' || role === 'pic2_gate_out'
    ? item.pickup_flow_stage
    : item.dropoff_flow_stage;

  const borderStyle = stageColorMap[flowStage] || 'border-slate-700/50 bg-slate-900/10';

  return (
    <div className={`rounded-2xl p-4 border ${borderStyle} transition-all`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black text-white">{item.jo_number}</span>
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
      </div>

      {item.pic1_assigned_to && (
        <div className="flex items-center gap-2 mb-2">
          <UserCheck size={11} className="text-slate-500" />
          <span className="text-[8px] font-bold text-slate-500">PIC1: {item.pic1_assigned_to}</span>
        </div>
      )}
      {item.pic2_assigned_to && (
        <div className="flex items-center gap-2 mb-2">
          <UserCheck size={11} className="text-slate-500" />
          <span className="text-[8px] font-bold text-slate-500">PIC2: {item.pic2_assigned_to}</span>
        </div>
      )}

      <div className="flex gap-2">
        {role === 'pic1_gate_in' && item.pickup_flow_stage === 'awaiting_pic1' && (
          <button onClick={onPic1GateIn}
            className="flex-1 h-10 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-amber-600/20">
            <IdCard size={14} /> Gate In (Plat + SIM)
          </button>
        )}
        {role === 'pic2_gate_out' && item.pickup_flow_stage === 'pic1_done' && (
          <button onClick={onPic2GateOut}
            className="flex-1 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-blue-600/20">
            <FileText size={14} /> Gate Out (Dokumen)
          </button>
        )}
        {role === 'dropoff_arrival' && (item.dropoff_flow_stage === 'awaiting_arrival' || item.dropoff_flow_stage === 'arrived') && (
          <button onClick={onDropoffArrival}
            className="flex-1 h-10 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-amber-600/20">
            <Truck size={14} /> Validasi Tiba
          </button>
        )}
        {role === 'dropoff_docs' && item.dropoff_flow_stage === 'arrived' && (
          <button onClick={onDropoffDocs}
            className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-lg shadow-emerald-600/20">
            <FileText size={14} /> Tambah Dokumen
          </button>
        )}
        {role === 'pic1_gate_in' && item.pickup_flow_stage === 'pic1_done' && (
          <div className="flex-1 h-10 bg-emerald-900/30 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-800/30">
            <CheckCircle2 size={14} /> PIC1 Selesai
          </div>
        )}
        {role === 'dropoff_arrival' && item.dropoff_flow_stage === 'arrived' && (
          <div className="flex-1 h-10 bg-blue-900/30 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-blue-800/30">
            <CheckCircle2 size={14} /> Tiba Tercatat
          </div>
        )}
      </div>
    </div>
  );
}

function PIC1GateInModal({
  jo, currentSite, onClose, onComplete,
}: {
  jo: QueueItem; currentSite: GroundSite | null; onClose: () => void; onComplete: () => void;
}) {
  type Step = 'plate_photo' | 'plate_ocr' | 'sim_photo' | 'sim_ocr' | 'submitting' | 'done';
  const [step, setStep] = useState<Step>('plate_photo');
  const [platePhotoData, setPlatePhotoData] = useState<string | null>(null);
  const [ocrPlateResult, setOcrPlateResult] = useState<{ rawText: string; normalizedPlate: string; confidence: number } | null>(null);
  const [plateMatch, setPlateMatch] = useState<boolean | null>(null);
  const [simPhotoData, setSimPhotoData] = useState<string | null>(null);
  const [ocrSimResult, setOcrSimResult] = useState<{ rawText: string; extractedName: string; extractedSimNumber: string; confidence: number } | null>(null);
  const [driverNameMatch, setDriverNameMatch] = useState<{ match: boolean; score: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = (setter: (v: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.click();
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    };
  };

  const handlePlateOcr = async () => {
    if (!platePhotoData) return;
    setStep('submitting');
    setError(null);
    try {
      const result = await recognizeLicensePlate(platePhotoData);
      setOcrPlateResult(result);
      const matched = matchPlate(result.normalizedPlate, jo.fleet_plate || '');
      setPlateMatch(matched);
      setStep('plate_ocr');
    } catch (err: any) {
      setError('Gagal OCR plat: ' + err.message);
      setStep('plate_photo');
    }
  };

  const handleSimOcr = async () => {
    if (!simPhotoData) return;
    setStep('submitting');
    setError(null);
    try {
      const result = await recognizeSimCard(simPhotoData);
      setOcrSimResult(result);
      const dm = matchDriverName(result.extractedName, jo.driver_name || '');
      setDriverNameMatch(dm);
      setStep('sim_ocr');
    } catch (err: any) {
      setError('Gagal OCR SIM: ' + err.message);
      setStep('sim_photo');
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

      const res = await fetch('/api/ground/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_order_id: jo.jo_id,
          event_type: 'PIC1_GATE_IN',
          site_id: currentSite?.id || null,
          latitude: lat,
          longitude: lng,
          photo_base64: simPhotoData,
          ocr_json: {
            plate_ocr: ocrPlateResult?.normalizedPlate || null,
            plate_raw: ocrPlateResult?.rawText || null,
            plate_confidence: ocrPlateResult?.confidence || 0,
            plate_match: plateMatch,
            sim_name: ocrSimResult?.extractedName || null,
            sim_number: ocrSimResult?.extractedSimNumber || null,
            sim_confidence: ocrSimResult?.confidence || 0,
            driver_match: driverNameMatch?.match || false,
            driver_match_score: driverNameMatch?.score || 0,
          },
          verification_type: 'sim',
          verified_against: 'driver_name',
          verified_match: driverNameMatch?.match ?? null,
          notes: `PIC1 Gate In — Plat: ${ocrPlateResult?.normalizedPlate || 'N/A'}, Driver: ${jo.driver_name || 'N/A'}, SIM Name: ${ocrSimResult?.extractedName || 'N/A'}`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan');
      }

      setStep('done');
      setTimeout(onComplete, 1200);
    } catch (err: any) {
      setError(err.message);
      setStep('sim_ocr');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight">PIC1 Gate In — {jo.jo_number}</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{jo.fleet_plate} • {jo.driver_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center">
            <X size={14} className="text-slate-400" />
          </button>
        </div>

        <div className="p-5">
          {step === 'plate_photo' && (
            <div className="space-y-4">
              <div className="text-center">
                <Camera size={32} className="text-amber-400 mx-auto mb-2" />
                <p className="text-sm font-black text-white">Langkah 1: Foto Plat Nomor</p>
                <p className="text-[10px] text-slate-500 mt-1">Ambil foto plat nomor truk</p>
              </div>
              {!platePhotoData ? (
                <button onClick={() => handleCapture(setPlatePhotoData)}
                  className="w-full aspect-video bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-all">
                  <Camera size={40} className="text-slate-500" />
                  <p className="text-xs font-bold text-slate-400">Tap untuk Ambil Foto</p>
                </button>
              ) : (
                <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                  <img src={platePhotoData} alt="Plat" className="w-full h-full object-cover" />
                  <button onClick={() => setPlatePhotoData(null)} className="absolute top-2 right-2 w-8 h-8 bg-slate-900/80 rounded-xl flex items-center justify-center">
                    <X size={14} className="text-white" />
                  </button>
                </div>
              )}
              <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Plat Diharapkan</p>
                <p className="text-sm font-black text-white">{jo.fleet_plate || 'Tidak diketahui'}</p>
              </div>
              <button onClick={handlePlateOcr} disabled={!platePhotoData}
                className="w-full h-11 bg-amber-600 disabled:opacity-40 hover:bg-amber-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-amber-600/20">
                <Scan size={14} /> OCR Plat Nomor
              </button>
            </div>
          )}

          {step === 'plate_ocr' && (
            <div className="space-y-4">
              <div className="text-center">
                {plateMatch ? (
                  <><CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-black text-emerald-400">Plat Cocok!</p></>
                ) : (
                  <><AlertTriangle size={40} className="text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-black text-amber-400">Plat Tidak Cocok</p></>
                )}
              </div>
              <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">OCR</span>
                  <span className="text-[9px] font-bold text-slate-400">{ocrPlateResult?.confidence?.toFixed(0)}%</span>
                </div>
                <p className="text-sm font-black text-white font-mono">{ocrPlateResult?.normalizedPlate || '-'}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                  <span className="text-[9px] font-bold text-slate-500">Diharapkan</span>
                  <span className="text-xs font-black text-white">{jo.fleet_plate}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setStep('plate_photo'); setPlatePhotoData(null); setOcrPlateResult(null); setPlateMatch(null); }}
                  className="flex-1 h-11 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 active:scale-95">Foto Ulang</button>
                <button onClick={() => setStep('sim_photo')}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-600/20">
                  <CheckCircle2 size={14} /> Lanjut Foto SIM
                </button>
              </div>
            </div>
          )}

          {step === 'sim_photo' && (
            <div className="space-y-4">
              <div className="text-center">
                <IdCard size={32} className="text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-black text-white">Langkah 2: Foto SIM Driver</p>
                <p className="text-[10px] text-slate-500 mt-1">Ambil foto SIM driver untuk validasi nama</p>
              </div>
              {!simPhotoData ? (
                <button onClick={() => handleCapture(setSimPhotoData)}
                  className="w-full aspect-video bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-all">
                  <Camera size={40} className="text-slate-500" />
                  <p className="text-xs font-bold text-slate-400">Tap untuk Ambil Foto</p>
                </button>
              ) : (
                <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                  <img src={simPhotoData} alt="SIM" className="w-full h-full object-cover" />
                  <button onClick={() => setSimPhotoData(null)} className="absolute top-2 right-2 w-8 h-8 bg-slate-900/80 rounded-xl flex items-center justify-center">
                    <X size={14} className="text-white" />
                  </button>
                </div>
              )}
              <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Driver Diharapkan</p>
                <p className="text-sm font-black text-white">{jo.driver_name || 'Tidak diketahui'}</p>
              </div>
              <button onClick={handleSimOcr} disabled={!simPhotoData}
                className="w-full h-11 bg-blue-600 disabled:opacity-40 hover:bg-blue-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-600/20">
                <Scan size={14} /> OCR SIM
              </button>
            </div>
          )}

          {step === 'sim_ocr' && (
            <div className="space-y-4">
              <div className="text-center">
                <User size={40} className="text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-black text-white">Hasil OCR SIM</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Nama SIM</span>
                  <span className="text-[9px] font-bold text-slate-400">{ocrSimResult?.confidence?.toFixed(0)}%</span>
                </div>
                <p className="text-sm font-black text-white">{ocrSimResult?.extractedName || '-'}</p>
                {ocrSimResult?.extractedSimNumber && (
                  <div className="pt-2 border-t border-slate-700">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">No SIM</span>
                    <p className="text-sm font-black text-white font-mono">{ocrSimResult.extractedSimNumber}</p>
                  </div>
                )}
              </div>
              <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Driver JO</span>
                <span className="text-xs font-black text-white">{jo.driver_name}</span>
              </div>
              {driverNameMatch && (
                <div className={`rounded-xl p-3 border flex items-center gap-2 ${
                  driverNameMatch.match ? 'bg-emerald-900/30 border-emerald-700' : 'bg-amber-900/30 border-amber-700'
                }`}>
                  {driverNameMatch.match ? (
                    <><CheckCircle2 size={16} className="text-emerald-400" /><span className="text-xs font-bold text-emerald-300">Nama Cocok ({(driverNameMatch.score * 100).toFixed(0)}%)</span></>
                  ) : (
                    <><AlertTriangle size={16} className="text-amber-400" /><span className="text-xs font-bold text-amber-300">Nama Tidak Cocok ({(driverNameMatch.score * 100).toFixed(0)}%)</span></>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setStep('sim_photo'); setSimPhotoData(null); setOcrSimResult(null); setDriverNameMatch(null); }}
                  className="flex-1 h-11 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 active:scale-95">Foto Ulang</button>
                <button onClick={handleSubmit}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-600/20">
                  <ShieldCheck size={14} /> Konfirmasi PIC1 Gate In
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
              <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">PIC1 Gate In Berhasil</p>
              <p className="text-[10px] text-slate-500 mt-1">Plat & SIM terverifikasi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PIC2GateOutModal({
  jo, currentSite, onClose, onComplete,
}: {
  jo: QueueItem; currentSite: GroundSite | null; onClose: () => void; onComplete: () => void;
}) {
  type Step = 'surat_jalan_photo' | 'plate_recheck_photo' | 'plate_recheck_ocr' | 'container_input' | 'submitting' | 'done';
  const [step, setStep] = useState<Step>('surat_jalan_photo');
  const [suratJalanPhoto, setSuratJalanPhoto] = useState<string | null>(null);
  const [platePhotoData, setPlatePhotoData] = useState<string | null>(null);
  const [ocrPlateResult, setOcrPlateResult] = useState<{ rawText: string; normalizedPlate: string; confidence: number } | null>(null);
  const [plateMatch, setPlateMatch] = useState<boolean | null>(null);
  const [containerNumber, setContainerNumber] = useState(jo.container_number || '');
  const [suratJalanUrl, setSuratJalanUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = (setter: (v: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.click();
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    };
  };

  const handleUploadSuratJalan = async () => {
    if (!suratJalanPhoto) return;
    setStep('submitting');
    setError(null);
    try {
      const base64Data = suratJalanPhoto.split(",")[1] || suratJalanPhoto;
      const buffer = Buffer.from(base64Data, "base64");

      const res = await fetch('/api/ground/upload-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_order_id: jo.jo_id,
          document_type: 'surat_jalan',
          file_base64: base64Data,
          file_name: `surat_jalan_${jo.jo_number}_${Date.now()}.jpg`,
        }),
      });

      if (!res.ok) throw new Error('Gagal upload surat jalan');

      const data = await res.json();
      setSuratJalanUrl(data.file_url);
      setStep('plate_recheck_photo');
    } catch (err: any) {
      setError(err.message);
      setStep('surat_jalan_photo');
    }
  };

  const handlePlateOcr = async () => {
    if (!platePhotoData) return;
    setStep('submitting');
    setError(null);
    try {
      const result = await recognizeLicensePlate(platePhotoData);
      setOcrPlateResult(result);
      const matched = matchPlate(result.normalizedPlate, jo.fleet_plate || '');
      setPlateMatch(matched);
      setStep('plate_recheck_ocr');
    } catch (err: any) {
      setError('Gagal OCR plat: ' + err.message);
      setStep('plate_recheck_photo');
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

      const res = await fetch('/api/ground/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_order_id: jo.jo_id,
          event_type: 'PIC2_GATE_OUT',
          site_id: currentSite?.id || null,
          latitude: lat,
          longitude: lng,
          photo_base64: platePhotoData,
          ocr_json: {
            plate_recheck: ocrPlateResult?.normalizedPlate || null,
            plate_recheck_raw: ocrPlateResult?.rawText || null,
            plate_recheck_confidence: ocrPlateResult?.confidence || 0,
            plate_recheck_match: plateMatch,
            container_number: containerNumber,
          },
          container_number: containerNumber || undefined,
          verification_type: 'plate_recheck',
          verified_against: 'fleet_plate',
          verified_match: plateMatch ?? null,
          documents: suratJalanUrl ? [{ document_type: 'surat_jalan', file_url: suratJalanUrl, notes: 'Surat Jalan PIC2' }] : [],
          notes: `PIC2 Gate Out — Plat: ${ocrPlateResult?.normalizedPlate || 'N/A'}, Kontainer: ${containerNumber || 'N/A'}`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan Gate Out');
      }

      setStep('done');
      setTimeout(onComplete, 1200);
    } catch (err: any) {
      setError(err.message);
      setStep('plate_recheck_ocr');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight">PIC2 Gate Out — {jo.jo_number}</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{jo.fleet_plate} • {jo.driver_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center">
            <X size={14} className="text-slate-400" />
          </button>
        </div>

        <div className="p-5">
          {step === 'surat_jalan_photo' && (
            <div className="space-y-4">
              <div className="text-center">
                <FileText size={32} className="text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-black text-white">Langkah 1: Foto Surat Jalan</p>
                <p className="text-[10px] text-slate-500 mt-1">Ambil foto surat jalan/dokumen muatan</p>
              </div>
              {!suratJalanPhoto ? (
                <button onClick={() => handleCapture(setSuratJalanPhoto)}
                  className="w-full aspect-video bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-all">
                  <Camera size={40} className="text-slate-500" />
                  <p className="text-xs font-bold text-slate-400">Tap untuk Ambil Foto</p>
                </button>
              ) : (
                <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                  <img src={suratJalanPhoto} alt="Surat Jalan" className="w-full h-full object-cover" />
                  <button onClick={() => setSuratJalanPhoto(null)} className="absolute top-2 right-2 w-8 h-8 bg-slate-900/80 rounded-xl flex items-center justify-center">
                    <X size={14} className="text-white" />
                  </button>
                </div>
              )}
              <button onClick={handleUploadSuratJalan} disabled={!suratJalanPhoto}
                className="w-full h-11 bg-blue-600 disabled:opacity-40 hover:bg-blue-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-600/20">
                <Upload size={14} /> Upload Surat Jalan
              </button>
            </div>
          )}

          {step === 'plate_recheck_photo' && (
            <div className="space-y-4">
              <div className="text-center">
                <Camera size={32} className="text-amber-400 mx-auto mb-2" />
                <p className="text-sm font-black text-white">Langkah 2: Re-check Plat Nomor</p>
                <p className="text-[10px] text-slate-500 mt-1">Foto plat nomor untuk validasi kedua</p>
              </div>
              {!platePhotoData ? (
                <button onClick={() => handleCapture(setPlatePhotoData)}
                  className="w-full aspect-video bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-all">
                  <Camera size={40} className="text-slate-500" />
                  <p className="text-xs font-bold text-slate-400">Tap untuk Ambil Foto</p>
                </button>
              ) : (
                <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                  <img src={platePhotoData} alt="Plat" className="w-full h-full object-cover" />
                  <button onClick={() => setPlatePhotoData(null)} className="absolute top-2 right-2 w-8 h-8 bg-slate-900/80 rounded-xl flex items-center justify-center">
                    <X size={14} className="text-white" />
                  </button>
                </div>
              )}
              <button onClick={handlePlateOcr} disabled={!platePhotoData}
                className="w-full h-11 bg-amber-600 disabled:opacity-40 hover:bg-amber-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-amber-600/20">
                <Scan size={14} /> OCR Plat
              </button>
            </div>
          )}

          {step === 'plate_recheck_ocr' && (
            <div className="space-y-4">
              <div className="text-center">
                {plateMatch ? (
                  <><CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-black text-emerald-400">Plat Cocok!</p></>
                ) : (
                  <><AlertTriangle size={40} className="text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-black text-amber-400">Plat Tidak Cocok</p></>
                )}
              </div>
              <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                <p className="text-[9px] font-bold text-slate-500 uppercase">Hasil OCR</p>
                <p className="text-sm font-black text-white font-mono">{ocrPlateResult?.normalizedPlate || '-'}</p>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nomor Kontainer</label>
                <input type="text" value={containerNumber} onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                  placeholder="TGHU-1234567"
                  className="w-full h-11 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-black focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-600 font-mono" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setStep('plate_recheck_photo'); setPlatePhotoData(null); setOcrPlateResult(null); setPlateMatch(null); }}
                  className="flex-1 h-11 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 active:scale-95">Foto Ulang</button>
                <button onClick={handleSubmit} disabled={!containerNumber}
                  className="flex-1 h-11 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-600/20">
                  <CheckCircle2 size={14} /> Konfirmasi PIC2 Gate Out
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
              <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">PIC2 Gate Out Berhasil</p>
              <p className="text-[10px] text-slate-500 mt-1">Dokumen & plat terverifikasi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { Upload } from 'lucide-react';

function DropoffArrivalModal({
  jo, currentSite, onClose, onComplete,
}: {
  jo: QueueItem; currentSite: GroundSite | null; onClose: () => void; onComplete: () => void;
}) {
  type Step = 'plate_photo' | 'plate_ocr' | 'sim_photo' | 'sim_ocr' | 'submitting' | 'done';
  const [step, setStep] = useState<Step>('plate_photo');
  const [platePhotoData, setPlatePhotoData] = useState<string | null>(null);
  const [ocrPlateResult, setOcrPlateResult] = useState<{ rawText: string; normalizedPlate: string; confidence: number } | null>(null);
  const [plateMatch, setPlateMatch] = useState<boolean | null>(null);
  const [simPhotoData, setSimPhotoData] = useState<string | null>(null);
  const [ocrSimResult, setOcrSimResult] = useState<{ rawText: string; extractedName: string; extractedSimNumber: string; confidence: number } | null>(null);
  const [driverNameMatch, setDriverNameMatch] = useState<{ match: boolean; score: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = (setter: (v: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.click();
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    };
  };

  const handlePlateOcr = async () => {
    if (!platePhotoData) return;
    setStep('submitting');
    setError(null);
    try {
      const result = await recognizeLicensePlate(platePhotoData);
      setOcrPlateResult(result);
      const matched = matchPlate(result.normalizedPlate, jo.fleet_plate || '');
      setPlateMatch(matched);
      setStep('plate_ocr');
    } catch (err: any) {
      setError('Gagal OCR plat: ' + err.message);
      setStep('plate_photo');
    }
  };

  const handleSimOcr = async () => {
    if (!simPhotoData) return;
    setStep('submitting');
    setError(null);
    try {
      const result = await recognizeSimCard(simPhotoData);
      setOcrSimResult(result);
      const dm = matchDriverName(result.extractedName, jo.driver_name || '');
      setDriverNameMatch(dm);
      setStep('sim_ocr');
    } catch (err: any) {
      setError('Gagal OCR SIM: ' + err.message);
      setStep('sim_photo');
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

      const res = await fetch('/api/ground/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_order_id: jo.jo_id,
          event_type: 'PIC1_DROPOFF_ARRIVE',
          site_id: currentSite?.id || null,
          latitude: lat,
          longitude: lng,
          photo_base64: simPhotoData,
          ocr_json: {
            plate_ocr: ocrPlateResult?.normalizedPlate || null,
            plate_match: plateMatch,
            sim_name: ocrSimResult?.extractedName || null,
            sim_number: ocrSimResult?.extractedSimNumber || null,
            driver_match: driverNameMatch?.match || false,
            driver_match_score: driverNameMatch?.score || 0,
          },
          verification_type: 'sim',
          verified_against: 'driver_name',
          verified_match: driverNameMatch?.match ?? null,
          notes: `Dropoff Arrival — Plat: ${ocrPlateResult?.normalizedPlate || 'N/A'}, Driver: ${jo.driver_name || 'N/A'}`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan');
      }

      setStep('done');
      setTimeout(onComplete, 1200);
    } catch (err: any) {
      setError(err.message);
      setStep('sim_ocr');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight">Dropoff — {jo.jo_number}</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{jo.fleet_plate} • {jo.driver_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center">
            <X size={14} className="text-slate-400" />
          </button>
        </div>

        <div className="p-5">
          {step === 'plate_photo' && (
            <div className="space-y-4">
              <div className="text-center">
                <Camera size={32} className="text-amber-400 mx-auto mb-2" />
                <p className="text-sm font-black text-white">Langkah 1: Foto Plat Nomor</p>
                <p className="text-[10px] text-slate-500 mt-1">Validasi truck sampai tujuan</p>
              </div>
              {!platePhotoData ? (
                <button onClick={() => handleCapture(setPlatePhotoData)}
                  className="w-full aspect-video bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-all">
                  <Camera size={40} className="text-slate-500" />
                  <p className="text-xs font-bold text-slate-400">Tap untuk Ambil Foto</p>
                </button>
              ) : (
                <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                  <img src={platePhotoData} alt="Plat" className="w-full h-full object-cover" />
                  <button onClick={() => setPlatePhotoData(null)} className="absolute top-2 right-2 w-8 h-8 bg-slate-900/80 rounded-xl flex items-center justify-center">
                    <X size={14} className="text-white" />
                  </button>
                </div>
              )}
              <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Plat Diharapkan</p>
                <p className="text-sm font-black text-white">{jo.fleet_plate || 'Tidak diketahui'}</p>
              </div>
              <button onClick={handlePlateOcr} disabled={!platePhotoData}
                className="w-full h-11 bg-amber-600 disabled:opacity-40 hover:bg-amber-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-amber-600/20">
                <Scan size={14} /> Validasi Plat
              </button>
            </div>
          )}

          {step === 'plate_ocr' && (
            <div className="space-y-4">
              <div className="text-center">
                {plateMatch ? (
                  <><CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-black text-emerald-400">Plat Cocok!</p></>
                ) : (
                  <><AlertTriangle size={40} className="text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-black text-amber-400">Plat Tidak Cocok</p></>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setStep('plate_photo'); setPlatePhotoData(null); setOcrPlateResult(null); setPlateMatch(null); }}
                  className="flex-1 h-11 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 active:scale-95">Foto Ulang</button>
                <button onClick={() => setStep('sim_photo')}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-600/20">
                  <CheckCircle2 size={14} /> Lanjut Foto SIM
                </button>
              </div>
            </div>
          )}

          {step === 'sim_photo' && (
            <div className="space-y-4">
              <div className="text-center">
                <IdCard size={32} className="text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-black text-white">Langkah 2: Foto SIM Driver</p>
                <p className="text-[10px] text-slate-500 mt-1">Validasi driver sampai tujuan</p>
              </div>
              {!simPhotoData ? (
                <button onClick={() => handleCapture(setSimPhotoData)}
                  className="w-full aspect-video bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-all">
                  <Camera size={40} className="text-slate-500" />
                  <p className="text-xs font-bold text-slate-400">Tap untuk Ambil Foto</p>
                </button>
              ) : (
                <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                  <img src={simPhotoData} alt="SIM" className="w-full h-full object-cover" />
                  <button onClick={() => setSimPhotoData(null)} className="absolute top-2 right-2 w-8 h-8 bg-slate-900/80 rounded-xl flex items-center justify-center">
                    <X size={14} className="text-white" />
                  </button>
                </div>
              )}
              <button onClick={handleSimOcr} disabled={!simPhotoData}
                className="w-full h-11 bg-blue-600 disabled:opacity-40 hover:bg-blue-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-600/20">
                <Scan size={14} /> OCR SIM
              </button>
            </div>
          )}

          {step === 'sim_ocr' && (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 space-y-2">
                <p className="text-[9px] font-bold text-slate-500 uppercase">Nama SIM</p>
                <p className="text-sm font-black text-white">{ocrSimResult?.extractedName || '-'}</p>
              </div>
              {driverNameMatch && (
                <div className={`rounded-xl p-3 border ${driverNameMatch.match ? 'bg-emerald-900/30 border-emerald-700' : 'bg-amber-900/30 border-amber-700'}`}>
                  {driverNameMatch.match
                    ? <span className="text-xs font-bold text-emerald-300">Nama Cocok</span>
                    : <span className="text-xs font-bold text-amber-300">Nama Tidak Cocok</span>}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setStep('sim_photo'); setSimPhotoData(null); setOcrSimResult(null); setDriverNameMatch(null); }}
                  className="flex-1 h-11 bg-slate-800 rounded-xl text-xs font-bold text-slate-300 active:scale-95">Foto Ulang</button>
                <button onClick={handleSubmit}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-600/20">
                  <ShieldCheck size={14} /> Konfirmasi Tiba
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
              <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Dropoff Tiba Tercatat</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DropoffDocumentModal({
  jo, currentSite, onClose, onComplete,
}: {
  jo: QueueItem; currentSite: GroundSite | null; onClose: () => void; onComplete: () => void;
}) {
  type Step = 'form' | 'submitting' | 'done';
  const [step, setStep] = useState<Step>('form');
  const [docType, setDocType] = useState('delivery_note');
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [containerInput, setContainerInput] = useState(jo.container_number || '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

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

  const handleSubmit = async () => {
    if (!photoData) return;
    setStep('submitting');
    setError(null);
    try {
      const base64Data = photoData.split(",")[1] || photoData;

      const uploadRes = await fetch('/api/ground/upload-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_order_id: jo.jo_id,
          document_type: docType,
          file_base64: base64Data,
          file_name: `${docType}_${jo.jo_number}_${Date.now()}.jpg`,
        }),
      });

      if (!uploadRes.ok) throw new Error('Gagal upload dokumen');
      const uploadData = await uploadRes.json();

      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}

      const res = await fetch('/api/ground/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_order_id: jo.jo_id,
          event_type: 'PIC_DROPOFF_DOCUMENT',
          site_id: currentSite?.id || null,
          latitude: lat,
          longitude: lng,
          photo_base64: photoData,
          ocr_json: {
            document_type: docType,
            container_number: containerInput || undefined,
          },
          container_number: containerInput || undefined,
          documents: [{ document_type: docType, file_url: uploadData.file_url, notes: notes || null }],
          notes: `Dropoff Document — ${docType}: ${notes || ''}`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan dokumen');
      }

      setStep('done');
      setTimeout(onComplete, 1200);
    } catch (err: any) {
      setError(err.message);
      setStep('form');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight">Dropoff Dokumen — {jo.jo_number}</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{jo.fleet_plate} • {jo.driver_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center">
            <X size={14} className="text-slate-400" />
          </button>
        </div>

        <div className="p-5">
          {step === 'form' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipe Dokumen</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                  <option value="delivery_note">Delivery Note</option>
                  <option value="surat_jalan">Surat Jalan</option>
                  <option value="container_photo">Foto Kontainer</option>
                  <option value="pod">Proof of Delivery</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Foto Dokumen</label>
                {!photoData ? (
                  <button onClick={handleCapture}
                    className="w-full aspect-video bg-slate-800 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-all">
                    <Camera size={40} className="text-slate-500" />
                    <p className="text-xs font-bold text-slate-400">Tap untuk Ambil Foto</p>
                  </button>
                ) : (
                  <div className="relative aspect-video bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                    <img src={photoData} alt="Dokumen" className="w-full h-full object-cover" />
                    <button onClick={() => setPhotoData(null)} className="absolute top-2 right-2 w-8 h-8 bg-slate-900/80 rounded-xl flex items-center justify-center">
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nomor Kontainer (jika baru)</label>
                <input type="text" value={containerInput} onChange={(e) => setContainerInput(e.target.value.toUpperCase())}
                  placeholder="TGHU-1234567"
                  className="w-full h-11 px-4 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-600 font-mono" />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Catatan</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan opsional..."
                  className="w-full h-20 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-600 resize-none" />
              </div>

              <button onClick={handleSubmit} disabled={!photoData}
                className="w-full h-11 bg-emerald-600 disabled:opacity-40 hover:bg-emerald-500 rounded-xl text-xs font-black text-white uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-600/20">
                <Upload size={14} /> Simpan Dokumen
              </button>

              {error && <p className="text-[10px] font-bold text-rose-400 text-center">{error}</p>}
            </div>
          )}

          {step === 'submitting' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
              <p className="text-xs font-bold text-slate-400">Menyimpan dokumen...</p>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 size={48} className="text-emerald-400 mb-3" />
              <p className="text-sm font-black text-emerald-400 uppercase tracking-widest">Dokumen Tersimpan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
