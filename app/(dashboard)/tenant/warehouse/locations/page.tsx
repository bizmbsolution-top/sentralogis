"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast, Toaster } from "react-hot-toast";
import Link from "next/link";
import { 
  Warehouse, Search, Plus, MapPin, 
  Settings2, Loader2, ArrowRight, X, Building
} from "lucide-react";
import { useGoogleMaps } from "@/lib/google-maps-context";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";

function AddressAutocomplete({ 
  onAddressSelect 
}: { 
  onAddressSelect: (address: string, city: string, province: string, lat: number, lng: number) => void 
}) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: "id" }
    },
    debounce: 300,
  });

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      
      let city = "";
      let province = "";
      
      results[0].address_components.forEach(comp => {
        if (comp.types.includes("administrative_area_level_2") || comp.types.includes("locality")) {
          city = comp.long_name;
        }
        if (comp.types.includes("administrative_area_level_1")) {
          province = comp.long_name;
        }
      });

      onAddressSelect(address, city, province, lat, lng);
    } catch (error) {
      console.error("Error: ", error);
      toast.error("Gagal mendapatkan detail alamat.");
    }
  };

  return (
    <div className="relative z-50">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!ready}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500"
        placeholder="Cari lokasi di Google Maps..."
      />
      {status === "OK" && (
        <ul className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-lg max-h-60 overflow-auto">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description)}
              className="px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
            >
              {description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function WarehouseLocationsPage() {
  const { isLoaded } = useGoogleMaps();

  const { profile } = useAuth();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    address: "",
    city: "",
    province: "",
    latitude: null as number | null,
    longitude: null as number | null,
    contact_person: "",
    contact_phone: ""
  });

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('md_warehouses')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('name', { ascending: true });
        
      if (error) throw error;
      setWarehouses(data || []);
    } catch (err: any) {
      toast.error('Gagal memuat data lokasi gudang.');
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = warehouses.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setSubmitting(true);
    try {
      const payload = {
        tenant_id: profile.tenant_id,
        code: formData.code.toUpperCase(),
        name: formData.name,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        latitude: formData.latitude,
        longitude: formData.longitude,
        contact_person: formData.contact_person,
        contact_phone: formData.contact_phone,
        created_by: profile.id
      };
      
      const { error } = await supabase.from('md_warehouses').insert(payload);
      if (error) throw error;
      
      toast.success('Gudang baru berhasil ditambahkan.');
      setShowModal(false);
      setFormData({ code: "", name: "", address: "", city: "", province: "", latitude: null, longitude: null, contact_person: "", contact_phone: "" });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan gudang.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddressSelect = (address: string, city: string, province: string, lat: number, lng: number) => {
    setFormData(prev => ({
      ...prev,
      address,
      city,
      province,
      latitude: lat,
      longitude: lng
    }));
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm text-white">
               <Warehouse className="w-6 h-6" />
            </div>
            <div>
               <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">Locations</h1>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Gudang & Fasilitas SBU</p>
            </div>
         </div>
         <button 
           onClick={() => setShowModal(true)}
           className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
         >
           <Plus className="w-4 h-4" /> Tambah Gudang
         </button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full md:w-96">
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
         <input 
           type="text" 
           placeholder="Cari lokasi gudang atau kota..."
           className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      {/* Grid List */}
      {loading ? (
         <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Memuat Data...</p>
         </div>
      ) : filteredData.length === 0 ? (
         <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
               <MapPin className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Gudang belum ditemukan.</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredData.map(w => (
               <div key={w.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all group flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                     <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Building className="w-6 h-6" />
                     </div>
                     <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black tracking-widest uppercase">
                        {w.code}
                     </span>
                  </div>
                  <div className="flex-1 mb-6">
                     <h3 className="text-xl font-black text-slate-900 mb-2 line-clamp-1">{w.name}</h3>
                     <p className="text-xs font-medium text-slate-500 line-clamp-2 flex flex-col gap-1">
                        <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3"/> {w.city}, {w.province}</span>
                     </p>
                  </div>
                  <div className="pt-6 border-t border-slate-100 mt-auto">
                     <Link 
                       href={`/tenant/warehouse/locations/${w.id}`}
                       className="w-full py-3 bg-slate-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                     >
                        <Settings2 className="w-4 h-4" /> Setup Zonasi & Rak <ArrowRight className="w-4 h-4 ml-2" />
                     </Link>
                  </div>
               </div>
            ))}
         </div>
      )}

      {/* Modal Tambah */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl overflow-y-auto max-h-screen">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
               <div>
                  <h3 className="text-lg font-black text-slate-900">Tambah Gudang Baru</h3>
                  <p className="text-xs text-slate-500">Daftarkan fasilitas lokasi penyimpanan</p>
               </div>
               <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all">
                  <X size={20} />
               </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kode Gudang (Singkatan)</label>
                     <input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 uppercase" placeholder="JKT-01" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nama Lengkap Lokasi</label>
                     <input required type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" placeholder="Gudang Utama Jakarta" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
               </div>
               <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alamat Lengkap</label>
                  {isLoaded ? (
                    <AddressAutocomplete onAddressSelect={handleAddressSelect} />
                  ) : (
                    <input type="text" disabled className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm" placeholder="Memuat Google Maps..." />
                  )}
                  {formData.address && (
                    <div className="mt-2 text-xs font-medium text-slate-500 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                      <strong>Alamat Tersimpan:</strong> {formData.address}
                    </div>
                  )}
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kota</label>
                     <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" placeholder="Jakarta Utara" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Provinsi</label>
                     <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" placeholder="DKI Jakarta" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PIC (Penanggung Jawab)</label>
                     <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" placeholder="Nama Manager" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kontak PIC</label>
                     <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" placeholder="0812..." value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} />
                  </div>
               </div>
               <button disabled={submitting} type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center">
                 {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Lokasi Gudang"}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
