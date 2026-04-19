"use client";

import { useEffect, useState } from "react";
import { supabase as supabaseRaw } from "@/lib/supabase/client";
const supabase = supabaseRaw as any;
import { toast, Toaster } from "react-hot-toast";
import {
  Building2, Users, Search, Plus, X, Edit2, Trash2, 
  Phone, MapPin, Globe, CreditCard, ShieldCheck, 
  ChevronRight, Filter, Briefcase, Truck, FileText,
  UserPlus, Factory, HardHat, Package, CheckCircle2,
  AlertCircle, RefreshCw, LayoutGrid, Wallet, History, Activity, ExternalLink
} from "lucide-react";

/**
 * ENTITY HUB: ATLAS MASTER DATA DIRECTORY
 * Fokus: Putih Bersih (Grey-Light), Atlas Typography, & High Density Information.
 */

type EntityType = 'vendor' | 'customer';

export default function EntityHubPage() {
  const [activeTab, setActiveTab] = useState<EntityType>('vendor');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  
  const [vendors, setVendors] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({
    name: "", company_name: "", phone: "", address: "",
    city: "", province: "", zipcode: "", type: "vendor",
    tax_id_number: "", use_ppn: false, pph_rate: 2,
    pic_name: "", pic_phone: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: vData, error: vError } = await supabase.from('companies').select('*').eq('type', 'vendor').order('name');
      if (vError) throw vError;
      setVendors(vData || []);

      const { data: cData, error: cError } = await supabase.from('customers').select('*').order('name');
      if (cError) throw cError;
      setCustomers(cData || []);
    } catch (error: any) {
      toast.error("Gagal sinkron data direktori");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const protectRoute = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data: profile } = await supabase.from('profiles').select('role, sbu_access').eq('id', user.id).single();
      if (profile?.role !== 'superadmin') {
        toast.error("Akses Terbatas: Hanya Superadmin yang punya kendali atas Master Entities.");
        window.location.href = "/sbu-launchpad";
      }
    };
    protectRoute();
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "", company_name: "", phone: "", address: "",
      city: "", province: "", zipcode: "", type: activeTab,
      tax_id_number: "", use_ppn: false, pph_rate: 2,
      pic_name: "", pic_phone: "",
    });
    setEditingId(null);
    setShowModal(false);
  };

  const handleSave = async () => {
    if (!formData.name && !formData.company_name) return toast.error("Identitas wajib diisi");
    try {
      const table = activeTab === 'vendor' ? 'companies' : 'customers';
      if (editingId) {
        const { error } = await supabase.from(table).update(formData).eq('id', editingId);
        if (error) throw error;
        toast.success("Identity Updated!");
      } else {
        const { error } = await supabase.from(table).insert(formData);
        if (error) throw error;
        toast.success("New Entity Registered!");
      }
      resetForm();
      fetchData();
    } catch (error: any) {
       toast.error("Gagal menyimpan: " + error.message);
    }
  };

  const filteredData = activeTab === 'vendor' 
    ? vendors.filter(v => `${v.name} ${v.company_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
    : customers.filter(c => `${c.name} ${c.company_name}`.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return (
     <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-12 h-12 text-slate-300 animate-spin" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Decrypting Matrix Directory...</p>
     </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#1E293B] font-sans pb-40">
      <Toaster position="top-right" />

      {/* 🏛️ ATLAS ENTITY HEADER */}
      <header className="sticky top-0 z-[100] bg-white border-b border-slate-200 px-8 py-6 flex flex-col md:flex-row justify-between items-center shadow-sm gap-6">
         <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-md">
               <Building2 className="w-7 h-7 text-[#1E293B]" />
            </div>
            <div>
               <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Global Entity Hub</h1>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" /> Authorized Master Data Control
               </p>
            </div>
         </div>

         <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#1E293B] transition-colors" />
                <input 
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  className="w-full h-14 pl-14 pr-6 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-[#1E293B] transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
                onClick={() => setShowModal(true)}
                className="h-14 bg-[#1E293B] hover:bg-orange-600 text-white px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center gap-3"
            >
                <Plus className="w-4 h-4" /> Add Entity
            </button>
         </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 lg:p-12 space-y-12">
          
          {/* 🔘 TAB SWITCHER ATLAS STYLE */}
          <div className="flex bg-white p-2 rounded-[2rem] border border-slate-200 w-fit shadow-sm">
             {[
               { id: 'vendor', label: 'Vendor Directory', icon: Factory },
               { id: 'customer', label: 'Client Ledger', icon: Users }
             ].map((tab) => (
               <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-10 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${
                   activeTab === tab.id ? 'bg-[#1E293B] text-white shadow-xl shadow-slate-900/10' : 'text-slate-400 hover:text-slate-600'
                }`}
               >
                 <tab.icon className="w-4 h-4" /> {tab.label}
               </button>
             ))}
          </div>

          {/* 📋 DIRECTORY GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {filteredData.map((item) => (
               <div key={item.id} className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-[0_15px_60px_rgba(0,0,0,0.02)] group hover:shadow-xl transition-all duration-500 relative overflow-hidden flex flex-col justify-between">
                  <div className="relative z-10">
                     <div className="flex justify-between items-start mb-10">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${activeTab === 'vendor' ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-blue-50 border-blue-100 text-blue-600'} shadow-sm`}>
                           {activeTab === 'vendor' ? <Truck className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                        </div>
                        <div className="flex gap-2">
                           <button 
                             onClick={() => { setEditingId(item.id); setFormData(item); setShowModal(true); }}
                             className="w-10 h-10 bg-slate-50 hover:bg-[#1E293B] hover:text-white rounded-xl flex items-center justify-center text-slate-400 transition-all border border-slate-100"
                           >
                              <Edit3 className="w-4 h-4" />
                           </button>
                        </div>
                     </div>

                     <div className="space-y-2 mb-10">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">{item.zipcode || 'Identity Verified'}</p>
                        <h3 className="text-3xl font-black italic text-[#1E293B] uppercase tracking-tighter leading-none group-hover:text-orange-600 transition-colors line-clamp-2">
                           {item.company_name || item.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-4 bg-slate-50 w-fit px-3 py-1.5 rounded-full border border-slate-100">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.pic_name || 'System Authorized'}</span>
                        </div>
                     </div>

                     <div className="space-y-4 py-8 border-t border-slate-50">
                        <div className="flex items-center gap-4 text-slate-500">
                           <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100"><Phone className="w-3.5 h-3.5" /></div>
                           <span className="text-[11px] font-black uppercase italic tracking-tight">{item.phone || item.pic_phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-4 text-slate-500">
                           <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100"><MapPin className="w-3.5 h-3.5" /></div>
                           <span className="text-[11px] font-black uppercase italic tracking-tight line-clamp-1">{item.city || 'Global Jurisdiction'}</span>
                        </div>
                     </div>
                  </div>

                  <div className="pt-8 border-t border-slate-50 flex justify-between items-center mt-auto">
                     <div className="flex gap-2">
                        {item.use_ppn && <span className="bg-emerald-50 px-3 py-1.5 rounded-lg text-[8px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100">Fiscal Ready</span>}
                        <span className="bg-slate-50 px-3 py-1.5 rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">Active Entity</span>
                     </div>
                     <button className="w-10 h-10 bg-slate-50 hover:bg-orange-600 hover:text-white rounded-full flex items-center justify-center text-slate-300 transition-all active:scale-90">
                        <ChevronRight className="w-5 h-5" />
                     </button>
                  </div>
               </div>
             ))}
          </div>
      </main>

      {/* 🚀 ENTITY FORM MODAL ATLAS STYLE */}
      {showModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 md:p-12">
           <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xl" onClick={resetForm} />
           <div className="relative bg-white rounded-[4rem] w-full max-w-5xl p-12 md:p-16 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-500">
              <button onClick={resetForm} className="absolute top-12 right-12 w-14 h-14 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 rounded-3xl flex items-center justify-center text-slate-400 transition-all shadow-inner">
                 <X className="w-8 h-8" />
              </button>

              <div className="mb-14">
                 <div className="flex items-center gap-4 mb-3">
                    <span className="text-[11px] font-black text-orange-500 uppercase tracking-widest italic">Identity initialization</span>
                    <div className="h-px w-20 bg-orange-500/30" />
                 </div>
                 <h2 className="text-4xl md:text-5xl font-black text-[#1E293B] italic uppercase tracking-tighter leading-none">
                   {editingId ? "Update Authentication" : "Register Global Entity"}
                 </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                 {/* Left: Identity & Loc */}
                 <div className="space-y-10">
                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 italic">Corporate Identity Name</label>
                       <div className="relative">
                          <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                          <input 
                            type="text"
                            className="w-full h-18 pl-16 pr-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-bold text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all"
                            placeholder="Legal Entity Name"
                            value={formData.company_name}
                            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          />
                       </div>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 italic">Operational Phone</label>
                       <div className="relative">
                          <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                          <input 
                            type="text"
                            className="w-full h-18 pl-16 pr-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-bold text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all"
                            placeholder="+62..."
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          />
                       </div>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 italic">Jurisdiction Address</label>
                       <textarea 
                         className="w-full min-h-[160px] p-8 bg-slate-50 border border-slate-200 rounded-[2.5rem] text-sm font-bold text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all"
                         placeholder="Corporate Headquarters Address..."
                         value={formData.address}
                         onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                       />
                    </div>
                 </div>

                 {/* Right: Finance & PIC */}
                 <div className="space-y-10">
                    <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-inner space-y-8">
                       <div className="flex justify-between items-center border-b border-slate-200 pb-6">
                          <h4 className="text-[11px] font-black text-[#1E293B] uppercase tracking-widest italic">Taxation Protocol</h4>
                          <ShieldCheck className="w-5 h-5 text-emerald-500" />
                       </div>
                       
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">NPWP Number</label>
                          <input 
                            type="text"
                            className="w-full h-16 px-6 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-[#1E293B] outline-none"
                            placeholder="00.000.000.0-000.000"
                            value={formData.tax_id_number}
                            onChange={(e) => setFormData({ ...formData, tax_id_number: e.target.value })}
                          />
                       </div>

                       <div className="flex items-center justify-between p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                          <div>
                             <p className="text-[11px] font-black text-[#1E293B] uppercase tracking-widest">Enable Fiscal PPN</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Global 11% Surcharge</p>
                          </div>
                          <button 
                            onClick={() => setFormData({ ...formData, use_ppn: !formData.use_ppn })}
                            className={`w-14 h-8 rounded-full transition-all relative ${formData.use_ppn ? 'bg-emerald-600' : 'bg-slate-200'}`}
                          >
                             <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.use_ppn ? 'right-1' : 'left-1'}`} />
                          </button>
                       </div>
                    </div>

                    <div className="p-10 border-2 border-dashed border-slate-200 rounded-[3rem] space-y-6">
                       <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-3">
                          <UserPlus className="w-4 h-4" /> Personnel Authentication
                       </h4>
                       <div className="space-y-4">
                          <input 
                            type="text"
                            className="w-full h-16 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-[#1E293B] outline-none"
                            placeholder="Authorized PIC Name"
                            value={formData.pic_name}
                            onChange={(e) => setFormData({ ...formData, pic_name: e.target.value })}
                          />
                          <input 
                            type="text"
                            className="w-full h-16 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-[#1E293B] outline-none"
                            placeholder="PIC Contact Number"
                            value={formData.pic_phone}
                            onChange={(e) => setFormData({ ...formData, pic_phone: e.target.value })}
                          />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="mt-16 pt-12 border-t border-slate-100 flex flex-col md:flex-row gap-6">
                 <button 
                   onClick={handleSave}
                   className="flex-[2] bg-[#1E293B] hover:bg-orange-600 text-white py-7 rounded-[2.5rem] text-sm font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-4"
                 >
                    <Save className="w-6 h-6" /> {editingId ? "Authorize Modification" : "Commit New Entity"}
                 </button>
                 <button 
                   onClick={resetForm}
                   className="flex-1 bg-slate-50 border border-slate-200 text-slate-400 py-7 rounded-[2.5rem] text-sm font-black uppercase tracking-widest hover:bg-white hover:text-rose-500 transition-all active:scale-95"
                 >
                    Abort Routine
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

const Loader2 = ({ className }: { className: string }) => (
    <RefreshCw className={className} />
);

const Edit3 = ({ className }: { className: string }) => (
    <Edit2 className={className} />
);
