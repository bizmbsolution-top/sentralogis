"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast, Toaster } from "react-hot-toast";
import { 
  Warehouse, Search, Plus, MapPin, 
  Settings2, Loader2, ArrowRight, X, Building,
  ChevronDown, ChevronRight, Layers, Box, Trash2, Copy, Save, Edit2
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

export default function MasterWarehousePage() {
  const { isLoaded } = useGoogleMaps();
  const { profile } = useAuth();
  
  // Data States
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [locationCapacities, setLocationCapacities] = useState<any[]>([]);
  const [sbus, setSbus] = useState<any[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedWh, setExpandedWh] = useState<Record<string, boolean>>({});
  const [expandedZone, setExpandedZone] = useState<Record<string, boolean>>({});

  // Modal States
  const [showWhModal, setShowWhModal] = useState(false);
  const [editingWhId, setEditingWhId] = useState<string | null>(null);
  
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  
  const [showLocModal, setShowLocModal] = useState(false); // For Bulk Add
  
  const [showEditLocModal, setShowEditLocModal] = useState(false); // For Single Edit
  const [editingLocId, setEditingLocId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [whForm, setWhForm] = useState({
    code: "", name: "", address: "", city: "", province: "", 
    latitude: null as number | null, longitude: null as number | null, 
    contact_person: "", contact_phone: "", sbu_id: ""
  });

  const [zoneForm, setZoneForm] = useState({
    warehouse_id: "",
    area_code: "", // we'll store zone code in md_warehouse_areas for simplicity of flat hierarchy
    area_name: "", // we'll store zone name in md_warehouse_areas
    area_type: "INDOOR_FLOOR",
    total_capacity: 0,
    uom_capacity: "PALLET"
  });

  const defaultLocRow = {
    area_id: "", // This is actually our Zone ID under the hood
    code: "", rack: "", shelf: "", bin: "",
    location_type: "STORAGE", storage_method: "RACKING",
    length_m: 1, width_m: 1, height_m: 1, max_weight_kg: 1000
  };
  const [bulkLocForm, setBulkLocForm] = useState<any[]>([{ ...defaultLocRow, id: Date.now() }]);
  const [editLocForm, setEditLocForm] = useState<any>({ ...defaultLocRow });
  const [activeZoneForLoc, setActiveZoneForLoc] = useState<{whId: string, zoneId: string} | null>(null);

  // Fetching Data
  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    try {
      setLoading(true);
      
      // Fetch SBUs
      const { data: sbuData } = await supabase.from('tenant_sbus').select('*').eq('tenant_id', profile.tenant_id);
      if (sbuData) setSbus(sbuData);

      // Fetch Master UOMs
      const { data: uomData } = await supabase.from('md_uoms').select('name').eq('tenant_id', profile.tenant_id).eq('is_active', true);
      if (uomData) setUoms(uomData);

      // Fetch Warehouses
      const { data: whData, error: whError } = await supabase.from('md_warehouses').select('*').eq('tenant_id', profile.tenant_id).order('name');
      if (whError) throw whError;
      setWarehouses(whData || []);

      // Fetch Zones (In DB we use md_warehouse_areas as the Zones for flattening)
      const { data: zoneData, error: zoneError } = await supabase.from('md_warehouse_areas').select('*').eq('tenant_id', profile.tenant_id).order('area_name');
      if (zoneError) throw zoneError;
      setZones(zoneData || []);

      // Fetch Locations (Bins)
      const { data: locData, error: locError } = await supabase.from('md_warehouse_locations').select('*').eq('tenant_id', profile.tenant_id).order('code');
      if (locError) throw locError;
      setLocations(locData || []);

      // Fetch Capacity Tracking Data
      const { data: capData, error: capError } = await supabase.from('vw_location_capacity').select('*').eq('tenant_id', profile.tenant_id);
      if (!capError && capData) {
        setLocationCapacities(capData);
      } else {
        // Fallback to empty if view doesn't exist yet or fails
        setLocationCapacities([]);
      }

    } catch (err: any) {
      toast.error('Gagal memuat data master gudang.');
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const toggleWh = (id: string) => setExpandedWh(prev => ({...prev, [id]: !prev[id]}));
  const toggleZone = (id: string) => setExpandedZone(prev => ({...prev, [id]: !prev[id]}));

  const handleAddressSelect = (address: string, city: string, province: string, lat: number, lng: number) => {
    setWhForm(prev => ({ ...prev, address, city, province, latitude: lat, longitude: lng }));
  };

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setSubmitting(true);
    try {
      const payload = { 
        ...whForm, 
        tenant_id: profile.tenant_id, 
        code: whForm.code.toUpperCase(), 
        created_by: profile.id,
        sbu_id: whForm.sbu_id || null
      };

      let error;
      if (editingWhId) {
        const res = await (supabase.from('md_warehouses' as any) as any).update(payload).eq('id', editingWhId);
        error = res.error;
      } else {
        const res = await (supabase.from('md_warehouses' as any) as any).insert(payload);
        error = res.error;
      }

      if (error) throw error;
      toast.success(editingWhId ? 'Gudang berhasil diperbarui.' : 'Gudang berhasil ditambahkan.');
      setShowWhModal(false);
      setEditingWhId(null);
      setWhForm({ code: "", name: "", address: "", city: "", province: "", latitude: null, longitude: null, contact_person: "", contact_phone: "", sbu_id: "" });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan gudang.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setSubmitting(true);
    try {
      const payload = {
        tenant_id: profile.tenant_id,
        warehouse_id: zoneForm.warehouse_id,
        area_code: zoneForm.area_code.toUpperCase(), // Using area_code for Zone Code
        area_name: zoneForm.area_name, // Using area_name for Zone Name
        area_type: zoneForm.area_type,
        total_capacity: zoneForm.total_capacity,
        uom_capacity: zoneForm.uom_capacity,
        area_category: "GENERAL"
      };

      let error;
      if (editingZoneId) {
         const res = await supabase.from('md_warehouse_areas').update(payload).eq('id', editingZoneId);
         error = res.error;
      } else {
         const res = await supabase.from('md_warehouse_areas').insert(payload);
         error = res.error;
      }

      if (error) {
        if (error.message.includes('check_constraint') || error.message.includes('uom_capacity_check')) {
            toast.error('UOM Kapasitas tidak diizinkan oleh konstrain DB. Pilih PALLET, CBM, atau SQM.');
            setSubmitting(false);
            return;
        }
        throw error;
      }
      toast.success(`Zona berhasil ${editingZoneId ? 'diperbarui' : 'ditambahkan'}.`);
      setShowZoneModal(false);
      setEditingZoneId(null);
      
      // Auto expand the warehouse
      setExpandedWh(prev => ({...prev, [zoneForm.warehouse_id]: true}));
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan zona.');
    } finally {
      setSubmitting(false);
    }
  };

  const openLocationModal = (whId: string, zoneId: string) => {
    setActiveZoneForLoc({ whId, zoneId });
    setBulkLocForm([{ ...defaultLocRow, area_id: zoneId, id: Date.now() }]);
    setShowLocModal(true);
  };

  const updateLocRow = (index: number, field: string, value: any) => {
    const newData = [...bulkLocForm];
    newData[index][field] = value;
    setBulkLocForm(newData);
  };

  const generateNextCode = (prevCode: string) => {
    if (!prevCode) return "";
    const match = prevCode.match(/(\d+)$/);
    if (match) {
      const numStr = match[1];
      const num = parseInt(numStr, 10) + 1;
      const paddedNum = num.toString().padStart(numStr.length, '0');
      return prevCode.slice(0, match.index) + paddedNum;
    }
    return prevCode; // Jika tidak ada angka di akhir, cukup copy
  };

  const handleAddLocRow = () => {
    const lastRow = bulkLocForm[bulkLocForm.length - 1];
    const nextCode = lastRow ? generateNextCode(lastRow.code) : "";
    const baseRow = lastRow ? { ...lastRow } : { ...defaultLocRow, area_id: activeZoneForLoc?.zoneId };
    
    setBulkLocForm([
      ...bulkLocForm, 
      { 
        ...baseRow,
        code: nextCode,
        id: Date.now() + Math.random() 
      }
    ]);
  };

  const handleSaveLocations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !activeZoneForLoc) return;
    
    if (bulkLocForm.some(row => !row.code.trim())) {
      toast.error("Semua baris harus memiliki Location Code.");
      return;
    }

    setSubmitting(true);
    try {
      const tenantId = profile.tenant_id;
      const payloads = bulkLocForm.map(row => ({
        tenant_id: tenantId,
        warehouse_id: activeZoneForLoc.whId,
        area_id: activeZoneForLoc.zoneId, // area_id stores the zone ID mapping
        code: row.code.toUpperCase(),
        rack: row.rack.toUpperCase(),
        shelf: row.shelf.toUpperCase(),
        bin: row.bin.toUpperCase(),
        location_type: row.location_type,
        storage_method: row.storage_method,
        length_m: row.length_m,
        width_m: row.width_m,
        height_m: row.height_m,
        max_volume_m3: row.length_m * row.width_m * row.height_m,
        max_weight_kg: row.max_weight_kg
      }));
      
      const { error } = await supabase.from('md_warehouse_locations').insert(payloads as never);
      if (error) throw error;
      
      toast.success(`${payloads.length} Kode Penyimpanan berhasil ditambahkan.`);
      setShowLocModal(false);
      
      // Auto expand the zone
      setExpandedZone(prev => ({...prev, [activeZoneForLoc.zoneId]: true}));
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan kode penyimpanan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEditLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !editingLocId) return;

    setSubmitting(true);
    try {
      const payload = {
        code: editLocForm.code.toUpperCase(),
        rack: editLocForm.rack.toUpperCase(),
        shelf: editLocForm.shelf.toUpperCase(),
        bin: editLocForm.bin.toUpperCase(),
        location_type: editLocForm.location_type,
        storage_method: editLocForm.storage_method,
        length_m: editLocForm.length_m,
        width_m: editLocForm.width_m,
        height_m: editLocForm.height_m,
        max_volume_m3: editLocForm.length_m * editLocForm.width_m * editLocForm.height_m,
        max_weight_kg: editLocForm.max_weight_kg
      };

      const { error } = await supabase.from('md_warehouse_locations').update(payload).eq('id', editingLocId);
      if (error) throw error;

      toast.success('Lokasi penyimpanan berhasil diperbarui.');
      setShowEditLocModal(false);
      setEditingLocId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui kode penyimpanan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (table: string, id: string, name: string) => {
    if (!confirm(`Hapus ${name}? (Data di bawahnya akan ikut terhapus)`)) return;
    try {
      const { error } = await (supabase.from(table as never) as any).delete().eq('id', id);
      if (error) throw error;
      toast.success(`Berhasil dihapus.`);
      fetchData();
    } catch (error: any) {
      toast.error('Gagal menghapus: ' + error.message);
    }
  };

  const filteredWarehouses = warehouses.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
         <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 text-white">
               <Warehouse className="w-7 h-7" />
            </div>
            <div>
               <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">Master Warehouse</h1>
               <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                 <Building className="w-3 h-3"/> Multi-Level Storage Architecture
               </p>
            </div>
         </div>
         <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text" placeholder="Cari Gudang..."
                 className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                 value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <button 
              onClick={() => { setEditingWhId(null); setWhForm({ code: "", name: "", address: "", city: "", province: "", latitude: null, longitude: null, contact_person: "", contact_phone: "", sbu_id: "" }); setShowWhModal(true); }}
              className="w-full sm:w-auto h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Tambah Gudang
            </button>
         </div>
      </div>

      {/* Tree View Listing */}
      {loading ? (
         <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Menyusun Blueprint...</p>
         </div>
      ) : filteredWarehouses.length === 0 ? (
         <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white border border-slate-200 rounded-[2rem] text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
               <MapPin className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Data Gudang Kosong.</p>
         </div>
      ) : (
         <div className="space-y-4">
            {filteredWarehouses.map(wh => {
              const whZones = zones.filter(z => z.warehouse_id === wh.id);
              const isWhExpanded = expandedWh[wh.id];
              
              return (
                <div key={wh.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:border-slate-300 transition-all">
                   {/* Level 1: WAREHOUSE */}
                   <div 
                     className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors group"
                     onClick={() => toggleWh(wh.id)}
                   >
                     <div className="flex items-center gap-4">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isWhExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                         {isWhExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                       </div>
                       <div>
                         <div className="flex items-center gap-3">
                           <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{wh.code} <span className="text-slate-300 font-normal">|</span> {wh.name}</h2>
                           {wh.sbu_id ? (
                             <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest rounded-md border border-blue-200">SBU: {sbus.find(s => s.id === wh.sbu_id)?.sbu_name || wh.sbu_id}</span>
                           ) : (
                             <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest rounded-md border border-amber-200">HQ ALLOCATED</span>
                           )}
                           <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-md border border-slate-200">{whZones.length} Zona</span>
                         </div>
                         <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5 line-clamp-1">
                           <MapPin className="w-3 h-3" /> {wh.address}, {wh.city}, {wh.province}
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-3">
                       <button 
                         onClick={(e) => { e.stopPropagation(); setZoneForm({...zoneForm, warehouse_id: wh.id, area_code: "", area_name: ""}); setShowZoneModal(true); }}
                         className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 opacity-0 group-hover:opacity-100"
                       >
                         <Plus className="w-3 h-3" /> Tambah Zona
                       </button>
                       <button 
                         onClick={(e) => { e.stopPropagation(); setEditingWhId(wh.id); setWhForm({ code: wh.code, name: wh.name, address: wh.address || "", city: wh.city || "", province: wh.province || "", latitude: wh.latitude, longitude: wh.longitude, contact_person: wh.contact_person || "", contact_phone: wh.contact_phone || "", sbu_id: wh.sbu_id || "" }); setShowWhModal(true); }} 
                         className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-500 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                       >
                         <Edit2 className="w-4 h-4" />
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); handleDelete('md_warehouses', wh.id, wh.code); }} className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>

                   {/* Level 2: ZONES */}
                   {isWhExpanded && (
                     <div className="border-t border-slate-100 bg-slate-50/50 p-4 pl-16">
                       {whZones.length === 0 ? (
                         <div className="py-6 flex flex-col items-center justify-center text-center">
                           <Layers className="w-8 h-8 text-slate-200 mb-2" />
                           <p className="text-xs font-bold text-slate-400">Belum ada Zona di gudang ini.</p>
                           <button onClick={() => { setZoneForm({...zoneForm, warehouse_id: wh.id, area_code: "", area_name: ""}); setShowZoneModal(true); }} className="mt-3 text-xs font-bold text-indigo-600 hover:underline">Buat Zona Pertama</button>
                         </div>
                       ) : (
                         <div className="space-y-3">
                           {whZones.map(zone => {
                             const zoneLocs = locations.filter(l => l.area_id === zone.id);
                             const isZoneExpanded = expandedZone[zone.id];
                             
                             const zoneCapacities = locationCapacities.filter(c => c.zone_id === zone.id);
                             const totalZoneMaxVol = zoneCapacities.reduce((sum, c) => sum + (Number(c.max_volume_m3)||0), 0);
                             const totalZoneUsedVol = zoneCapacities.reduce((sum, c) => sum + (Number(c.used_volume_m3)||0), 0);
                             const zoneVolPercent = totalZoneMaxVol > 0 ? (totalZoneUsedVol / totalZoneMaxVol) * 100 : 0;

                             return (
                               <div key={zone.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden group/zone shadow-sm">
                                 <div 
                                   className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                   onClick={() => toggleZone(zone.id)}
                                 >
                                   <div className="flex items-center gap-3">
                                     <div className={`w-6 h-6 rounded flex items-center justify-center transition-all ${isZoneExpanded ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-400 group-hover/zone:bg-sky-100 group-hover/zone:text-sky-600'}`}>
                                       {isZoneExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                     </div>
                                     <div className="w-48 xl:w-64">
                                       <div className="flex items-center gap-2">
                                         <h3 className="text-sm font-black text-slate-800">{zone.area_code} <span className="text-slate-300 font-normal">|</span> {zone.area_name}</h3>
                                         <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 text-[8px] font-black uppercase tracking-widest rounded border border-sky-100">{zone.area_type}</span>
                                       </div>
                                       <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
                                         Kapasitas: <span className="text-indigo-600">{zone.total_capacity} {zone.uom_capacity}</span> 
                                         <span className="mx-2 text-slate-300">|</span> 
                                         Total: {zoneLocs.length} Lokasi
                                       </p>
                                     </div>
                                     <div className="flex-1 max-w-xs ml-4">
                                       <div className="flex justify-between items-center mb-1">
                                         <span className="text-[9px] font-bold text-slate-500 uppercase">Utilisasi Volume (m³)</span>
                                         <span className="text-[9px] font-black text-slate-700">{zoneVolPercent.toFixed(1)}%</span>
                                       </div>
                                       <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                         <div className={`h-full transition-all duration-500 ${zoneVolPercent > 95 ? 'bg-rose-500' : zoneVolPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, zoneVolPercent)}%` }}></div>
                                       </div>
                                       <p className="text-[8px] font-bold text-slate-400 mt-1 text-right">Terpakai: {totalZoneUsedVol.toFixed(2)} / {totalZoneMaxVol.toFixed(2)} m³</p>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); openLocationModal(wh.id, zone.id); }}
                                       className="px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 opacity-0 group-hover/zone:opacity-100"
                                     >
                                       <Plus className="w-3 h-3" /> Tambah Lokasi
                                     </button>
                                     <button onClick={(e) => { e.stopPropagation(); setEditingZoneId(zone.id); setZoneForm({ warehouse_id: zone.warehouse_id, area_code: zone.area_code, area_name: zone.area_name, area_type: zone.area_type, total_capacity: zone.total_capacity, uom_capacity: zone.uom_capacity }); setShowZoneModal(true); }} className="p-1.5 text-indigo-400 hover:text-white hover:bg-indigo-500 rounded-lg transition-all opacity-0 group-hover/zone:opacity-100">
                                       <Edit2 className="w-3 h-3" />
                                     </button>
                                     <button onClick={(e) => { e.stopPropagation(); handleDelete('md_warehouse_areas', zone.id, zone.area_code); }} className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-500 rounded-lg transition-all opacity-0 group-hover/zone:opacity-100">
                                       <Trash2 className="w-3 h-3" />
                                     </button>
                                   </div>
                                 </div>

                                 {/* Level 3: LOCATIONS (BINS) */}
                                 {isZoneExpanded && (
                                   <div className="border-t border-slate-100 bg-slate-50 p-4 pl-12">
                                     {zoneLocs.length === 0 ? (
                                       <div className="py-4 text-center">
                                         <Box className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belum ada kode penyimpanan.</p>
                                       </div>
                                     ) : (
                                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                         {zoneLocs.map(loc => {
                                           const locCap = locationCapacities.find(c => c.location_id === loc.id);
                                           const maxVol = locCap?.max_volume_m3 || loc.max_volume_m3 || 0;
                                           const usedVol = locCap?.used_volume_m3 || 0;
                                           const volPercent = maxVol > 0 ? (usedVol / maxVol) * 100 : 0;
                                           const maxWgt = locCap?.max_weight_kg || loc.max_weight_kg || 0;
                                           const usedWgt = locCap?.used_weight_kg || 0;
                                           
                                           return (
                                           <div key={loc.id} className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col justify-between group/loc hover:border-indigo-300 transition-colors shadow-sm">
                                             <div className="flex justify-between items-start mb-2">
                                               <div>
                                                 <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-black tracking-widest uppercase mb-1 border border-indigo-100">
                                                   {loc.code}
                                                 </span>
                                                 <p className="text-[9px] font-bold text-slate-500 uppercase">R: {loc.rack||'-'} | S: {loc.shelf||'-'} | B: {loc.bin||'-'}</p>
                                               </div>
                                               <div className="flex gap-1 opacity-0 group-hover/loc:opacity-100 transition-opacity">
                                                 <button onClick={() => { setEditingLocId(loc.id); setEditLocForm(loc); setShowEditLocModal(true); }} className="p-1 text-indigo-400 hover:text-indigo-600">
                                                   <Edit2 className="w-3.5 h-3.5" />
                                                 </button>
                                                 <button onClick={() => handleDelete('md_warehouse_locations', loc.id, loc.code)} className="p-1 text-rose-300 hover:text-rose-500">
                                                   <Trash2 className="w-3.5 h-3.5" />
                                                 </button>
                                               </div>
                                             </div>
                                             
                                             <div className="space-y-2 mt-2">
                                               <div>
                                                 <div className="flex justify-between items-center mb-1">
                                                   <span className="text-[9px] font-bold text-slate-500 uppercase">Volume (m³)</span>
                                                   <span className="text-[9px] font-black text-slate-700">{usedVol.toFixed(1)} / {maxVol}</span>
                                                 </div>
                                                 <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                   <div className={`h-full transition-all duration-500 ${volPercent > 95 ? 'bg-rose-500' : volPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, volPercent)}%` }}></div>
                                                 </div>
                                               </div>
                                               <p className="text-[9px] font-bold text-slate-400 uppercase text-right">Berat: {usedWgt.toFixed(1)} / {maxWgt} kg</p>
                                             </div>
                                           </div>
                                         )})}
                                       </div>
                                     )}
                                   </div>
                                 )}
                               </div>
                             );
                           })}
                         </div>
                       )}
                     </div>
                   )}
                </div>
              );
            })}
         </div>
      )}

      {/* --- MODALS --- */}

      {/* Modal Tambah Gudang */}
      {showWhModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
               <div>
                  <h3 className="text-lg font-black text-slate-900">{editingWhId ? 'Edit Gedung / Warehouse' : 'Tambah Gedung / Warehouse'}</h3>
                  <p className="text-xs text-slate-500">{editingWhId ? 'Perbarui informasi fasilitas fisik' : 'Daftarkan fasilitas lokasi fisik baru'}</p>
               </div>
               <button onClick={() => setShowWhModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all">
                  <X size={20} />
               </button>
            </div>
            <form onSubmit={handleSaveWarehouse} className="p-6 space-y-5">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kode (misal: WH-JKT)</label>
                     <input required type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 uppercase" value={whForm.code} onChange={e => setWhForm({...whForm, code: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nama Warehouse</label>
                     <input required type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={whForm.name} onChange={e => setWhForm({...whForm, name: e.target.value})} />
                  </div>
               </div>
               
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SBU / Cabang (Opsional)</label>
                  <select 
                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all shadow-inner"
                     value={whForm.sbu_id}
                     onChange={(e) => setWhForm({...whForm, sbu_id: e.target.value})}
                  >
                     <option value="">-- Tidak Terikat SBU (Pusat/HQ) --</option>
                     {sbus.map(sbu => (
                        <option key={sbu.id} value={sbu.id}>{sbu.sbu_code} - {sbu.sbu_name}</option>
                     ))}
                  </select>
               </div>

               <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cari di Google Maps</label>
                  {isLoaded ? (
                    <AddressAutocomplete onAddressSelect={handleAddressSelect} />
                  ) : (
                    <input type="text" disabled className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm" placeholder="Memuat Maps..." />
                  )}
                  {whForm.address && (
                    <p className="mt-2 text-xs font-bold text-indigo-600 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                      Terpilih: {whForm.address}
                    </p>
                  )}
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kota</label>
                     <input type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={whForm.city} onChange={e => setWhForm({...whForm, city: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Provinsi</label>
                     <input type="text" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={whForm.province} onChange={e => setWhForm({...whForm, province: e.target.value})} />
                  </div>
               </div>
               <button disabled={submitting} type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center">
                 {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingWhId ? "Simpan Perubahan" : "Simpan Warehouse")}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Zona */}
      {showZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <div>
                  <h3 className="text-lg font-black text-slate-900">Tambah Zona Gudang</h3>
                  <p className="text-xs text-slate-500">Atur peruntukan ruang di dalam gudang</p>
               </div>
               <button onClick={() => setShowZoneModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all">
                  <X size={20} />
               </button>
            </div>
            <form onSubmit={handleSaveZone} className="p-6 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kode Zona</label>
                   <input required type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 uppercase" placeholder="Z-YARD" value={zoneForm.area_code} onChange={e => setZoneForm({...zoneForm, area_code: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nama Zona</label>
                   <input required type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" placeholder="Open Yard" value={zoneForm.area_name} onChange={e => setZoneForm({...zoneForm, area_name: e.target.value})} />
                 </div>
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipe Zona</label>
                 <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={zoneForm.area_type} onChange={e => setZoneForm({...zoneForm, area_type: e.target.value})}>
                   <option value="YARD">YARD (Open Yard)</option>
                   <option value="INDOOR_FLOOR">INDOOR FLOOR (Bulk)</option>
                   <option value="RACKING">RACKING AREA</option>
                   <option value="COLD_FREEZER">COLD FREEZER</option>
                   <option value="COLD_CHILLER">COLD CHILLER</option>
                   <option value="HAZMAT">HAZMAT</option>
                   <option value="BONDED">BONDED</option>
                 </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kapasitas Maks</label>
                   <input type="number" min="0" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={zoneForm.total_capacity} onChange={e => setZoneForm({...zoneForm, total_capacity: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">UOM Kapasitas</label>
                   <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={zoneForm.uom_capacity} onChange={e => setZoneForm({...zoneForm, uom_capacity: e.target.value})}>
                     <option value="PALLET">PALLET</option>
                     <option value="CBM">CBM</option>
                     <option value="SQM">SQM</option>
                     {uoms.map(u => (
                        <option key={u.id || u.name} value={u.name}>{u.name}</option>
                     ))}
                   </select>
                 </div>
               </div>
               <button disabled={submitting} type="submit" className="w-full h-12 mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center">
                 {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Zona"}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Storage Locations (Bulk) */}
      {showLocModal && (
        <div className="fixed inset-0 z-50 flex flex-col p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full flex-1 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
               <div>
                  <h3 className="text-lg font-black text-slate-900">Tambah Kode Penyimpanan (Storage Bins)</h3>
                  <p className="text-xs text-slate-500">Atur rak dan baris di dalam zona yang dipilih</p>
               </div>
               <button onClick={() => setShowLocModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all">
                  <X size={20} />
               </button>
            </div>
            
            <div className="flex-1 overflow-x-auto p-6 bg-slate-100/50">
              <table className="w-full text-left min-w-[1200px]">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="pb-3 w-48">Location Code*</th>
                    <th className="pb-3 w-56">Koordinat (Rack / Shelf / Bin)</th>
                    <th className="pb-3 w-40">Tipe Ops & Storage</th>
                    <th className="pb-3 w-48">Dimensi (P x L x T) m</th>
                    <th className="pb-3 w-32">Max Load (Kg)</th>
                    <th className="pb-3 w-20 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="space-y-3">
                  {bulkLocForm.map((row, index) => (
                    <tr key={row.id} className="bg-white border border-slate-200 rounded-xl shadow-sm relative group">
                      <td className="p-2">
                        <input 
                          type="text" placeholder="Kode (Z-A1)" 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 uppercase"
                          value={row.code} onChange={(e) => updateLocRow(index, 'code', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <div className="grid grid-cols-3 gap-1">
                          <input type="text" placeholder="Rack" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded uppercase text-[10px] font-bold outline-none focus:border-indigo-500" value={row.rack} onChange={(e) => updateLocRow(index, 'rack', e.target.value)} />
                          <input type="text" placeholder="Shelf" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded uppercase text-[10px] font-bold outline-none focus:border-indigo-500" value={row.shelf} onChange={(e) => updateLocRow(index, 'shelf', e.target.value)} />
                          <input type="text" placeholder="Bin" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded uppercase text-[10px] font-bold outline-none focus:border-indigo-500" value={row.bin} onChange={(e) => updateLocRow(index, 'bin', e.target.value)} />
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-col gap-1">
                          <select className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:border-indigo-500" value={row.location_type} onChange={(e) => updateLocRow(index, 'location_type', e.target.value)}>
                            <option value="STORAGE">STORAGE</option>
                            <option value="PICKING">PICKING</option>
                            <option value="RECEIVING">RECEIVING</option>
                            <option value="SHIPPING">SHIPPING</option>
                            <option value="QUARANTINE">QUARANTINE</option>
                          </select>
                          <select className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:border-indigo-500" value={row.storage_method} onChange={(e) => updateLocRow(index, 'storage_method', e.target.value)}>
                            <option value="RACKING">RACKING</option>
                            <option value="FLOOR">FLOOR</option>
                            <option value="OPEN_YARD">OPEN YARD</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="grid grid-cols-3 gap-1">
                          <input type="number" min="0" step="0.1" placeholder="P(m)" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500 text-center" value={row.length_m} onChange={(e) => updateLocRow(index, 'length_m', Number(e.target.value))} />
                          <input type="number" min="0" step="0.1" placeholder="L(m)" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500 text-center" value={row.width_m} onChange={(e) => updateLocRow(index, 'width_m', Number(e.target.value))} />
                          <input type="number" min="0" step="0.1" placeholder="T(m)" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500 text-center" value={row.height_m} onChange={(e) => updateLocRow(index, 'height_m', Number(e.target.value))} />
                        </div>
                      </td>
                      <td className="p-2">
                         <input type="number" min="0" placeholder="Kg" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500" value={row.max_weight_kg} onChange={(e) => updateLocRow(index, 'max_weight_kg', Number(e.target.value))} />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => {
                             const newCode = row.code ? generateNextCode(row.code) : "";
                             const newRow = { ...row, id: Date.now() + Math.random(), code: newCode };
                             const newData = [...bulkLocForm];
                             newData.splice(index + 1, 0, newRow);
                             setBulkLocForm(newData);
                          }} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="Duplicate Row">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => {
                             if(bulkLocForm.length === 1) { toast.error("Minimal 1 baris"); return; }
                             setBulkLocForm(bulkLocForm.filter((_, i) => i !== index));
                          }} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Remove Row">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button type="button" onClick={handleAddLocRow} className="mt-4 px-4 py-3 border-2 border-dashed border-slate-300 text-slate-500 hover:border-indigo-500 hover:text-indigo-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors w-full bg-white">
                <Plus className="w-4 h-4" /> Tambah Baris Baru
              </button>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-4">
               <button type="button" onClick={() => setShowLocModal(false)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-all">Batal</button>
               <button onClick={handleSaveLocations} disabled={submitting} type="button" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-black transition-all flex items-center gap-2">
                 {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4" />} Simpan {bulkLocForm.length} Baris
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Single Storage Location */}
      {showEditLocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <div>
                  <h3 className="text-lg font-black text-slate-900">Edit Kode Penyimpanan</h3>
                  <p className="text-xs text-slate-500">Perbarui rincian atau fungsi rak</p>
               </div>
               <button onClick={() => { setShowEditLocModal(false); setEditingLocId(null); }} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all">
                  <X size={20} />
               </button>
            </div>
            <form onSubmit={handleSaveEditLocation} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Location Code</label>
                 <input required type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 uppercase" value={editLocForm.code} onChange={e => setEditLocForm({...editLocForm, code: e.target.value})} />
               </div>
               <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rack</label>
                   <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 uppercase" value={editLocForm.rack} onChange={e => setEditLocForm({...editLocForm, rack: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Shelf</label>
                   <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 uppercase" value={editLocForm.shelf} onChange={e => setEditLocForm({...editLocForm, shelf: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bin</label>
                   <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 uppercase" value={editLocForm.bin} onChange={e => setEditLocForm({...editLocForm, bin: e.target.value})} />
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipe Ops</label>
                   <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={editLocForm.location_type} onChange={e => setEditLocForm({...editLocForm, location_type: e.target.value})}>
                     <option value="STORAGE">STORAGE</option>
                     <option value="PICKING">PICKING</option>
                     <option value="RECEIVING">RECEIVING</option>
                     <option value="SHIPPING">SHIPPING</option>
                     <option value="QUARANTINE">QUARANTINE</option>
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Metode Simpan</label>
                   <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={editLocForm.storage_method} onChange={e => setEditLocForm({...editLocForm, storage_method: e.target.value})}>
                     <option value="RACKING">RACKING</option>
                     <option value="FLOOR">FLOOR</option>
                     <option value="OPEN_YARD">OPEN YARD</option>
                   </select>
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">P (m)</label>
                   <input type="number" step="0.1" min="0" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 text-center" value={editLocForm.length_m} onChange={e => setEditLocForm({...editLocForm, length_m: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">L (m)</label>
                   <input type="number" step="0.1" min="0" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 text-center" value={editLocForm.width_m} onChange={e => setEditLocForm({...editLocForm, width_m: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">T (m)</label>
                   <input type="number" step="0.1" min="0" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 text-center" value={editLocForm.height_m} onChange={e => setEditLocForm({...editLocForm, height_m: Number(e.target.value)})} />
                 </div>
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Max Load (Kg)</label>
                 <input type="number" min="0" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={editLocForm.max_weight_kg} onChange={e => setEditLocForm({...editLocForm, max_weight_kg: Number(e.target.value)})} />
               </div>
               
               <button disabled={submitting} type="submit" className="w-full h-12 mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center">
                 {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Perubahan"}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
