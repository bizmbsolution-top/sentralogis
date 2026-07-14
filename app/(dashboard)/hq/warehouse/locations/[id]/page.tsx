"use client";

import { useEffect, useState, useCallback, use } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast, Toaster } from "react-hot-toast";
import Link from "next/link";
import { 
  Building, MapPin, ChevronLeft, LayoutGrid, 
  Plus, Loader2, X, Archive, Search, Trash2, Copy, Save, Map, Layers, Box
} from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function WarehouseZoningPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const warehouseId = resolvedParams.id;
  const { profile } = useAuth();
  
  const [warehouse, setWarehouse] = useState<any>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [activeTab, setActiveTab] = useState<'AREAS' | 'LOCATIONS'>('AREAS');

  // Modals
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [areaForm, setAreaForm] = useState({
    area_code: "",
    area_name: "",
    area_type: "INDOOR_FLOOR",
    area_category: "GENERAL",
    storage_type: "PALLET_STACK",
    total_capacity: 0,
    uom_capacity: "PALLET",
    is_hazmat_certified: false,
    is_bonded_zone: false
  });

  const [zoneForm, setZoneForm] = useState({
    area_id: "",
    zone_code: "",
    zone_name: "",
    zone_status: "ACTIVE"
  });

  const defaultRow = {
    area_id: "",
    zone_id: "",
    code: "",
    zone: "", // Kept for legacy display compatibility if needed, but zone_id is primary
    rack: "",
    shelf: "",
    bin: "",
    location_type: "STORAGE",
    storage_method: "RACKING",
    length_m: 1,
    width_m: 1,
    height_m: 1,
    max_weight_kg: 1000
  };

  const [bulkFormData, setBulkFormData] = useState<any[]>([{ ...defaultRow, id: Date.now() }]);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id || !warehouseId) return;
    try {
      setLoading(true);
      // Fetch WH Data
      const { data: whData, error: whError } = await supabase
        .from('md_warehouses')
        .select('*')
        .eq('id', warehouseId)
        .eq('tenant_id', profile.tenant_id)
        .single();
      if (whError) throw whError;
      setWarehouse(whData);

      // Fetch Areas
      const { data: areaData, error: areaError } = await supabase
        .from('md_warehouse_areas')
        .select('*')
        .eq('warehouse_id', warehouseId)
        .order('area_code', { ascending: true });
      if (areaError) throw areaError;
      setAreas(areaData || []);

      // Fetch Zones
      if (areaData && areaData.length > 0) {
        const areaIds = areaData.map(a => a.id);
        const { data: zoneData, error: zoneError } = await supabase
          .from('md_warehouse_zones')
          .select('*')
          .in('area_id', areaIds)
          .order('zone_code', { ascending: true });
        if (zoneError) throw zoneError;
        setZones(zoneData || []);
      } else {
        setZones([]);
      }

      // Fetch Locations
      const { data: locData, error: locError } = await supabase
        .from('md_warehouse_locations')
        .select('*, md_warehouse_areas(area_code, area_name), md_warehouse_zones(zone_code, zone_name)')
        .eq('warehouse_id', warehouseId)
        .order('created_at', { ascending: true });
      if (locError) throw locError;
      setLocations(locData || []);

      // Fetch UOMs for capacity dropdown
      const { data: uomData } = await supabase
        .from('md_uoms')
        .select('name')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true);
      if (uomData) setUoms(uomData);

    } catch (err: any) {
      toast.error('Gagal memuat detail zonasi gudang.');
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, warehouseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filters
  const filteredAreas = areas.filter(a => 
    a.area_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.area_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLocations = locations.filter(loc => 
    loc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.md_warehouse_areas?.area_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.md_warehouse_zones?.zone_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers for Areas & Zones
  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    setSubmitting(true);
    try {
      const payload = {
        ...areaForm,
        tenant_id: profile.tenant_id,
        warehouse_id: warehouseId,
        area_code: areaForm.area_code.toUpperCase()
      };
      const { error } = await supabase.from('md_warehouse_areas').insert([payload]);
      if (error) {
        // Handle CHECK constraint failure dynamically if uom is custom
        if (error.message.includes('check_constraint') || error.message.includes('md_warehouse_areas_uom_capacity_check')) {
            toast.error('UOM Kapasitas tidak diizinkan oleh sistem dasar. Pilih PALLET, CBM, atau SQM.');
            setSubmitting(false);
            return;
        }
        throw error;
      }
      toast.success('Area berhasil ditambahkan.');
      setShowAreaModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan Area');
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
        ...zoneForm,
        tenant_id: profile.tenant_id,
        zone_code: zoneForm.zone_code.toUpperCase()
      };
      const { error } = await supabase.from('md_warehouse_zones').insert([payload]);
      if (error) throw error;
      toast.success('Zona berhasil ditambahkan.');
      setShowZoneModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan Zona');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteArea = async (id: string, code: string) => {
    if (!confirm(`Hapus Area ${code}? (Semua Zona & Lokasi di dalamnya akan ikut terhapus)`)) return;
    try {
      const { error } = await supabase.from('md_warehouse_areas').delete().eq('id', id);
      if (error) throw error;
      toast.success('Area berhasil dihapus.');
      fetchData();
    } catch (error: any) {
      toast.error('Gagal menghapus: ' + error.message);
    }
  };

  const handleDeleteZone = async (id: string, code: string) => {
    if (!confirm(`Hapus Zona ${code}?`)) return;
    try {
      const { error } = await supabase.from('md_warehouse_zones').delete().eq('id', id);
      if (error) throw error;
      toast.success('Zona berhasil dihapus.');
      fetchData();
    } catch (error: any) {
      toast.error('Gagal menghapus: ' + error.message);
    }
  };

  // Handlers for Locations
  const handleDuplicateRow = (index: number) => {
    const rowToCopy = bulkFormData[index];
    const newRow = { 
      ...rowToCopy, 
      id: Date.now() + Math.random(), 
      code: rowToCopy.code ? `${rowToCopy.code}-COPY` : "" 
    };
    const newData = [...bulkFormData];
    newData.splice(index + 1, 0, newRow);
    setBulkFormData(newData);
  };

  const handleRemoveRow = (index: number) => {
    if (bulkFormData.length === 1) {
      toast.error("Minimal harus ada 1 baris lokasi.");
      return;
    }
    setBulkFormData(bulkFormData.filter((_, i) => i !== index));
  };

  const handleAddRow = () => {
    setBulkFormData([...bulkFormData, { ...defaultRow, id: Date.now() + Math.random() }]);
  };

  const updateRow = (index: number, field: string, value: any) => {
    const newData = [...bulkFormData];
    newData[index][field] = value;
    
    // Automatically reset zone_id if area_id changes
    if (field === 'area_id') {
      newData[index].zone_id = "";
    }
    
    setBulkFormData(newData);
  };

  const handleSaveLocations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    
    const hasEmptyCode = bulkFormData.some(row => !row.code.trim());
    if (hasEmptyCode) {
      toast.error("Semua baris harus memiliki Location Code.");
      return;
    }

    const hasEmptyRelations = bulkFormData.some(row => !row.area_id || !row.zone_id);
    if (hasEmptyRelations) {
      toast.error("Semua baris lokasi wajib memilih Area dan Zona induk.");
      return;
    }

    setSubmitting(true);
    try {
      const payloads = bulkFormData.map(row => {
        // Match zone name for legacy field if needed
        const zoneObj = zones.find(z => z.id === row.zone_id);
        
        return {
          tenant_id: profile.tenant_id,
          warehouse_id: warehouseId,
          area_id: row.area_id,
          zone_id: row.zone_id,
          code: row.code.toUpperCase(),
          zone: zoneObj?.zone_code || "",
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
        }
      });
      
      const { error } = await supabase.from('md_warehouse_locations').insert(payloads);
      if (error) throw error;
      
      toast.success(`${payloads.length} Lokasi Storage berhasil ditambahkan.`);
      setShowLocationModal(false);
      setBulkFormData([{ ...defaultRow, id: Date.now() }]);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan lokasi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLocation = async (id: string, code: string) => {
    if (!confirm(`Hapus lokasi ${code}?`)) return;
    try {
      const { error } = await supabase.from('md_warehouse_locations').delete().eq('id', id);
      if (error) throw error;
      toast.success('Lokasi berhasil dihapus.');
      fetchData();
    } catch (error: any) {
      toast.error('Gagal menghapus lokasi: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Memuat Blueprint Gudang...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="top-center" />

      {/* Header & Back Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div className="flex flex-col gap-4">
            <Link href="/hq/warehouse/locations" className="text-xs font-bold text-indigo-500 flex items-center gap-1 hover:text-indigo-600 transition-colors">
               <ChevronLeft className="w-4 h-4" /> Kembali ke Daftar Lokasi
            </Link>
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm text-white">
                  <LayoutGrid className="w-6 h-6 text-indigo-400" />
               </div>
               <div>
                  <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">{warehouse?.name}</h1>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> {warehouse?.city}, {warehouse?.province}
                  </p>
               </div>
            </div>
         </div>
         <div className="flex items-center gap-3">
            {activeTab === 'AREAS' && (
              <button onClick={() => setShowAreaModal(true)} className="h-12 px-6 bg-slate-900 hover:bg-black text-white rounded-2xl text-sm font-bold shadow-sm transition-all flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" /> Tambah Area Baru
              </button>
            )}
            {activeTab === 'LOCATIONS' && (
              <button onClick={() => setShowLocationModal(true)} className="h-12 px-6 bg-slate-900 hover:bg-black text-white rounded-2xl text-sm font-bold shadow-sm transition-all flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" /> Tambah Slot/Rak Storage
              </button>
            )}
         </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('AREAS')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            activeTab === 'AREAS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Map className="w-4 h-4" /> Area & Zona Gudang
        </button>
        <button 
          onClick={() => setActiveTab('LOCATIONS')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            activeTab === 'LOCATIONS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Box className="w-4 h-4" /> Storage Locations
        </button>
      </div>

      {/* Content */}
      <Card className="bg-white border border-slate-200 shadow-sm !rounded-[2.5rem] overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              {activeTab === 'AREAS' ? 'Manajemen Denah (Macro)' : 'Detail Storage (Micro)'}
            </h3>
            <div className="relative w-72">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text" placeholder="Cari kode/nama..."
                 className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                 value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>
         
         <div className="p-6 overflow-x-auto min-h-[400px]">
            {/* TAB: AREAS & ZONES */}
            {activeTab === 'AREAS' && (
              <div className="space-y-6">
                {filteredAreas.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                        <Map className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Belum ada Area terdaftar.</p>
                  </div>
                ) : (
                  filteredAreas.map(area => (
                    <div key={area.id} className="border border-slate-200 rounded-3xl overflow-hidden group">
                      <div className="bg-slate-50 p-6 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-600 font-black">
                            {area.area_code}
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-slate-900">{area.area_name}</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1 flex items-center gap-2">
                              <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-700">{area.area_type}</span>
                              Kapasitas: {area.total_capacity} {area.uom_capacity}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => {
                              setZoneForm({...zoneForm, area_id: area.id});
                              setShowZoneModal(true);
                            }}
                            className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                          >
                            <Plus className="w-3 h-3" /> Tambah Zona
                          </button>
                          <button onClick={() => handleDeleteArea(area.id, area.area_code)} className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-6 bg-white border-t border-slate-100">
                        {zones.filter(z => z.area_id === area.id).length === 0 ? (
                          <p className="text-xs text-slate-400 italic">Belum ada Zona di dalam area ini.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {zones.filter(z => z.area_id === area.id).map(zone => (
                              <div key={zone.id} className="p-4 border border-slate-100 rounded-2xl hover:border-indigo-200 transition-colors flex justify-between items-start group/zone bg-slate-50/50">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Layers className="w-4 h-4 text-indigo-400" />
                                    <span className="text-sm font-black text-slate-900">{zone.zone_code}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium">{zone.zone_name}</p>
                                </div>
                                <button onClick={() => handleDeleteZone(zone.id, zone.zone_code)} className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500 rounded-lg transition-colors opacity-0 group-hover/zone:opacity-100">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: STORAGE LOCATIONS */}
            {activeTab === 'LOCATIONS' && (
              filteredLocations.length === 0 ? (
                 <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                       <Archive className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Belum ada storage location/rak yang diatur.</p>
                 </div>
              ) : (
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200">
                          <th className="px-4 py-4 whitespace-nowrap">Location Code</th>
                          <th className="px-4 py-4 whitespace-nowrap">Area / Zone</th>
                          <th className="px-4 py-4 whitespace-nowrap">Tipe / Method</th>
                          <th className="px-4 py-4 whitespace-nowrap">Rack / Bin</th>
                          <th className="px-4 py-4 whitespace-nowrap text-right">Capacity (Vol / Wgt)</th>
                          <th className="px-4 py-4 whitespace-nowrap text-right">Action</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {filteredLocations.map((loc) => (
                          <tr key={loc.id} className="hover:bg-slate-50/50 transition-colors group">
                             <td className="px-4 py-4">
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black tracking-widest uppercase border border-indigo-100">
                                   {loc.code}
                                </span>
                             </td>
                             <td className="px-4 py-4">
                                <p className="text-xs font-bold text-slate-900">{loc.md_warehouse_areas?.area_name || '-'}</p>
                                <p className="text-xs font-bold text-slate-500">{loc.md_warehouse_zones?.zone_name || '-'}</p>
                             </td>
                             <td className="px-4 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase w-fit">
                                    {loc.location_type}
                                  </span>
                                  <span className="text-[9px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded uppercase w-fit border border-sky-100">
                                    {loc.storage_method || '-'}
                                  </span>
                                </div>
                             </td>
                             <td className="px-4 py-4">
                                <p className="text-xs font-bold text-slate-900">Rak: <span className="text-indigo-600">{loc.rack || '-'}</span></p>
                                <p className="text-xs font-bold text-slate-500">Shelf: {loc.shelf || '-'} | Bin: {loc.bin || '-'}</p>
                             </td>
                             <td className="px-4 py-4 text-right">
                                <p className="text-xs font-bold text-slate-900">{loc.max_volume_m3} M³</p>
                                <p className="text-xs font-bold text-slate-500">{loc.max_weight_kg} Kg</p>
                             </td>
                             <td className="px-4 py-4 text-right">
                                <button onClick={() => handleDeleteLocation(loc.id, loc.code)} className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              )
            )}
         </div>
      </Card>

      {/* Modal Tambah Area */}
      {showAreaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <div>
                  <h3 className="text-lg font-black text-slate-900">Tambah Area Gudang</h3>
                  <p className="text-xs text-slate-500">Daftarkan ruang/fasilitas makro</p>
               </div>
               <button onClick={() => setShowAreaModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all">
                  <X size={20} />
               </button>
            </div>
            <form onSubmit={handleSaveArea} className="p-6 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kode Area</label>
                   <input required type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 uppercase" placeholder="YARD-01" value={areaForm.area_code} onChange={e => setAreaForm({...areaForm, area_code: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nama Area</label>
                   <input required type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" placeholder="Lapangan Terbuka" value={areaForm.area_name} onChange={e => setAreaForm({...areaForm, area_name: e.target.value})} />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipe Area</label>
                   <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={areaForm.area_type} onChange={e => setAreaForm({...areaForm, area_type: e.target.value})}>
                     <option value="YARD">YARD (Open Yard)</option>
                     <option value="INDOOR_FLOOR">INDOOR FLOOR</option>
                     <option value="RACKING">RACKING AREA</option>
                     <option value="COLD_FREEZER">COLD FREEZER</option>
                     <option value="COLD_CHILLER">COLD CHILLER</option>
                     <option value="HAZMAT">HAZMAT</option>
                     <option value="BONDED">BONDED (Kawasan Berikat)</option>
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Storage Type</label>
                   <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={areaForm.storage_type} onChange={e => setAreaForm({...areaForm, storage_type: e.target.value})}>
                     <option value="BULK_FLOOR">BULK FLOOR</option>
                     <option value="PALLET_STACK">PALLET STACK</option>
                     <option value="RACK_SELECTIVE">RACK SELECTIVE</option>
                     <option value="RACK_DRIVE_IN">RACK DRIVE IN</option>
                   </select>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kapasitas Maksimal</label>
                   <input type="number" min="0" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={areaForm.total_capacity} onChange={e => setAreaForm({...areaForm, total_capacity: Number(e.target.value)})} />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">UOM Kapasitas</label>
                   <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" value={areaForm.uom_capacity} onChange={e => setAreaForm({...areaForm, uom_capacity: e.target.value})}>
                     <option value="PALLET">PALLET</option>
                     <option value="CBM">CBM</option>
                     <option value="SQM">SQM</option>
                     {uoms.map(u => (
                        <option key={u.id || u.name} value={u.name}>{u.name}</option>
                     ))}
                   </select>
                 </div>
               </div>
               <button disabled={submitting} type="submit" className="w-full h-12 mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center">
                 {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Area"}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Zona */}
      {showZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <div>
                  <h3 className="text-lg font-black text-slate-900">Tambah Zona</h3>
                  <p className="text-xs text-slate-500">Sub-divisi dari suatu Area</p>
               </div>
               <button onClick={() => setShowZoneModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all">
                  <X size={20} />
               </button>
            </div>
            <form onSubmit={handleSaveZone} className="p-6 space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kode Zona</label>
                 <input required type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 uppercase" placeholder="ZA" value={zoneForm.zone_code} onChange={e => setZoneForm({...zoneForm, zone_code: e.target.value})} />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nama Zona</label>
                 <input required type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500" placeholder="Zona A" value={zoneForm.zone_name} onChange={e => setZoneForm({...zoneForm, zone_name: e.target.value})} />
               </div>
               <button disabled={submitting} type="submit" className="w-full h-12 mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-black transition-all flex items-center justify-center">
                 {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Zona"}
               </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Storage Locations (Bulk) */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex flex-col p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full flex-1 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
               <div>
                  <h3 className="text-lg font-black text-slate-900">Tambah Location/Storage Slot</h3>
                  <p className="text-xs text-slate-500">Daftarkan slot rak / titik floor secara bulk</p>
               </div>
               <button onClick={() => setShowLocationModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all">
                  <X size={20} />
               </button>
            </div>
            
            <div className="flex-1 overflow-x-auto overflow-y-auto p-6 bg-slate-100/50">
              <table className="w-full text-left min-w-[1400px]">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="pb-3 w-40">Location Code*</th>
                    <th className="pb-3 w-48">Induk (Area & Zona)*</th>
                    <th className="pb-3 w-40">Koordinat (Rack/Shelf/Bin)</th>
                    <th className="pb-3 w-32">Tipe Ops & Storage</th>
                    <th className="pb-3 w-40">Dimensi (P x L x T) m</th>
                    <th className="pb-3 w-28">Max Load (Kg)</th>
                    <th className="pb-3 w-20 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="space-y-4">
                  {bulkFormData.map((row, index) => (
                    <tr key={row.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm relative group">
                      <td className="p-3">
                        <input 
                          type="text" 
                          placeholder="Kode (Z-A1)" 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 uppercase"
                          value={row.code}
                          onChange={(e) => updateRow(index, 'code', e.target.value)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-2">
                          <select required className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:border-indigo-500" value={row.area_id} onChange={(e) => updateRow(index, 'area_id', e.target.value)}>
                            <option value="">Pilih Area...</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.area_code} - {a.area_name}</option>)}
                          </select>
                          <select required className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:border-indigo-500" value={row.zone_id} onChange={(e) => updateRow(index, 'zone_id', e.target.value)}>
                            <option value="">Pilih Zona...</option>
                            {zones.filter(z => z.area_id === row.area_id).map(z => <option key={z.id} value={z.id}>{z.zone_code} - {z.zone_name}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="grid grid-cols-3 gap-1">
                          <input type="text" placeholder="Rack" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded uppercase text-[10px] font-bold outline-none focus:border-indigo-500" value={row.rack} onChange={(e) => updateRow(index, 'rack', e.target.value)} />
                          <input type="text" placeholder="Shelf" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded uppercase text-[10px] font-bold outline-none focus:border-indigo-500" value={row.shelf} onChange={(e) => updateRow(index, 'shelf', e.target.value)} />
                          <input type="text" placeholder="Bin" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded uppercase text-[10px] font-bold outline-none focus:border-indigo-500" value={row.bin} onChange={(e) => updateRow(index, 'bin', e.target.value)} />
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-2">
                          <select className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold outline-none focus:border-indigo-500" value={row.location_type} onChange={(e) => updateRow(index, 'location_type', e.target.value)}>
                            <option value="STORAGE">STORAGE</option>
                            <option value="PICKING">PICKING</option>
                            <option value="RECEIVING">RECEIVING</option>
                            <option value="SHIPPING">SHIPPING</option>
                            <option value="QUARANTINE">QUARANTINE</option>
                            <option value="RETURN">RETURN</option>
                          </select>
                          <select className="w-full px-2 py-1.5 bg-slate-50 border border-sky-200 text-sky-800 rounded text-[10px] font-bold outline-none focus:border-sky-500" value={row.storage_method} onChange={(e) => updateRow(index, 'storage_method', e.target.value)}>
                            <option value="RACKING">RACKING</option>
                            <option value="FLOOR">FLOOR</option>
                            <option value="OPEN_YARD">OPEN YARD</option>
                            <option value="COLD_STORAGE">COLD STORAGE</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="grid grid-cols-3 gap-1">
                          <input type="number" min="0" step="0.1" placeholder="P(m)" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500 text-center" value={row.length_m} onChange={(e) => updateRow(index, 'length_m', Number(e.target.value))} />
                          <input type="number" min="0" step="0.1" placeholder="L(m)" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500 text-center" value={row.width_m} onChange={(e) => updateRow(index, 'width_m', Number(e.target.value))} />
                          <input type="number" min="0" step="0.1" placeholder="T(m)" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold outline-none focus:border-indigo-500 text-center" value={row.height_m} onChange={(e) => updateRow(index, 'height_m', Number(e.target.value))} />
                        </div>
                        <div className="mt-1 text-center text-[10px] text-slate-400 font-bold">
                          = {(row.length_m * row.width_m * row.height_m).toFixed(2)} M³
                        </div>
                      </td>
                      <td className="p-3">
                         <input type="number" min="0" placeholder="Kg" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500" value={row.max_weight_kg} onChange={(e) => updateRow(index, 'max_weight_kg', Number(e.target.value))} />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => handleDuplicateRow(index)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="Duplicate Row">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleRemoveRow(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Remove Row">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button type="button" onClick={handleAddRow} className="mt-4 px-4 py-2 border-2 border-dashed border-slate-300 text-slate-500 hover:border-indigo-500 hover:text-indigo-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors w-full bg-white">
                <Plus className="w-4 h-4" /> Tambah Baris Baru
              </button>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-4">
               <button type="button" onClick={() => setShowLocationModal(false)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-all">Batal</button>
               <button onClick={handleSaveLocations} disabled={submitting} type="button" className="px-8 py-3 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white rounded-xl text-sm font-black transition-all flex items-center gap-2">
                 {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4" />} Simpan {bulkFormData.length} Lokasi
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
