"use client";
// @ts-nocheck

import { useEffect, useState } from "react";
import { supabase as supabaseRaw } from "@/lib/supabase/client";
const supabase = supabaseRaw as any;
import { toast, Toaster } from "react-hot-toast";
import {
  Building2, Users, Search, Plus, X, Edit2, Trash2, 
  Phone, MapPin, Globe, CreditCard, ShieldCheck, 
  ChevronRight, Filter, Briefcase, Truck, FileText,
  UserPlus, Factory, HardHat, Package, CheckCircle2,
  AlertCircle, RefreshCw, LayoutGrid, Wallet, History
} from "lucide-react";


type EntityType = 'vendor' | 'customer';

export default function EntityHubPage() {
  const [activeTab, setActiveTab] = useState<EntityType>('vendor');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  
  // Data State
  const [vendors, setVendors] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({
    name: "",
    company_name: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    zipcode: "",
    type: "vendor", // for companies table
    tax_id_number: "",
    use_ppn: false,
    pph_rate: 2,
    pic_name: "",
    pic_phone: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Vendors (from companies table)
      const { data: vData, error: vError } = await supabase
        // @ts-ignore
        .from('companies')
        .select('*')
        .eq('type', 'vendor')
        .order('name');
      
      if (vError) throw vError;
      setVendors(vData || []);

      // Fetch Customers
      const { data: cData, error: cError } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      
      if (cError) throw cError;
      setCustomers(cData || []);
    } catch (error: any) {
      toast.error("Gagal memuat data entitas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const protectRoute = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, sbu_access')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'superadmin') {
        toast.error("Akses Terbatas: Hanya Superadmin yang punya kendali atas Master Entities.");
        if (profile?.role === 'admin_sbu' && profile.sbu_access?.includes('trucking')) {
          window.location.href = "/sbu/trucking";
        } else {
          window.location.href = "/sbu-launchpad";
        }
      }
    };

    protectRoute();
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      company_name: "",
      phone: "",
      address: "",
      city: "",
      province: "",
      zipcode: "",
      type: "vendor",
      tax_id_number: "",
      use_ppn: false,
      pph_rate: 2,
      pic_name: "",
      pic_phone: "",
    });
    setEditingId(null);
    setShowModal(false);
  };

  const handleSave = async () => {
    if (!formData.name && !formData.company_name) return toast.error("Nama wajib diisi");
    
    try {
      const table = activeTab === 'vendor' ? 'companies' : 'customers';
      const payload = { ...formData };
      
      // Filter out fields not in specific tables if needed, 
      // but for POC let's assume they mostly align or handle gracefully
      
      if (editingId) {
        const { error } = await supabase
          // @ts-ignore
          .from(table).update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success("Data berhasil diperbarui");
      } else {
        const { error } = await supabase
          // @ts-ignore
          .from(table).insert(payload);
        if (error) throw error;
        toast.success("Entitas baru ditambahkan");
      }
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error("Gagal menyimpan data");
    }
  };

  const filteredData = activeTab === 'vendor' 
    ? vendors.filter(v => `${v.name} ${v.company_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
    : customers.filter(c => `${c.name} ${c.company_name}`.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#050a18] text-slate-200 p-8 pb-32 relative overflow-hidden">
      <Toaster position="top-right" />

      {/* Decorative Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
           <div>
              <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
                 <Building2 className="w-12 h-12 text-blue-500" /> SBU Entity Hub
              </h1>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3 flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4 text-emerald-500" /> Master Partner & Client Management
              </p>
           </div>
           
           <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                 <input 
                   type="text"
                   placeholder={`Search ${activeTab}s...`}
                   className="w-full bg-[#151f32]/60 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-[11px] font-black uppercase tracking-widest focus:border-blue-500/50 transition-all outline-none"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
              <button 
                onClick={() => setShowModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center gap-3"
              >
                 <Plus className="w-4 h-4" /> Add {activeTab}
              </button>
           </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#151f32]/40 p-2 rounded-[2rem] border border-white/5 w-fit mb-10">
           <button 
             onClick={() => setActiveTab('vendor')}
             className={`px-10 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'vendor' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
           >
              Vendor Profile
           </button>
           <button 
             onClick={() => setActiveTab('customer')}
             className={`px-10 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'customer' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
           >
              Customer Ledger
           </button>
        </div>

        {/* Grid Display */}
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4">
             <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
             <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Synchronizing Matrix Data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {filteredData.map((item) => (
               <div 
                 key={item.id}
                 className="group bg-[#151f32]/60 backdrop-blur-2xl border border-white/5 p-8 rounded-[2.5rem] hover:border-white/20 transition-all relative overflow-hidden"
               >
                  <div className={`absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity`}>
                     {activeTab === 'vendor' ? <Factory className="w-32 h-32" /> : <Users className="w-32 h-32" />}
                  </div>

                  <div className="relative z-10">
                     <div className="flex justify-between items-start mb-8">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${activeTab === 'vendor' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'}`}>
                           {activeTab === 'vendor' ? <Truck className="w-7 h-7" /> : <Users className="w-7 h-7" />}
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                           <button 
                             onClick={() => { setEditingId(item.id); setFormData(item); setShowModal(true); }}
                             className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                           >
                              <Edit2 className="w-4 h-4" />
                           </button>
                           <button className="p-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all">
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     </div>

                     <div className="mb-8">
                        <h3 className="text-2xl font-black text-white italic tracking-tighter leading-tight line-clamp-1">{item.company_name || item.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                           <div className="w-2 h-2 rounded-full bg-emerald-500" />
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.pic_name || 'Generic Authorized'}</span>
                        </div>
                     </div>

                     <div className="space-y-3 py-6 border-t border-white/5">
                        <div className="flex items-center gap-3 text-slate-400">
                           <Phone className="w-3.5 h-3.5" />
                           <span className="text-[10px] font-bold uppercase tracking-widest">{item.phone || item.pic_phone || 'Unset'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400">
                           <MapPin className="w-3.5 h-3.5 shrink-0" />
                           <span className="text-[10px] font-bold uppercase tracking-widest line-clamp-1">{item.city || item.address || 'Global Hub'}</span>
                        </div>
                     </div>

                     <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                        <div className="flex gap-2">
                           {item.use_ppn && <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">Tax Enabled</span>}
                           {item.is_active !== false && <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">Verified</span>}
                        </div>
                        <button className="text-[10px] font-black text-blue-500 flex items-center gap-1 hover:gap-2 transition-all">
                           VIEW FILE <ChevronRight className="w-3 h-3" />
                        </button>
                     </div>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* Persistent Bottom Nav Overlay */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#0a0f1e]/80 backdrop-blur-2xl border-t border-white/5 p-4 pb-8 flex justify-around items-center z-50">
        <button onClick={() => window.location.href='/admin'} className="flex flex-col items-center gap-1.5 text-slate-600">
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Admin</span>
        </button>
        <button onClick={() => window.location.href='/sbu-launchpad'} className="flex flex-col items-center gap-1.5 text-slate-600">
            <RefreshCw className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-tighter">SBU HUB</span>
        </button>
        <div className="-mt-14 relative">
            <button onClick={fetchData} className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-xl text-white border-4 border-[#0a0f1e] active:scale-95 transition-all">
                <RefreshCw className={`w-8 h-8 ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>
        <button onClick={() => window.location.href='/finance'} className="flex flex-col items-center gap-1.5 text-slate-600">
            <Wallet className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Finance</span>
        </button>
        <button onClick={() => window.location.href='/finance?tab=reports'} className="flex flex-col items-center gap-1.5 text-slate-600">
            <History className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-tighter">History</span>
        </button>
      </nav>

      {/* Modal Profile Form */}
      {showModal && (
        <div className="fixed inset-0 bg-[#050a18]/95 backdrop-blur-2xl flex items-center justify-center z-[100] p-6">
           <div className="bg-[#151f32] border border-white/10 rounded-[3.5rem] p-12 w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
              <button onClick={resetForm} className="absolute top-10 right-10 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all">
                 <X className="w-8 h-8" />
              </button>

              <div className="mb-12">
                 <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                   {editingId ? "Update Identity" : "Establish New Entry"}
                 </h2>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-3">Personnel & Financial Data Initialization</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                 {/* Left Column: Basic Info */}
                 <div className="space-y-8">
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Entity Primary Name</label>
                       <input 
                         type="text"
                         className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                         placeholder="Legal Corporate Name"
                         value={formData.company_name}
                         onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Operational Phone / Contact</label>
                       <input 
                         type="text"
                         className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                         placeholder="+62..."
                         value={formData.phone}
                         onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                       />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Full Physical Address</label>
                       <textarea 
                         className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all min-h-[120px]"
                         placeholder="Office Headquarters Location..."
                         value={formData.address}
                         onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div>
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 px-1">City</label>
                          <input 
                            type="text"
                            className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-xs font-bold text-white outline-none"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          />
                       </div>
                       <div>
                          <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 px-1">Province</label>
                          <input 
                            type="text"
                            className="w-full bg-black/20 border border-white/5 rounded-xl p-4 text-xs font-bold text-white outline-none"
                            value={formData.province}
                            onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                          />
                       </div>
                    </div>
                 </div>

                 {/* Right Column: Finance & PIC */}
                 <div className="space-y-8">
                    <div className="bg-white/3 border border-white/5 p-8 rounded-[2.5rem] space-y-8">
                       <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Finance & Taxation</h3>
                       
                       <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Tax ID (NPWP)</label>
                          <input 
                            type="text"
                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                            placeholder="00.000.000.0-000.000"
                            value={formData.tax_id_number}
                            onChange={(e) => setFormData({ ...formData, tax_id_number: e.target.value })}
                          />
                       </div>

                       <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                          <div>
                             <p className="text-[10px] font-black text-white uppercase tracking-widest">Enable PPN (11%)</p>
                             <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Automatic VAT Addition</p>
                          </div>
                          <button 
                            onClick={() => setFormData({ ...formData, use_ppn: !formData.use_ppn })}
                            className={`w-14 h-8 rounded-full transition-all relative ${formData.use_ppn ? 'bg-emerald-600' : 'bg-slate-800'}`}
                          >
                             <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.use_ppn ? 'right-1' : 'left-1'}`} />
                          </button>
                       </div>

                       <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">WHT Rate (PPh 23) %</label>
                          <input 
                            type="number"
                            className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all"
                            value={formData.pph_rate}
                            onChange={(e) => setFormData({ ...formData, pph_rate: Number(e.target.value) })}
                          />
                       </div>
                    </div>

                    <div className="p-8 bg-blue-600/5 border border-blue-500/10 rounded-[2.5rem]">
                       <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6 py-2 px-4 bg-blue-500/10 rounded-full w-fit">Authorized Contact Person</h3>
                       <div className="grid grid-cols-1 gap-6">
                          <input 
                            type="text"
                            className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-xs font-bold text-white outline-none"
                            placeholder="PIC Full Name"
                            value={formData.pic_name}
                            onChange={(e) => setFormData({ ...formData, pic_name: e.target.value })}
                          />
                          <input 
                            type="text"
                            className="w-full bg-white/5 border border-white/5 rounded-xl p-4 text-xs font-bold text-white outline-none"
                            placeholder="Direct Phone / WhatsApp"
                            value={formData.pic_phone}
                            onChange={(e) => setFormData({ ...formData, pic_phone: e.target.value })}
                          />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="mt-12 pt-12 border-t border-white/5 flex gap-6">
                 <button 
                   onClick={handleSave}
                   className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-blue-500/30 active:scale-95 flex items-center justify-center gap-4"
                 >
                    <ShieldCheck className="w-6 h-6" /> {editingId ? "Update Authentication" : "Commit Entity"}
                 </button>
                 <button 
                   onClick={resetForm}
                   className="flex-1 bg-white/5 hover:bg-white/10 text-slate-500 py-6 rounded-[2rem] text-sm font-black uppercase tracking-widest transition-all"
                 >
                    Cancel
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
