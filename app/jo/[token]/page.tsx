"use client";

import { useEffect, useState, use } from "react";
import { toast, Toaster } from "react-hot-toast";
import {
  Truck, Package, MapPin, Calendar, 
  ChevronRight, Loader2, CheckCircle2, 
  Circle, Clock, Phone, MessageSquare,
  Upload, Navigation, Receipt, Image as ImageIcon,
  Map as MapIcon, ExternalLink, AlertTriangle, ArrowRight, RefreshCw, Crosshair, Printer, Save, X, Activity, ScanLine, ShieldCheck
} from "lucide-react";

// =====================================================
// TYPE DEFINITIONS
// =====================================================
type TrackingUpdate = {
  id: string;
  created_at: string;
  status_update: string;
  location: string | null;
};

type JobOrderData = {
  id: string;
  jo_number: string;
  status: string;
  driver_link_token: string;
  created_at: string;
  work_order: {
    wo_number: string;
    order_date: string;
    execution_date: string;
    notes: string;
    billing_method: 'epod' | 'hardcopy';
  };
  work_order_item: {
    id: string;
    truck_type: string;
    quantity: number;
    deal_price: number;
    origin_location: {
      name: string;
      address: string;
      city: string;
    };
    destination_location: {
      name: string;
      address: string;
      city: string;
    };
  };
  fleet: {
    plate_number: string;
    driver_name: string;
    driver_phone: string;
  };
  tracking_updates: TrackingUpdate[];
  documents: any[];
};

// =====================================================
// MAIN COMPONENT: ATLAS TRACKING EXPERIENCE
// =====================================================
export default function JobOrderTrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobOrderData | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState("surat_jalan");
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch Data
  const fetchJobData = async (activeToken: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/jo/${activeToken}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data");
      setJob(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(`${pos.coords.latitude}, ${pos.coords.longitude}`),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const location = await getCurrentLocation();
      const res = await fetch(`/api/jo/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify({ status: newStatus, location }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal update status");
      toast.success("Status Updated");
      fetchJobData(token);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpload = async () => {
    if (!fileToUpload) { toast.error("Pilih file"); return; }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("doc_type", uploadType);
      const res = await fetch(`/api/jo/${token}`, {
        method: "POST",
        headers: { "ngrok-skip-browser-warning": "true" },
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal upload");
      toast.success("Evidence Uploaded");
      setShowUploadModal(false);
      setFileToUpload(null);
      fetchJobData(token);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => { if (token) fetchJobData(token); }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
      <Loader2 className="w-12 h-12 text-[#FF6B00] animate-spin" />
    </div>
  );

  if (!job) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-6 text-center">
      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl max-w-sm">
        <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
        <h1 className="text-2xl font-black text-[#1E293B] uppercase italic mb-2 tracking-tighter">MISSION ERROR</h1>
        <p className="text-slate-400 text-sm font-bold mb-8">Access token is invalid or mission record has been archived.</p>
        <button onClick={() => window.location.reload()} className="w-full bg-[#1E293B] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Retry Connection</button>
      </div>
    </div>
  );

  const statusSteps = [
    { key: "assigned", label: "Protocol Assigned", icon: Clock, color: "text-amber-500", bg: "bg-amber-400" },
    { key: "accepted", label: "Personnel Ready", icon: CheckCircle2, color: "text-[#1E293B]", bg: "bg-[#1E293B]" },
    { key: "picking_up", label: "En Route Origin", icon: Navigation, color: "text-indigo-500", bg: "bg-indigo-500" },
    { key: "delivering", label: "Mission Underway", icon: Truck, color: "text-[#FF6B00]", bg: "bg-[#FF6B00]" },
    { key: "delivered", label: "Mission Success", icon: Package, color: "text-emerald-500", bg: "bg-emerald-500" },
  ];
  const currentStatusIndex = statusSteps.findIndex(s => s.key === job.status);

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#1E293B] pb-40 lg:pb-10 selection:bg-orange-500/20">
      <Toaster position="top-center" />
      
      {/* 🔴 ATLAS HEADER */}
      <header className="sticky top-0 z-[100] bg-white border-b border-slate-200 px-6 py-5 shadow-sm">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center">
                 <Truck className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <h1 className="text-lg font-black italic tracking-tighter uppercase leading-none">SENTRALOGIS</h1>
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-1">
                   <Activity className="w-2.5 h-2.5" /> Operations Feed
                </p>
              </div>
           </div>
           <button onClick={() => fetchJobData(token)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-all">
              <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 md:p-10 space-y-8">
          
          {/* Hero Mission Card */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.03)] relative overflow-hidden group">
             <div className="flex justify-between items-start mb-10">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" /> Mission Active
                   </p>
                   <h2 className="text-4xl font-black italic tracking-tighter uppercase text-[#1E293B] leading-none mb-1">
                      {job.jo_number?.split('-').pop()}
                   </h2>
                   <p className="text-xs font-black text-slate-300 uppercase tracking-tighter">Ref: {job.jo_number}</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                   <img src={`https://chart.googleapis.com/chart?cht=qr&chl=${job.jo_number}&chs=80x80&chld=L|0`} className="w-12 h-12 grayscale opacity-50" />
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-[1.5rem] p-5 border border-slate-100 shadow-sm">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Primary Unit</p>
                   <p className="text-xl font-black italic text-[#1E293B] uppercase leading-tight">{job.fleet.plate_number}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">{job.work_order_item.truck_type}</p>
                </div>
                <div className="bg-slate-50 rounded-[1.5rem] p-5 border border-slate-100 shadow-sm">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Execution Node</p>
                   <p className="text-xl font-black italic text-[#1E293B] uppercase leading-tight">
                      {new Date(job.work_order.execution_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">
                      {new Date(job.work_order.execution_date).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                   </p>
                </div>
             </div>
          </div>

          {/* Logistics Route Section */}
          <div className="space-y-4">
             {/* Origin */}
             <div className="bg-white border border-slate-200 rounded-[2.2rem] p-7 shadow-sm flex items-center gap-6 group hover:border-orange-500/30 transition-all">
                <div className="w-14 h-14 bg-orange-50 rounded-[1.4rem] flex items-center justify-center text-[#FF6B00]">
                   <MapPin className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1 flex items-center gap-2">Origin Collection Point</p>
                   <h3 className="text-xl font-black italic text-[#1E293B] uppercase truncate leading-tight mb-1">{job.work_order_item.origin_location.name}</h3>
                   <p className="text-[11px] font-bold text-slate-400 line-clamp-1">{job.work_order_item.origin_location.address}</p>
                </div>
                <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.work_order_item.origin_location.address)}`, "_blank")} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 hover:text-orange-500 transition-all">
                   <Navigation className="w-5 h-5" />
                </button>
             </div>

             <div className="px-10 py-2 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <ArrowRight className="w-4 h-4 text-slate-300 rotate-90" />
                <div className="h-px flex-1 bg-slate-200" />
             </div>

             {/* Destination */}
             <div className="bg-white border border-slate-200 rounded-[2.2rem] p-7 shadow-sm flex items-center gap-6 group hover:border-blue-500/30 transition-all">
                <div className="w-14 h-14 bg-blue-50 rounded-[1.4rem] flex items-center justify-center text-blue-600">
                   <MapIcon className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 flex items-center gap-2">Final Delivery Node</p>
                   <h3 className="text-xl font-black italic text-[#1E293B] uppercase truncate leading-tight mb-1">{job.work_order_item.destination_location.name}</h3>
                   <p className="text-[11px] font-bold text-slate-400 line-clamp-1">{job.work_order_item.destination_location.address}</p>
                </div>
                <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.work_order_item.destination_location.address)}`, "_blank")} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 hover:text-blue-500 transition-all">
                   <Navigation className="w-5 h-5" />
                </button>
             </div>
          </div>

          {/* Mission Progress Feed */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
             <div className="flex items-center justify-between mb-10">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                   <Activity className="w-4 h-4 text-[#FF6B00]" /> Mission Timeline
                </h4>
             </div>
             
             <div className="space-y-4 relative">
                <div className="absolute left-[19px] top-4 bottom-4 w-px bg-slate-200" />
                {statusSteps.map((step, idx) => {
                   const isCompleted = idx <= currentStatusIndex;
                   const isCurrent = idx === currentStatusIndex;
                   return (
                      <div key={step.key} className={`flex items-start gap-10 relative transition-all duration-700 ${!isCompleted ? 'opacity-30 grayscale' : ''}`}>
                         <div className={`w-10 h-10 rounded-2xl flex items-center justify-center z-10 transition-all ${isCompleted ? `${step.bg} text-white shadow-lg` : 'bg-slate-100 text-slate-300 border border-slate-200'}`}>
                            <step.icon className="w-5 h-5" />
                         </div>
                         <div className="pt-2">
                            <p className="text-[11px] font-black uppercase tracking-widest text-[#1E293B] italic">{step.label}</p>
                            {isCurrent && <p className="text-[9px] font-black text-orange-500 uppercase animate-pulse mt-0.5 tracking-tighter">Current Status</p>}
                         </div>
                      </div>
                   );
                })}
             </div>
          </div>

          {/* Operational Evidence Grid */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 italic">Evidence Files</h4>
                <div className="flex gap-2">
                   <button onClick={() => { setUploadType("foto_kejadian"); setShowUploadModal(true); }} className="px-4 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" /> Incident
                   </button>
                   <button onClick={() => { setUploadType("surat_jalan"); setShowUploadModal(true); }} className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all">
                      <Upload className="w-4 h-4 text-slate-400" />
                   </button>
                </div>
             </div>
             
             <div className="grid grid-cols-4 gap-4">
                {job.documents?.length > 0 ? (
                  job.documents.map((doc: any) => (
                    <a key={doc.id} href={doc.file_url} target="_blank" className="aspect-square bg-slate-50 border border-slate-200 rounded-[1.2rem] overflow-hidden group relative">
                       <img src={doc.file_url} className="w-full h-full object-cover group-hover:scale-110 transition-all" />
                       <div className="absolute inset-0 bg-[#1E293B]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <ExternalLink className="w-5 h-5 text-white" />
                       </div>
                    </a>
                  ))
                ) : (
                  <div className="col-span-full py-8 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                     <ImageIcon className="w-8 h-8 opacity-20 mb-2" />
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-30">No Data Logs</p>
                  </div>
                )}
             </div>
          </div>
      </main>

      {/* 🚀 ATLAS STICKY ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-[200] md:pb-10">
         <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur-3xl border border-slate-200 rounded-[2.8rem] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.1)] flex items-center gap-4">
            
            <div className="flex-1">
               {job.status === 'assigned' && (
                 <button onClick={() => updateStatus('accepted')} disabled={updating} className="w-full h-18 bg-[#1E293B] hover:bg-slate-800 text-white rounded-[1.8rem] font-black italic uppercase tracking-widest text-[13px] transition-all flex items-center justify-center gap-4 active:scale-95 shadow-xl shadow-slate-900/10">
                    {updating ? <Loader2 className="animate-spin w-5 h-5" /> : <>PERSONNEL READY <ChevronRight className="w-5 h-5" /></>}
                 </button>
               )}
               {job.status === 'accepted' && (
                 <button onClick={() => updateStatus('picking_up')} disabled={updating} className="w-full h-18 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.8rem] font-black italic uppercase tracking-widest text-[13px] transition-all flex items-center justify-center gap-4 active:scale-95 shadow-xl shadow-indigo-600/10">
                    {updating ? <Loader2 className="animate-spin w-5 h-5" /> : <>EN ROUTE TO ORIGIN <Navigation className="w-5 h-5" /></>}
                 </button>
               )}
               {job.status === 'picking_up' && (
                 <button onClick={() => updateStatus('delivering')} disabled={updating} className="w-full h-18 bg-[#FF6B00] hover:bg-orange-500 text-white rounded-[1.8rem] font-black italic uppercase tracking-widest text-[13px] transition-all flex items-center justify-center gap-4 active:scale-95 shadow-xl shadow-orange-500/10">
                    {updating ? <Loader2 className="animate-spin w-5 h-5" /> : <>START MISSION <Truck className="w-5 h-5" /></>}
                 </button>
               )}
               {job.status === 'delivering' && (
                  <div className="flex flex-col gap-3">
                     {!job.documents.some(d => d.doc_type === 'pod') ? (
                       <button onClick={() => { setUploadType("pod"); setShowUploadModal(true); }} className="w-full h-18 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.8rem] font-black italic uppercase tracking-widest text-[12px] transition-all flex flex-col items-center justify-center shadow-xl shadow-blue-600/10">
                          <span className="flex items-center gap-3 leading-none mb-0.5"><ScanLine className="w-5 h-5" /> LOG EVIDENCE</span>
                          <span className="text-[8px] font-black uppercase opacity-60">Collect Signature / Goods Photo First</span>
                       </button>
                     ) : (
                       <button onClick={() => updateStatus('delivered')} disabled={updating} className="w-full h-18 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.8rem] font-black italic uppercase tracking-widest text-[13px] transition-all flex items-center justify-center gap-4 shadow-xl shadow-emerald-600/10 active:scale-95 animate-pulse">
                          {updating ? <Loader2 className="animate-spin w-5 h-5" /> : <>FINALIZE SUCCESS <CheckCircle2 className="w-5 h-5" /></>}
                       </button>
                     )}
                  </div>
               )}
               {job.status === 'delivered' && (
                 <div className="w-full h-18 bg-emerald-50 border-2 border-emerald-100 rounded-[1.8rem] flex items-center justify-center gap-4">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-600 italic">Mission Completed Safely</span>
                 </div>
               )}
            </div>

            <a href={`https://wa.me/6281211110515?text=Halo%20Admin%20Sentralogis...`} target="_blank" className="w-18 h-18 bg-slate-50 border border-slate-200 rounded-[1.8rem] flex items-center justify-center text-slate-400 hover:text-[#25D366] transition-all">
               <MessageSquare className="w-7 h-7" />
            </a>
         </div>
      </div>

      {/* 📸 MODAL UPLOAD ATLAS Era */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[500] flex items-end md:items-center justify-center p-6">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowUploadModal(false)} />
           <div className="relative bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl border border-slate-100 animate-in slide-in-from-bottom duration-500">
               <button onClick={() => setShowUploadModal(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-600 transition-all"><X className="w-8 h-8" /></button>
               
               <h3 className="text-3xl font-black italic uppercase tracking-tighter text-[#1E293B] mb-2 leading-none">DATA CAPTURE</h3>
               <p className="text-slate-400 text-xs font-bold mb-10 uppercase tracking-tight">Logging operational evidence for billing protocol.</p>

               <label className={`w-full h-64 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all mb-10 cursor-pointer ${fileToUpload ? 'border-emerald-500 bg-emerald-50/50 text-emerald-600' : 'border-slate-200 bg-slate-50/50 text-slate-400 hover:bg-slate-100'}`}>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && setFileToUpload(e.target.files[0])} />
                  <div className="w-16 h-16 bg-white border border-current/20 rounded-2xl flex items-center justify-center shadow-sm">
                     <ImageIcon className="w-7 h-7" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em]">{fileToUpload ? fileToUpload.name : 'Take Photo / Device Gallery'}</p>
               </label>

               <div className="flex gap-4">
                  <button onClick={() => setShowUploadModal(false)} className="flex-1 py-5 text-slate-400 font-black uppercase text-[11px] tracking-widest">Acknowledge</button>
                  <button onClick={handleUpload} disabled={isUploading || !fileToUpload} className="flex-1 bg-[#1E293B] hover:bg-[#FF6B00] text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-900/10 active:scale-95">
                     {isUploading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Submit Evidence"}
                  </button>
               </div>
           </div>
        </div>
      )}
    </div>
  );
}