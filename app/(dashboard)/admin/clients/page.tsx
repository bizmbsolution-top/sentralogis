"use client";

import { useEffect, useState, useRef } from "react";
import { supabase as supabaseRaw } from "@/lib/supabase/client";
const supabase = supabaseRaw as any;
import { toast, Toaster } from "react-hot-toast";
import { 
  Building2, Users, Wallet, Plus, Search, 
  ShieldCheck, MoreVertical, Trash2,
  Activity, TrendingUp, CreditCard,
  X, Save, RefreshCw, ChevronRight, Globe
} from "lucide-react";

type Organization = {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  pic_name: string | null;
  pic_phone: string | null;
  mission_credits: number;
  is_active: boolean;
  created_at: string;
};

export default function ClientControlCenter() {
  const [clients, setClients] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    email: "",
    pic_name: "",
    pic_phone: "",
    admin_email: "",
    admin_password: ""
  });
  const [updating, setUpdating] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast.error("Gagal sinkron data clients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (showModal && addressInputRef.current) {
      // Tunggu hingga elemen benar-benar render
      setTimeout(() => {
        if (!addressInputRef.current) return;
        autocompleteRef.current = new google.maps.places.Autocomplete(addressInputRef.current, {
          fields: ["formatted_address", "geometry"],
          componentRestrictions: { country: "id" }
        });

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current?.getPlace();
          if (place?.formatted_address) {
            setFormData(prev => ({ ...prev, address: place.formatted_address! }));
          }
        });
      }, 500);
    }
  }, [showModal]);

  const handleRegisterClient = async () => {
    if (!formData.name || !formData.admin_email || !formData.admin_password) {
      return toast.error("Nama, Email Admin, & Password wajib diisi.");
    }
    
    setUpdating(true);
    try {
      // 1. Create Organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{
          name: formData.name,
          address: formData.address,
          email: formData.email,
          pic_name: formData.pic_name,
          pic_phone: formData.pic_phone,
          is_active: true,
          mission_credits: 0
        }])
        .select()
        .single();
      
      if (orgError) throw orgError;

      // 2. Create Admin User Account (Trigger via API)
      const authResponse = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.admin_email,
          password: formData.admin_password,
          full_name: formData.pic_name,
          organization_id: org.id,
          role: 'admin'
        })
      });

      if (!authResponse.ok) {
        const err = await authResponse.json();
        throw new Error(err.message || "Gagal membuat akun admin.");
      }

      toast.success("Client & Admin berhasil terdaftar.");
      setShowModal(false);
      setFormData({ 
        name: "", address: "", email: "", 
        pic_name: "", pic_phone: "", 
        admin_email: "", admin_password: "" 
      });
      fetchClients();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm("Hapus client ini dari ekosistem? Data permanen tidak bisa dikembalikan.")) return;
    try {
      const { error } = await supabase.from('organizations').delete().eq('id', id);
      if (error) throw error;
      toast.success("Client berhasil dihapus.");
      fetchClients();
    } catch (error: any) {
      toast.error("Gagal hapus: " + error.message);
    }
  };

  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Organization | null>(null);
  const [topUpAmount, setTopUpAmount] = useState(0);

  const handleTopUp = async () => {
    if (!selectedClient || topUpAmount <= 0) return toast.error("Masukkan jumlah kredit yang valid.");
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ mission_credits: (selectedClient.mission_credits || 0) + topUpAmount })
        .eq('id', selectedClient.id);
      
      if (error) throw error;
      toast.success(`Berhasil menambah ${topUpAmount} kredit untuk ${selectedClient.name}`);
      setShowTopUpModal(false);
      setTopUpAmount(0);
      fetchClients();
    } catch (error: any) {
      toast.error("Gagal top-up: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.pic_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#05080F] text-white p-6 lg:p-12 font-sans selection:bg-emerald-500/30">
      <Toaster position="top-right" />

      {/* 🏛️ HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 ring-4 ring-white/5">
                <Globe className="w-8 h-8 text-white" />
             </div>
             <div>
                <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Client Control Center</h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Global Tenant Architecture Management</p>
             </div>
          </div>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="h-16 bg-white text-[#05080F] hover:bg-emerald-400 px-10 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-[0_20px_40px_rgba(255,255,255,0.05)] active:scale-95 flex items-center gap-4 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" /> Registrasi Client Baru
        </button>
      </div>

      {/* 🔘 STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
         {[
           { label: 'Total Clients', val: clients.length, icon: Building2, color: 'text-blue-500' },
           { label: 'Active Sessions', val: clients.filter(c => c.is_active).length, icon: Activity, color: 'text-emerald-500' },
           { label: 'Total Credits', val: clients.reduce((acc, c) => acc + (c.mission_credits || 0), 0), icon: Wallet, color: 'text-amber-500' },
           { label: 'Holding Revenue', val: 'Rp 0', icon: TrendingUp, color: 'text-rose-500' }
         ].map((stat, i) => (
           <div key={i} className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] flex flex-col gap-4 group hover:bg-slate-900 transition-all duration-500">
              <div className="flex justify-between items-start">
                 <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                 </div>
                 <div className="px-3 py-1 bg-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">Realtime</div>
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2">{stat.label}</p>
                 <p className="text-3xl font-black italic tracking-tighter">{stat.val}</p>
              </div>
           </div>
         ))}
      </div>

      {/* 🔍 SEARCH & FILTER */}
      <div className="relative mb-10 group max-w-[500px]">
         <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-white transition-colors" />
         <input 
            type="text" 
            placeholder="Cari client berdasarkan nama atau PIC..."
            className="w-full h-16 bg-slate-900/50 border border-white/5 rounded-[1.2rem] pl-16 pr-8 text-xs font-bold focus:bg-slate-900 focus:border-white/10 outline-none transition-all placeholder:text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      {/* 📊 CLIENT LIST GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {filteredClients.map((client) => (
           <div key={client.id} className="bg-slate-900/30 border border-white/5 rounded-[3.5rem] p-10 group hover:border-white/10 transition-all duration-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 blur-[80px] -mr-20 -mt-20 group-hover:bg-indigo-500/10 transition-all" />
              <div className="relative z-10">
                 <div className="flex justify-between items-start mb-10">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-white rounded-[1.8rem] flex items-center justify-center shadow-2xl p-3 overflow-hidden">
                          {client.logo_url ? (
                            <img src={client.logo_url} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            <Building2 className="w-8 h-8 text-[#05080F]" />
                          )}
                       </div>
                       <div>
                          <div className="flex items-center gap-3">
                             <h3 className="text-2xl font-black italic uppercase tracking-tighter line-clamp-1">{client.name}</h3>
                             {client.is_active && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                          </div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">Registered {new Date(client.created_at).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={() => handleDeleteClient(client.id)}
                         className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-500 transition-all text-slate-600"
                       >
                          <Trash2 className="w-5 h-5" />
                       </button>
                       <button className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors">
                          <MoreVertical className="w-5 h-5 text-slate-500" />
                       </button>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6 mb-10">
                    <div className="bg-white/5 p-6 rounded-[1.8rem] border border-white/5 space-y-2 group-hover:bg-white/[0.08] transition-all">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Mission Wallet</p>
                       <div className="flex items-center gap-3">
                          <Wallet className="w-4 h-4 text-amber-500" />
                          <span className="text-xl font-black italic tracking-tighter text-amber-500">{client.mission_credits} <span className="text-[10px] uppercase not-italic">Credits</span></span>
                       </div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-[1.8rem] border border-white/5 space-y-2 group-hover:bg-white/[0.08] transition-all">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Primary PIC</p>
                       <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="text-[11px] font-black uppercase tracking-tight line-clamp-1">{client.pic_name || 'System Auto'}</span>
                       </div>
                    </div>
                 </div>
                 <div className="flex flex-col md:flex-row gap-4">
                    <button 
                      onClick={() => { setSelectedClient(client); setShowTopUpModal(true); }}
                      className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                       <CreditCard className="w-4 h-4" /> Top-Up Credits
                    </button>
                    <button className="h-14 bg-white/5 border border-white/5 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center gap-3 transition-all active:scale-95">
                       View Metrics <ChevronRight className="w-3 h-3 text-slate-500" />
                    </button>
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* 🚀 REGISTRATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 overflow-y-auto">
           <div className="absolute inset-0 bg-[#05080F]/90 backdrop-blur-xl" onClick={() => setShowModal(false)} />
           <div className="relative w-full max-w-[800px] bg-slate-900 rounded-[4rem] border border-white/10 shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300 my-auto">
              <div className="p-12 space-y-12">
                 <div className="flex justify-between items-start">
                    <div>
                       <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none italic">New Tenant</h2>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-3">Inisialisasi Entitas Bisnis & Akun Utama</p>
                    </div>
                    <button onClick={() => setShowModal(false)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                       <X className="w-6 h-6" />
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <div className="flex items-center gap-3 mb-2 text-blue-500 uppercase font-black text-[10px] tracking-widest">
                          <Building2 className="w-4 h-4" /> Data Perusahaan
                       </div>
                       <input 
                         type="text" 
                         className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                         placeholder="Nama Perusahaan Resmi"
                         value={formData.name}
                         onChange={(e) => setFormData({...formData, name: e.target.value})}
                       />
                       <input 
                         ref={addressInputRef}
                         type="text" 
                         className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                         placeholder="Alamat (Auto-search Gmaps)"
                         value={formData.address}
                         onChange={(e) => setFormData({...formData, address: e.target.value})}
                       />
                       <input 
                         type="email" 
                         className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                         placeholder="Email Perusahaan"
                         value={formData.email}
                         onChange={(e) => setFormData({...formData, email: e.target.value})}
                       />
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center gap-3 mb-2 text-emerald-500 uppercase font-black text-[10px] tracking-widest">
                          <ShieldCheck className="w-4 h-4" /> Primary Admin Configuration
                       </div>
                       <input 
                         type="text" 
                         className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
                         placeholder="Nama PIC Admin"
                         value={formData.pic_name}
                         onChange={(e) => setFormData({...formData, pic_name: e.target.value})}
                       />
                       <input 
                         type="text" 
                         className="w-full h-14 bg-white/5 border border-white/5 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
                         placeholder="No. WA Admin (0812...)"
                         value={formData.pic_phone}
                         onChange={(e) => setFormData({...formData, pic_phone: e.target.value})}
                       />
                       <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                          <input 
                            type="email" 
                            className="w-full h-14 bg-white/10 border border-white/5 rounded-2xl px-6 text-[11px] font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
                            placeholder="Primary Admin Email Login"
                            value={formData.admin_email}
                            onChange={(e) => setFormData({...formData, admin_email: e.target.value})}
                          />
                          <input 
                            type="password" 
                            className="w-full h-14 bg-white/10 border border-white/5 rounded-2xl px-6 text-[11px] font-bold text-white outline-none focus:border-emerald-500/50 transition-all"
                            placeholder="Password"
                            value={formData.admin_password}
                            onChange={(e) => setFormData({...formData, admin_password: e.target.value})}
                          />
                       </div>
                    </div>
                 </div>

                 <button 
                   onClick={handleRegisterClient}
                   disabled={updating}
                   className="w-full h-20 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-[2.2rem] text-sm font-black uppercase tracking-[0.3em] italic flex items-center justify-center gap-4 transition-all shadow-2xl shadow-emerald-500/20"
                 >
                    {updating ? <RefreshCw className="animate-spin text-white" /> : <Save className="w-6 h-6" />}
                    Komit Registrasi & Create Akun Admin
                 </button>
              </div>
           </div>
        </div>
      )}
      {/* 💳 TOP-UP MODAL */}
      {showTopUpModal && selectedClient && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-[#05080F]/90 backdrop-blur-xl" onClick={() => setShowTopUpModal(false)} />
           <div className="relative w-full max-w-[500px] bg-slate-900 rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-10 space-y-8">
                 <div className="flex justify-between items-center">
                    <div>
                       <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-amber-500">Add Mission Credits</h2>
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">Injecting Fuel to {selectedClient.name}</p>
                    </div>
                    <button onClick={() => setShowTopUpModal(false)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all">
                       <X className="w-5 h-5" />
                    </button>
                 </div>

                 <div className="bg-white/5 p-8 rounded-3xl border border-white/5 text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Current Balance</p>
                    <p className="text-4xl font-black italic tracking-tighter text-white">{selectedClient.mission_credits} <span className="text-xs uppercase not-italic opacity-40">Credits</span></p>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Top-Up Amount (Tokens)</label>
                    <div className="relative group">
                       <Wallet className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-amber-500" />
                       <input 
                         type="number" 
                         className="w-full h-20 bg-white/5 border border-white/10 rounded-2xl pl-16 pr-8 text-3xl font-black italic text-white outline-none focus:border-amber-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                         placeholder="0"
                         value={topUpAmount || ''}
                         onChange={(e) => setTopUpAmount(parseInt(e.target.value) || 0)}
                       />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                       {[50, 100, 500].map(amt => (
                         <button 
                           key={amt}
                           onClick={() => setTopUpAmount(amt)}
                           className="py-3 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black hover:bg-amber-500 hover:text-black transition-all"
                         >
                           +{amt}
                         </button>
                       ))}
                    </div>
                 </div>

                 <button 
                   onClick={handleTopUp}
                   disabled={updating || topUpAmount <= 0}
                   className="w-full h-18 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-black rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-4 transition-all shadow-2xl shadow-amber-500/20 mt-4"
                 >
                    {updating ? <RefreshCw className="animate-spin" /> : <Save className="w-5 h-5" />}
                    Confirm & Deposit Credits
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
