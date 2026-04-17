"use client";

import { useEffect, useState, use } from "react";
import { toast, Toaster } from "react-hot-toast";
import {
  Truck, Package, MapPin, Calendar, 
  ChevronRight, Loader2, CheckCircle2, 
  Circle, Clock, Phone, MessageSquare,
  Upload, Navigation, Receipt, Image as ImageIcon,
  Map as MapIcon, ExternalLink, AlertTriangle, ArrowRight, RefreshCw, Crosshair, Printer, Save
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
// MAIN COMPONENT
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

  // Fetch JO Data
  const fetchJobData = async (activeToken: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/jo/${activeToken}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Gagal memuat data");
      
      setJob(data);
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get Location helper (promise)
  const getCurrentLocation = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve(`${position.coords.latitude}, ${position.coords.longitude}`);
        },
        (error) => {
          console.warn("Location error:", error);
          resolve(null); // Continue without location if user denies
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  // Update Status
  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const location = await getCurrentLocation();
      
      const res = await fetch(`/api/jo/${token}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({ status: newStatus, location }),
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal update status");
      
      toast.success("Status berhasil diperbarui");
      fetchJobData(token);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  // Accept Job
  const acceptJob = () => updateStatus('accepted');

  // Trigger Panic / Incident
  const handlePanic = async () => {
    const confirm = window.confirm("Peringatan: Tekan OK untuk mengirim notifikasi darurat ke tim Admin/SBU!");
    if (!confirm) return;
    
    setUpdating(true);
    try {
      const location = await getCurrentLocation();
      const res = await fetch(`/api/jo/${token}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true"
        },
        body: JSON.stringify({ status: "incident", location }),
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal mengirim panic alert");
      
      toast.error("Panic Alert Dikirim - Admin sedang mengecek!");
      fetchJobData(token);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  // Upload Document
  const handleUpload = async () => {
    if (!fileToUpload) {
      toast.error("Pilih file terlebih dahulu");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("doc_type", uploadType);

      const res = await fetch(`/api/jo/${token}`, {
        method: "POST",
        headers: {
          "ngrok-skip-browser-warning": "true" // For FormData APIs
        },
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal upload dokumen");

      toast.success("Dokumen berhasil diunggah!");
      setShowUploadModal(false);
      setFileToUpload(null);
      
      toast.success("Dokumen berhasil diunggah!");
      setShowUploadModal(false);
      setFileToUpload(null);
      fetchJobData(token);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
    }
  };

  useEffect(() => {
    if (token) {
      fetchJobData(token);
    } else {
      // Safety net: if token is truly missing after mount, stop loading
      const timer = setTimeout(() => {
         setLoading(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-emerald-500/70 font-black uppercase text-[10px] tracking-widest animate-pulse">Syncing Mission Data...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e] p-6">
        <div className="bg-[#151f32]/80 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] max-w-md w-full text-center shadow-2xl">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">Job Not Found</h1>
          <p className="text-slate-500 text-sm font-bold mb-8">Access link may have expired or the token is definitely incorrect.</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-white text-slate-950 font-black text-xs uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-white/5 active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const openInMaps = (address: string) => {
    const encoded = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, "_blank");
  };

  const statusSteps = [
    { key: "assigned", label: "Ditugaskan", icon: Clock, color: "text-amber-500", bg: "bg-amber-500" },
    { key: "accepted", label: "Diterima", icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500" },
    { key: "picking_up", label: "Pickup", icon: Navigation, color: "text-indigo-500", bg: "bg-indigo-500" },
    { key: "delivering", label: "Pengiriman", icon: Truck, color: "text-blue-500", bg: "bg-blue-500" },
    { key: "delivered", label: "Selesai", icon: Package, color: "text-emerald-500", bg: "bg-emerald-500" },
  ];

  const currentStatusIndex = statusSteps.findIndex(s => s.key === job.status);

  // Job Completed View
  if (job.status === 'delivered') {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-slate-200 font-sans flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <Toaster position="top-center" />
        
        {/* Success Background Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]" />
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
        </div>

        <div className="relative z-10 w-full max-w-md text-center">
            {/* Hero Success Icon */}
            <div className="relative mb-8 w-32 h-32 mx-auto">
                <div className="absolute inset-0 bg-emerald-500 rounded-[2.5rem] blur-2xl opacity-20 animate-pulse" />
                <div className="relative w-full h-full bg-emerald-500 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)] border border-white/20">
                    <CheckCircle2 className="w-16 h-16 text-white" />
                </div>
            </div>

            <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">MISI SELESAI!</h1>
            <p className="text-emerald-500 font-black text-xs uppercase tracking-[0.3em] mb-10">Job Done Successfully</p>

            <div className="bg-[#151f32]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 space-y-6 mb-10 shadow-2xl">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Job ID</p>
                    <p className="text-sm font-black text-white tracking-widest">#{job.jo_number}</p>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Driver</p>
                    <p className="text-sm font-black text-white uppercase">{job.fleet.driver_name}</p>
                </div>
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Destination Status</p>
                    <div className="bg-emerald-500/20 text-emerald-400 py-3 rounded-2xl border border-emerald-500/30 flex items-center justify-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">{job.work_order_item.destination_location.city} DELIVERED</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full bg-white text-slate-950 font-black text-xs uppercase tracking-widest py-5 rounded-2xl transition-all shadow-xl shadow-white/5 active:scale-95 flex items-center justify-center gap-3"
                >
                  <RefreshCw className="w-4 h-4" /> Refresh Job Status
                </button>
                
                <a 
                  href={`https://wa.me/6281211110515?text=Halo%20Admin%2C%20saya%20${job.fleet.driver_name}%20telah%20menyelesaikan%20JO%20${job.jo_number}...`}
                  target="_blank"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest py-5 rounded-2xl transition-all shadow-xl shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-3"
                >
                  <MessageSquare className="w-4 h-4" /> Hubungi Admin
                </a>
            </div>

            <div className="mt-12 text-slate-600">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] leading-relaxed">
                    Terima kasih atas kerja kerasnya!<br />
                    Harap istirahat sebentar sebelum misi berikutnya.
                </p>
            </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-200 font-sans selection:bg-emerald-500/30 pb-32">
      <Toaster position="top-center" />
      
      {/* Dynamic Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] -ml-24 -mb-24" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-6 md:py-12">
        {/* Top Branding / Logo */}
        <div className="flex items-center justify-between mb-8 px-4 font-black italic tracking-tighter uppercase">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20 rotate-3">
                <Truck className="w-5 h-5 text-white -rotate-3" />
              </div>
               <span className="text-xl text-white">SentraLogis</span>
           </div>
           <div className="flex items-center gap-3">
              <button 
                onClick={() => fetchJobData(token)}
                className="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-slate-400 transition-all active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <div className="text-[10px] text-slate-500 tracking-[0.2em] hidden sm:block">Live Tracking</div>
           </div>
        </div>

        {/* Hero Card: Job Status */}
        <div className="bg-[#151f32]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 mb-6 shadow-[0_0_30px_rgba(16,185,129,0.05)] ring-1 ring-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
          
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.3em] mb-1">Job Order</p>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase italic">{job.jo_number}</h1>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md border shadow-lg ${
                job.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                job.status === 'assigned' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
                'bg-blue-500/20 text-blue-400 border-blue-500/30 shadow-blue-500/10'
              }`}>
                {job.status.replace('_', ' ')}
              </div>
              <div className="bg-white p-1 rounded-lg shadow-xl shadow-black/20 ring-1 ring-white/20">
                <img 
                  src={`https://chart.googleapis.com/chart?cht=qr&chl=${job.jo_number}&chs=60x60&chld=L|0`} 
                  alt="QR"
                  className="w-10 h-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0a0f1e]/60 backdrop-blur-md rounded-[1.5rem] p-4 border border-white/10 transition-all group-hover:border-emerald-500/20 shadow-inner">
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Truck className="w-3 h-3" /> Unit
              </p>
              <p className="text-white font-black text-base tracking-tight truncate">{job.fleet.plate_number}</p>
              <p className="text-slate-400 text-[9px] font-bold uppercase truncate">{job.work_order_item.truck_type}</p>
            </div>
            <div className="bg-[#0a0f1e]/60 backdrop-blur-md rounded-[1.5rem] p-4 border border-white/10 transition-all group-hover:border-blue-500/20 shadow-inner">
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Execution
              </p>
              <p className="text-white font-black text-base tracking-tight">
                {new Date(job.work_order.execution_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-slate-400 text-[9px] font-bold uppercase">
                {new Date(job.work_order.execution_date).toLocaleDateString([], { day: '2-digit', month: 'short' })}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Section: From -> To */}
        <div className="space-y-4 mb-10">
          {/* Pickup */}
          <div className="bg-[#151f32]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-7 shadow-[0_0_20px_rgba(16,185,129,0.03)] group hover:border-emerald-500/30 transition-all duration-500">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-inner">
                <MapPin className="w-6 h-6 text-emerald-500" />
              </div>
              <button 
                onClick={() => openInMaps(job.work_order_item.origin_location.address)}
                className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                <Navigation className="w-3 h-3" /> Navigasi
              </button>
            </div>
            <div className="text-emerald-500/60 text-[10px] uppercase font-black tracking-[0.2em] mb-2 flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Asal Penjemputan
            </div>
            <h3 className="text-lg md:text-xl font-black text-white mb-2 tracking-tight leading-tight italic uppercase">{job.work_order_item.origin_location.name}</h3>
            <p className="text-slate-500 text-xs font-bold leading-relaxed">{job.work_order_item.origin_location.address}</p>
          </div>

          <div className="flex justify-center -my-6 relative z-10">
             <div className="w-12 h-12 bg-[#0a0f1e] border border-white/10 rounded-full flex items-center justify-center shadow-2xl shadow-black">
                <ArrowRight className="w-5 h-5 text-slate-600 rotate-90" />
             </div>
          </div>

          {/* Destination */}
          <div className="bg-[#151f32]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-7 shadow-[0_0_20px_rgba(59,130,246,0.03)] group hover:border-blue-500/30 transition-all duration-500">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-inner">
                <MapIcon className="w-6 h-6 text-blue-500" />
              </div>
              <button 
                onClick={() => openInMaps(job.work_order_item.destination_location.address)}
                className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                <Navigation className="w-3 h-3" /> Navigasi
              </button>
            </div>
            <div className="text-blue-500/60 text-[10px] uppercase font-black tracking-[0.2em] mb-2 flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Tujuan Dropoff
            </div>
            <h3 className="text-lg md:text-xl font-black text-white mb-2 tracking-tight leading-tight italic uppercase">{job.work_order_item.destination_location.name}</h3>
            <p className="text-slate-500 text-xs font-bold leading-relaxed">{job.work_order_item.destination_location.address}</p>
          </div>
        </div>

        {/* Progress Tracker (Mobile Optimized) */}
        <div className="bg-[#151f32]/30 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 mb-8 shadow-inner ring-1 ring-white/5">
           <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
              <div className="w-4 h-0.5 bg-emerald-500" /> Milestone Tracking
           </h2>
           
           <div className="space-y-0 relative">
              {/* Connecting Line */}
              <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-slate-800" />
              
              {statusSteps.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = idx <= currentStatusIndex;
                const isCurrent = idx === currentStatusIndex;
                const isPast = idx < currentStatusIndex;

                return (
                  <div key={step.key} className="flex gap-6 mb-8 last:mb-0 relative">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-700 z-10 ${
                      isCompleted ? `${step.bg} border-transparent text-white shadow-xl shadow-${step.key}-500/20` : 
                      'bg-slate-900 border-white/5 text-slate-700'
                    } ${isCurrent ? 'scale-110 ring-8 ring-white/5' : 'scale-90 opacity-50'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className={`pt-1 transition-all duration-500 ${isCurrent ? 'translate-x-2' : ''}`}>
                      <p className={`text-xs font-black uppercase tracking-widest transition-all ${isCompleted ? 'text-white' : 'text-slate-700'}`}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className={`text-[9px] font-bold uppercase mt-1 animate-pulse ${step.color}`}>Active Mission</p>
                      )}
                      {isPast && (
                        <p className="text-emerald-500/40 text-[9px] font-bold uppercase mt-1 flex items-center gap-1">
                          <CheckCircle2 className="w-2 h-2" /> Verified
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
           </div>
        </div>

        {/* Documents & Catatan */}
        <div className="bg-[#151f32]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 mb-32 shadow-[0_0_20px_rgba(0,0,0,0.5),0_0_20px_rgba(59,130,246,0.02)]">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational File</h3>
           <div className="flex items-center gap-3">
              <button 
                onClick={() => { setUploadType("foto_kejadian"); setShowUploadModal(true); }}
                className="h-10 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl flex items-center justify-center text-rose-500 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest gap-2"
                title="Lapor Kejadian/Insiden"
              >
                <AlertTriangle className="w-4 h-4" /> Insiden
              </button>
              <button 
                onClick={() => { setUploadType("surat_jalan"); setShowUploadModal(true); }}
                className="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-white transition-all active:scale-90"
              >
                <Upload className="w-4 h-4" />
              </button>
           </div>
           </div>
           
           <div className="bg-slate-950/50 rounded-2xl p-4 border border-white/5 mb-6">
              <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-2">Internal Note</p>
              <p className="text-xs text-slate-400 font-bold italic leading-relaxed">
                {job.work_order.notes || "No special instructions provided by admin."}
              </p>
           </div>

           <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {job.documents && job.documents.length > 0 ? (
                job.documents.map((doc: any) => (
                  <div key={doc.id} className="flex-shrink-0 w-24 h-24 bg-slate-800 rounded-2xl overflow-hidden border border-white/10 relative group">
                    <img src={doc.file_url} alt={doc.doc_type} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full h-24 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center">
                   <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest">No Documents Uploaded</p>
                </div>
              )}
           </div>
        </div>

        {/* Sticky Action Bar (Optimized for one-hand swipe/tap) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 z-[60] safe-area-bottom pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
             <div className="bg-[#151f32]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-3 shadow-[0_-20px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.05)] flex flex-col gap-3">
               
               {/* Contextual Action Button */}
               <div className="flex-1">
                  {job.status === 'assigned' && (
                    <button
                      onClick={acceptJob}
                      disabled={updating}
                      className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-4 group overflow-hidden relative"
                    >
                      {updating ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                        <>
                          <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                          TERIMA PEKERJAAN
                          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  )}

                  {job.status === 'accepted' && (
                    <button
                      onClick={() => updateStatus('picking_up')}
                      disabled={updating}
                      className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2"
                    >
                      {updating ? <Loader2 className="w-6 h-6 animate-spin" /> : 'MENUJU LOKASI PICKUP'}
                    </button>
                  )}

                  {job.status === 'picking_up' && (
                    <button
                      onClick={() => updateStatus('delivering')}
                      disabled={updating}
                      className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      {updating ? <Loader2 className="w-6 h-6 animate-spin" /> : 'MULAI PENGIRIMAN'}
                    </button>
                  )}

                  {job.status === 'delivering' && (
                    <div className="flex flex-col gap-3">
                       {!job.documents.some(d => d.doc_type === 'pod') ? (
                         <button
                           onClick={() => {
                             setUploadType("pod");
                             setShowUploadModal(true);
                           }}
                           disabled={updating}
                           className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex flex-col items-center justify-center"
                         >
                           <span className="flex items-center gap-2">
                             <Upload className="w-5 h-5" /> 
                             {job.work_order.billing_method === 'hardcopy' ? 'UPLOAD SCAN SURAT JALAN' : 'FOTO BARANG DITERIMA'}
                           </span>
                           <span className="text-[8px] opacity-60 mt-1 font-bold">WAJIB: AMBIL GAMBAR DAHULU SEBELUM SELESAI</span>
                         </button>
                       ) : (
                         <button
                           onClick={() => updateStatus('delivered')}
                           disabled={updating}
                           className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-4 animate-pulse"
                         >
                           {updating ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                             <>
                               <CheckCircle2 className="w-6 h-6" />
                               KONFIRMASI SELESAI
                             </>
                           )}
                         </button>
                       )}
                    </div>
                  )}

                  {job.status === 'delivered' && (
                    <div className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                       <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Job Successfully Completed</span>
                    </div>
                  )}

                  {/* Panic Button */}
                  {job.status !== 'delivered' && (
                    <button
                      onClick={handlePanic}
                      className="mt-4 w-full h-12 bg-rose-600/20 border border-rose-500/30 text-rose-500 hover:bg-rose-600 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Crosshair className="w-4 h-4" /> PANIC BUTTON - LAPOR ADMIN
                    </button>
                  )}
               </div>

               {/* Quick Support Button */}
               <a 
                href={`https://wa.me/6281211110515?text=Halo%20Admin%2C%20saya%20${job.fleet.driver_name}%20terkait%20JO%20${job.jo_number}%20ingin%20laporan...`}
                target="_blank"
                className="w-16 h-16 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-2xl flex items-center justify-center text-white transition-all shadow-xl active:scale-90 flex-shrink-0"
               >
                 <MessageSquare className="w-6 h-6" />
               </a>
             </div>
          </div>
        </div>
      </div>

      {/* Modern Backdrop Modal (Upload) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 transition-all duration-300">
          <div className="absolute inset-0 bg-[#0a0f1e]/90 backdrop-blur-md" onClick={() => setShowUploadModal(false)} />
          <div className="relative bg-[#151f32] border border-white/10 rounded-[3rem] w-full max-w-md p-10 shadow-[0_0_100px_rgba(0,0,0,1),0_0_30px_rgba(59,130,246,0.1)] animate-in slide-in-from-bottom-full duration-500">
            <div className="w-16 h-1 h-bg-slate-800 rounded-full mx-auto mb-8 md:hidden" />
            
            <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">
               {uploadType === 'pod' 
                 ? (job.work_order.billing_method === 'hardcopy' ? 'Scan Surat Jalan' : 'Foto Penerimaan') 
                 : 'Upload File'}
            </h3>
            <p className="text-slate-500 text-sm font-bold mb-8">
               {uploadType === 'pod' 
                 ? (job.work_order.billing_method === 'hardcopy' 
                     ? 'Gunakan kamera untuk memfoto Surat Jalan Fisik yang sudah memiliki TTD dan Stempel Basah.' 
                     : 'Ambil foto barang yang sudah sampai di tangan penerima di lokasi tujuan.') 
                 : 'Lampirkan file verifikasi operasional.'}
            </p>
            
            <input 
              type="file" 
              id="pod-upload-new" 
              className="hidden" 
              onChange={handleFileChange}
              accept="image/*,.pdf"
            />
            <label 
              htmlFor="pod-upload-new"
              className={`w-full h-56 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all mb-10 group ${
                fileToUpload ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5'
              }`}
            >
              <div className="w-16 h-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden relative">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500 to-transparent" />
                <Upload className={`w-6 h-6 relative z-10 transition-colors ${fileToUpload ? 'text-emerald-400' : 'text-emerald-500'}`} />
              </div>
              <p className="text-white font-black uppercase text-xs tracking-widest text-center px-6">
                {fileToUpload ? fileToUpload.name : 'Touch to Camera / Gallery'}
              </p>
              <p className="text-slate-600 text-[10px] font-bold">MAX SIZE 10MB • JPG, PNG, PDF</p>
            </label>

            <div className="flex gap-4">
              <button 
                onClick={() => { setShowUploadModal(false); setFileToUpload(null); }}
                disabled={isUploading}
                className="flex-1 bg-slate-950 hover:bg-slate-900 border border-white/5 text-slate-500 font-black uppercase tracking-widest text-[10px] py-5 rounded-2xl transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button 
                className="flex-1 bg-white hover:bg-slate-200 text-slate-950 font-black uppercase tracking-widest text-[10px] py-5 rounded-2xl shadow-xl shadow-white/10 transition-all disabled:bg-slate-800 disabled:text-slate-600"
                onClick={handleUpload}
                disabled={isUploading || !fileToUpload}
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Simpan Dokumen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}// Keep existing SVG functions as fallback if needed or remove if icon set is sufficient
function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function FileText(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}