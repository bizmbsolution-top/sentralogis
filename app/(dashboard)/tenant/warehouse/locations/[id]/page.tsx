"use client";

import { useEffect, useState, useCallback, use } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast, Toaster } from "react-hot-toast";
import Link from "next/link";
import { 
  Building, MapPin, ChevronLeft, LayoutGrid, 
  Plus, Loader2, X, Archive, Search, Trash2, Copy, Save
} from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function WarehouseZoningPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const warehouseId = resolvedParams.id;
  const { profile } = useAuth();
  
  const [warehouse, setWarehouse] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const defaultRow = {
    code: "",
    zone: "",
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

      // Fetch Locations/Zones
      const { data: locData, error: locError } = await supabase
        .from('md_warehouse_locations')
        .select('*')
        .eq('warehouse_id', warehouseId)
        .order('zone', { ascending: true })
        .order('rack', { ascending: true });
        
      if (locError) throw locError;
      setLocations(locData || []);

    } catch (err: any) {
      toast.error('Gagal memuat detail zonasi gudang.');
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, warehouseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredLocations = locations.filter(loc => 
    loc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.zone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.rack?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDuplicate = (index: number) => {
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

  const handleRemove = (index: number) => {
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
    setBulkFormData(newData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id) return;
    
    // Validasi basic
    const hasEmptyCode = bulkFormData.some(row => !row.code.trim());
    if (hasEmptyCode) {
      toast.error("Semua baris harus memiliki Location Code.");
      return;
    }

    setSubmitting(true);
    try {
      const payloads = bulkFormData.map(row => ({
        tenant_id: profile.tenant_id,
        warehouse_id: warehouseId,
        code: row.code.toUpperCase(),
        zone: row.zone.toUpperCase(),
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
      
      const { error } = await supabase.from('md_warehouse_locations').insert(payloads);
      if (error) throw error;
      
      toast.success(`${payloads.length} Lokasi/Zonasi berhasil ditambahkan.`);
      setShowModal(false);
      setBulkFormData([{ ...defaultRow, id: Date.now() }]);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan zonasi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Hapus zona/lokasi ${code}?`)) return;
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
            <Link href="/tenant/warehouse/locations" className="text-xs font-bold text-indigo-500 flex items-center gap-1 hover:text-indigo-600 transition-colors">
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
         <button 
           onClick={() => setShowModal(true)}
           className="h-12 px-6 bg-slate-900 hover:bg-black text-white rounded-2xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
         >
           <Plus className="w-4 h-4 text-indigo-400" /> Tambah Zonasi / Rak
         </button>
      </div>

      <Card className="bg-white border border-slate-200 shadow-sm !rounded-[2.5rem] overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Detail Storage Area</h3>
            <div className="relative w-72">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text" placeholder="Cari kode/zona..."
                 className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
                 value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>
         
         <div className="p-6 overflow-x-auto">
            {filteredLocations.length === 0 ? (
               <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                     <Archive className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Belum ada zonasi/rak yang diatur.</p>
               </div>
            ) : (
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-200">
                        <th className="px-4 py-4 whitespace-nowrap">Location Code</th>
                        <th className="px-4 py-4 whitespace-nowrap">Tipe / Method</th>
                        <th className="px-4 py-4 whitespace-nowrap">Zone / Rack / Bin</th>
                        <th className="px-4 py-4 whitespace-nowrap text-right">Dimensi (P x L x T)</th>
                        <th className="px-4 py-4 whitespace-nowrap text-right">Capacity (Vol / Wgt)</th>
                        <th className="px-4 py-4 whitespace-nowrap text-right">Action</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {filteredLocations.map((loc) => (
                        <tr key={loc.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="px-4 py-4">
                              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black tracking-widest uppercase">
                                 {loc.code}
                              </span>
                           </td>
                           <td className="px-4 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase w-fit">
                                  {loc.location_type}
                                </span>
                                <span className="text-[9px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded uppercase w-fit border border-sky-100">
                                  {loc.storage_method || 'RACKING'}
                                </span>
                              </div>
                           </td>
                           <td className="px-4 py-4">
                              <p className="text-xs font-bold text-slate-900">Zone: <span className="text-indigo-600">{loc.zone || '-'}</span> | Rack: {loc.rack || '-'}</p>
                              <p className="text-xs font-bold text-slate-500">Shelf: {loc.shelf || '-'} | Bin: {loc.bin || '-'}</p>
                           </td>
                           <td className="px-4 py-4 text-right">
                              <p className="text-xs font-bold text-slate-900">
                                {loc.length_m || 0}m × {loc.width_m || 0}m × {loc.height_m || 0}m
                              </p>
                           </td>
                           <td className="px-4 py-4 text-right">
                              <p className="text-xs font-bold text-slate-900">{loc.max_volume_m3} M³</p>
                              <p className="text-xs font-bold text-slate-500">{loc.max_weight_kg} Kg</p>
                           </td>
                           <td className="px-4 py-4 text-right">
                              <button onClick={() => handleDelete(loc.id, loc.code)} className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            )}
         </div>
      </Card>

      {/* Modal Tambah Zonasi Bulk */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex flex-col p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full flex-1 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
               <div>
                  <h3 className="text-lg font-black text-slate-900">Tambah Location/Zonasi</h3>
                  <p className="text-xs text-slate-500">Daftarkan slot rak secara bulk/masal</p>
               </div>
               <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all">
                  <X size={20} />
               </button>
            </div>
            
            <div className="flex-1 overflow-x-auto overflow-y-auto p-6 bg-slate-100/50">
              <table className="w-full text-left min-w-[1200px]">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="pb-3 w-48">Location Code*</th>
                    <th className="pb-3 w-48">Hierarchy (Zone/Rack/Shelf/Bin)</th>
                    <th className="pb-3 w-40">Tipe Ops & Storage</th>
                    <th className="pb-3 w-48">Dimensi (P x L x T) m</th>
                    <th className="pb-3 w-32">Max Load (Kg)</th>
                    <th className="pb-3 w-24 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="space-y-4">
                  {bulkFormData.map((row, index) => (
                    <tr key={row.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm relative group">
                      <td className="p-3">
                        <input 
                          type="text" 
                          placeholder="Kode (e.g. Z-A1)" 
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500 uppercase"
                          value={row.code}
                          onChange={(e) => updateRow(index, 'code', e.target.value)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" placeholder="Zone" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded uppercase text-[10px] font-bold outline-none focus:border-indigo-500" value={row.zone} onChange={(e) => updateRow(index, 'zone', e.target.value)} />
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
                        <div className="grid grid-cols-3 gap-2">
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
                        <div className="flex items-center justify-center gap-2">
                          <button type="button" onClick={() => handleDuplicate(index)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="Duplicate Row">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleRemove(index)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Remove Row">
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
               <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-all">Batal</button>
               <button onClick={handleSubmit} disabled={submitting} type="button" className="px-8 py-3 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white rounded-xl text-sm font-black transition-all flex items-center gap-2">
                 {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4" />} Simpan {bulkFormData.length} Lokasi
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
