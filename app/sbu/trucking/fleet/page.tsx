"use client";

import { useEffect, useState, useRef } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { useGoogleMaps } from "@/lib/google-maps-context";
import { createClient } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import {
  Truck, User, Search, Plus, X, Edit2, Trash2, 
  Phone, MapPin, Globe, CreditCard, ShieldCheck, 
  ChevronRight, Filter, Briefcase, FileText,
  UserPlus, Factory, HardHat, Package, CheckCircle2,
  AlertCircle, RefreshCw, LayoutGrid, Wallet, History,
  Activity, ExternalLink, Settings, Shield, Map, ArrowRight
} from "lucide-react";
import Link from "next/link";

/**
 * FLEET & PILOT HUB: ATLAS OPERATIONAL ASSET CONTROL
 * Fokus: Manajemen Master Data Truk & Driver dengan Standar Atlas Grey-Light.
 */

type HubTab = 'fleets' | 'drivers' | 'companies';

export default function FleetHubPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<HubTab>('fleets');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { isLoaded } = useGoogleMaps();
  const autocompleteCompanyRef = useRef<google.maps.places.Autocomplete | null>(null);
  const autocompleteDriverRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handleCompanyPlaceChanged = () => {
      if (!autocompleteCompanyRef.current) return;
      const place = autocompleteCompanyRef.current.getPlace();
      if (!place || !place.formatted_address) return;
      setFormData((prev) => ({ ...prev, address: place.formatted_address || '' }));
  };

  const handleDriverPlaceChanged = () => {
      if (!autocompleteDriverRef.current) return;
      const place = autocompleteDriverRef.current.getPlace();
      if (!place || !place.formatted_address) return;
      setFormData((prev) => ({ ...prev, address: place.formatted_address || '' }));
  };
  
  // Data States
  const [fleets, setFleets] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [truckTypes, setTruckTypes] = useState<any[]>([]);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [userOrgId, setUserOrgId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Ambil Profile untuk mendapatkan organization_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      const orgId = profile?.organization_id;
      if (!orgId) {
          toast.error("Organisasi tidak ditemukan. Data mungkin tidak akurat.");
          return;
      }

      setUserOrgId(orgId);
      setFormData(prev => ({ ...prev, organization_id: orgId }));

      const [fRes, dRes, cRes, tRes]: any[] = await Promise.all([
        supabase.from('fleets').select('*, companies(name)').eq('organization_id', orgId).order('plate_number'),
        supabase.from('drivers').select('*, companies(name)').eq('organization_id', orgId).order('name'),
        supabase.from('companies').select('*').eq('organization_id', orgId).order('name'),
        supabase.from('truck_types').select('*').order('name')
      ]);

      setFleets(fRes.data || []);
      setDrivers(dRes.data || []);
      setCompanies(cRes.data || []);
      setTruckTypes(tRes.data || []);
    } catch (error: any) {
      toast.error("Gagal sinkron data aset");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData(activeTab === 'fleets' ? {
        plate_number: "", truck_type: "", truck_brand: "", truck_color: "", year_manufacture: "",
        status: "active", company_id: "", stnk_expiry: "", plate_expiry: "", notes: "", organization_id: userOrgId
    } : activeTab === 'drivers' ? {
        name: "", phone: "", license_type: "BII Umum", license_number: "", license_expiry: "", nik: "",
        status: "active", company_id: "", address: "", notes: "", organization_id: userOrgId
    } : {
        name: "", type: "vendor", address: "", pic_name: "", pic_phone: "", notes: "", is_active: true, organization_id: userOrgId
    });
    setEditingId(null);
  };

  const handleSave = async () => {
    try {
      const table = activeTab;
      
      // Clean payload from foreign relational objects
      const payload = { ...formData };
      delete payload.companies;
      
      // Convert empty strings to null for UUIDs and optional dates
      if (payload.company_id === "") payload.company_id = null;
      if (payload.stnk_expiry === "") payload.stnk_expiry = null;
      if (payload.plate_expiry === "") payload.plate_expiry = null;
      if (payload.license_expiry === "") payload.license_expiry = null;
      if (payload.year_manufacture === "") payload.year_manufacture = null;

      if (editingId) {
        delete payload.id; // don't push PK on update
        const { error } = await supabase.from(table).update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success("Record Identity Updated!");
      } else {
        const { error } = await supabase.from(table).insert(payload);
        if (error) throw error;
        toast.success("New Asset Deployed!");
      }
      resetForm();
      setShowModal(false);
      fetchData();
    } catch (error: any) {
        toast.error("Error: " + error.message);
    }
  };

  const filteredData = activeTab === 'fleets' 
    ? fleets.filter(f => `${f.plate_number} ${f.truck_type}`.toLowerCase().includes(searchTerm.toLowerCase()))
    : activeTab === 'drivers' 
        ? drivers.filter(d => `${d.name} ${d.phone}`.toLowerCase().includes(searchTerm.toLowerCase()))
        : companies.filter(c => `${c.name} ${c.type}`.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#1E293B] pb-40">
      <Toaster position="top-right" />

      {/* 🏛️ ATLAS FLEET HEADER */}
      <header className="sticky top-0 z-[100] bg-white border-b border-slate-200 px-8 py-6 flex flex-col md:flex-row justify-between items-center shadow-sm gap-6">
         <div className="flex items-center gap-5">
            <Link href="/sbu/trucking" className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-all">
               <ChevronRight className="w-6 h-6 text-slate-400 rotate-180" />
            </Link>
            <div>
               <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Fleet Control Center</h1>
               <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                  <Activity className="w-3 h-3" /> Asset & Pilot Matrix
               </p>
            </div>
         </div>

         <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80 group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-[#1E293B] transition-colors" />
                <input 
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  className="w-full h-14 pl-14 pr-6 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-[#1E293B] transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
                onClick={() => { resetForm(); setShowModal(true); }}
                className="h-14 bg-[#1E293B] hover:bg-orange-600 text-white px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center gap-3"
            >
                <Plus className="w-4 h-4" /> Register {activeTab === 'fleets' ? 'Unit' : activeTab === 'drivers' ? 'Pilot' : 'Transporter'}
            </button>
         </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 lg:p-12 space-y-12">
          
          {/* 🔘 HUB TABS ATLAS STYLE */}
          <div className="flex bg-white p-2 rounded-[2rem] border border-slate-200 w-fit shadow-sm">
             {[
               { id: 'fleets', label: 'Fleet Matrix', icon: Truck },
               { id: 'drivers', label: 'Pilot Directory', icon: User },
               { id: 'companies', label: 'Transporters', icon: Briefcase }
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

          {/* 📊 ASSET CARDS DISPLAY */}
          {loading ? (
             <div className="py-32 flex flex-col items-center justify-center gap-4">
                <RefreshCw className="w-10 h-10 text-slate-300 animate-spin" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-center">Synchronizing Asset Database...</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {filteredData.map((item) => (
                 <div key={item.id} className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-[0_15px_60px_rgba(0,0,0,0.02)] group hover:shadow-xl transition-all duration-500 relative flex flex-col justify-between h-full">
                    
                    <div className="relative z-10 flex-1">
                       <div className="flex justify-between items-start mb-8">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${activeTab === 'fleets' ? 'bg-orange-50 border-orange-100 text-orange-600' : activeTab === 'drivers' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-purple-50 border-purple-100 text-purple-600'} shadow-sm`}>
                             {activeTab === 'fleets' ? <Truck className="w-7 h-7" /> : activeTab === 'drivers' ? <User className="w-7 h-7" /> : <Briefcase className="w-7 h-7" />}
                          </div>
                          <div className="flex gap-2">
                             <button 
                               onClick={() => { setEditingId(item.id); setFormData(item); setShowModal(true); }}
                               className="w-10 h-10 bg-slate-50 hover:bg-[#1E293B] hover:text-white rounded-xl flex items-center justify-center text-slate-400 transition-all border border-slate-100"
                             >
                                <Edit2 className="w-4 h-4" />
                             </button>
                          </div>
                       </div>

                       <div className="space-y-3 mb-8">
                          <div className="flex items-center gap-3">
                             <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] italic">
                                {activeTab === 'fleets' ? (item.truck_type || 'Unknown Type') : activeTab === 'drivers' ? (item.license_type || 'Pilot') : (item.type === 'company' ? 'Internal Asset Group' : 'External Vendor')}
                             </span>
                             <div className="h-px flex-1 bg-slate-100" />
                          </div>
                          <h3 className="text-3xl font-black italic text-[#1E293B] uppercase tracking-tighter leading-tight group-hover:text-orange-600 transition-colors">
                             {activeTab === 'fleets' ? item.plate_number : item.name}
                          </h3>
                       </div>

                       <div className="space-y-5 py-8 border-t border-slate-50">
                          {activeTab === 'companies' ? (
                             <>
                                <div className="flex items-center gap-4 text-slate-500">
                                   <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100"><MapPin className="w-3.5 h-3.5" /></div>
                                   <span className="text-[11px] font-black uppercase italic tracking-tight line-clamp-1">{item.address || 'No HQ Address'}</span>
                                </div>
                                <div className="flex items-center gap-4 text-slate-500">
                                   <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100"><Phone className="w-3.5 h-3.5" /></div>
                                   <span className="text-[11px] font-black uppercase italic tracking-tight">{item.phone || item.contact_person || 'No Contact Info'}</span>
                                </div>
                             </>
                          ) : activeTab === 'fleets' ? (
                             <>
                                <div className="flex items-center gap-4 text-slate-500">
                                   <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100"><Settings className="w-3.5 h-3.5" /></div>
                                   <span className="text-[11px] font-black uppercase italic tracking-tight">{item.truck_brand || 'Standard Engine'}</span>
                                </div>
                                <div className="flex items-center gap-4 text-slate-500">
                                   <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100"><Building2 className="w-3.5 h-3.5" /></div>
                                   <span className="text-[11px] font-black uppercase italic tracking-tight line-clamp-1">{item.companies?.name || 'Local Asset'}</span>
                                </div>
                             </>
                          ) : (
                             <>
                                <div className="flex items-center gap-4 text-slate-500">
                                   <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100"><Phone className="w-3.5 h-3.5" /></div>
                                   <span className="text-[11px] font-black uppercase italic tracking-tight">{item.phone || 'No Contact'}</span>
                                </div>
                                <div className="flex items-center gap-4 text-slate-500">
                                   <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100"><Shield className="w-3.5 h-3.5" /></div>
                                   <span className="text-[11px] font-black uppercase italic tracking-tight">{item.license_number || 'SIM Active'}</span>
                                </div>
                             </>
                          )}
                       </div>
                    </div>

                    <div className="pt-8 border-t border-slate-50 flex justify-between items-center mt-auto">
                       <div className="flex gap-2">
                          <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border ${item.status === 'ready' || item.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                             {item.status || 'Active'}
                          </span>
                       </div>
                       <button className="text-[10px] font-black text-[#1E293B] flex items-center gap-2 hover:gap-3 transition-all uppercase tracking-widest italic group-hover:text-orange-600">
                          Timeline <ArrowRight className="w-4 h-4 text-orange-500" />
                       </button>
                    </div>
                 </div>
               ))}
            </div>
          )}
      </main>

      {/* 🚀 ASSET MODAL FORM ATLAS STYLE */}
      {showModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 md:p-12">
           <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xl" onClick={() => setShowModal(false)} />
           <div className="relative bg-white rounded-[4rem] w-full max-w-4xl p-12 md:p-16 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-500">
              <button onClick={() => setShowModal(false)} className="absolute top-12 right-12 w-14 h-14 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 rounded-3xl flex items-center justify-center text-slate-400 transition-all shadow-inner">
                 <X className="w-8 h-8" />
              </button>

              <div className="mb-14 text-center md:text-left">
                 <div className="flex items-center gap-4 mb-4 justify-center md:justify-start">
                    <span className="text-[11px] font-black text-orange-500 uppercase tracking-widest italic">Asset Initialization Routine</span>
                    <div className="h-px w-20 bg-orange-500/30" />
                 </div>
                 <h2 className="text-4xl md:text-5xl font-black text-[#1E293B] italic uppercase tracking-tighter leading-none">
                   {editingId ? "Modify Identity" : `Deploy New ${activeTab === 'fleets' ? 'Unit' : 'Pilot'}`}
                 </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 
                 {activeTab === 'companies' ? (
                   <>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Transporter Name</label>
                         <input type="text" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all uppercase" placeholder="PT. Transporter Name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Organization Type</label>
                         <select className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none" value={formData.type || ''} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                            <option value="company">Internal (Own Asset Group)</option>
                            <option value="vendor">External Vendor</option>
                         </select>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">PIC Name</label>
                         <input type="text" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all" placeholder="Contact Person" value={formData.pic_name || ''} onChange={(e) => setFormData({ ...formData, pic_name: e.target.value })} />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">PIC Phone</label>
                         <input type="text" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all" placeholder="+62 8XX..." value={formData.pic_phone || ''} onChange={(e) => setFormData({ ...formData, pic_phone: e.target.value })} />
                      </div>
                      <div className="space-y-3 md:col-span-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">HQ Address</label>
                         {isLoaded ? (
                            <Autocomplete onLoad={(auto) => autocompleteCompanyRef.current = auto} onPlaceChanged={handleCompanyPlaceChanged}>
                               <input type="text" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all" placeholder="Search Google Maps Base..." value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                            </Autocomplete>
                         ) : (
                            <input type="text" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all" placeholder="Physical Address" value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                         )}
                      </div>
                      <div className="space-y-3 md:col-span-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Notes</label>
                         <textarea className="w-full h-24 p-6 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-semibold text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all resize-none" placeholder="Additional details..." value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                      </div>
                   </>
                 ) : activeTab === 'fleets' ? (
                   <>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Plate Number (TNKB)</label>
                         <input type="text" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all uppercase" placeholder="B 1234 XXX" value={formData.plate_number || ''} onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })} />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Ownership / Provider</label>
                         <select className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none" value={formData.company_id || ''} onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}>
                            <option value="">Internal Asset (Own)</option>
                            {companies.filter(c => c.type === 'vendor').map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                         </select>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Truck Type</label>
                         <select className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none appearance-none" value={formData.truck_type || ''} onChange={(e) => setFormData({ ...formData, truck_type: e.target.value })}>
                            <option value="">Select Type</option>
                            {truckTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                         </select>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Truck Brand</label>
                         <input type="text" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all uppercase" placeholder="Hino / Fuso" value={formData.truck_brand || ''} onChange={(e) => setFormData({ ...formData, truck_brand: e.target.value })} />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Truck Color</label>
                         <input type="text" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all" placeholder="Green" value={formData.truck_color || ''} onChange={(e) => setFormData({ ...formData, truck_color: e.target.value })} />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Year Manufacture</label>
                         <input type="number" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all" placeholder="20XX" value={formData.year_manufacture || ''} onChange={(e) => setFormData({ ...formData, year_manufacture: e.target.value })} />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">STNK Expiry</label>
                         <input type="date" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all" value={formData.stnk_expiry || ''} onChange={(e) => setFormData({ ...formData, stnk_expiry: e.target.value })} />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Plate Expiry (KIR)</label>
                         <input type="date" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all" value={formData.plate_expiry || ''} onChange={(e) => setFormData({ ...formData, plate_expiry: e.target.value })} />
                      </div>
                      <div className="space-y-3 md:col-span-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Notes</label>
                         <textarea className="w-full h-24 p-6 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-semibold text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all resize-none" placeholder="Asset conditions, configs..." value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                      </div>
                   </>
                 ) : (
                   <>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Pilot Full Name</label>
                         <input type="text" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all uppercase" placeholder="Full Name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Pilot NIK (ID Card)</label>
                         <input type="text" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all" placeholder="16 Digit NIK" value={formData.nik || ''} onChange={(e) => setFormData({ ...formData, nik: e.target.value })} />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Organization / Provider</label>
                         <select className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none" value={formData.company_id || ''} onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}>
                            <option value="">Internal Staff</option>
                            {companies.filter(c => c.type === 'vendor').map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                         </select>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Pilot Phone / WhatsApp</label>
                         <input type="text" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all" placeholder="+62 8XX..." value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">License Class</label>
                         <select className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none" value={formData.license_type || ''} onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}>
                            <option value="BII Umum">BII Umum (Trailer/Heavy)</option>
                            <option value="BI Umum">BI Umum (Truck/Medium)</option>
                            <option value="A">Class A (Passenger)</option>
                         </select>
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">License Number (SIM)</label>
                         <input type="text" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all" placeholder="SIM Number" value={formData.license_number || ''} onChange={(e) => setFormData({ ...formData, license_number: e.target.value })} />
                      </div>
                      <div className="space-y-3 md:col-span-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">License Expiry Date</label>
                         <input type="date" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all" value={formData.license_expiry || ''} onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })} />
                      </div>
                      <div className="space-y-3 md:col-span-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Residential Address</label>
                         {isLoaded ? (
                            <Autocomplete onLoad={(auto) => autocompleteDriverRef.current = auto} onPlaceChanged={handleDriverPlaceChanged}>
                               <input type="text" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all" placeholder="Search Google Maps..." value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                            </Autocomplete>
                         ) : (
                            <input type="text" className="w-full h-18 px-8 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-black text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all" placeholder="Home Address" value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                         )}
                      </div>
                      <div className="space-y-3 md:col-span-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Notes</label>
                         <textarea className="w-full h-24 p-6 bg-slate-50 border border-slate-200 rounded-[1.8rem] text-sm font-semibold text-[#1E293B] outline-none focus:bg-white focus:border-[#1E293B] transition-all resize-none" placeholder="Warnings, performance notes..." value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                      </div>
                   </>
                 )}
              </div>

              <div className="mt-16 pt-12 border-t border-slate-100 flex flex-col md:flex-row gap-6">
                 <button 
                   onClick={handleSave}
                   className="flex-[2] bg-[#1E293B] hover:bg-orange-600 text-white py-7 rounded-[2.5rem] text-sm font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-4"
                 >
                    <CheckCircle2 className="w-6 h-6" /> {editingId ? "Authorize Modification" : `Commit New ${activeTab === 'fleets' ? 'Unit' : activeTab === 'drivers' ? 'Pilot' : 'Transporter'}`}
                 </button>
                 <button 
                   onClick={() => setShowModal(false)}
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

const Building2 = ({ className }: { className: string }) => (
    <Factory className={className} />
);
