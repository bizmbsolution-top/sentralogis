'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Plus, Search, Edit2, Trash2, X, Loader2, Truck, Filter, 
  Calendar, AlertCircle, CheckCircle2, MoreVertical, RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Box } from 'lucide-react';
import { useStatusSync } from '@/lib/hooks/useStatusSync';

interface Fleet {
  id: string;
  fleet_code: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  stnk_number: string;
  stnk_expiry: string;
  kir_expiry: string;
  status: 'available' | 'on_road' | 'maintenance' | 'expired';
  is_active: boolean;
  tenant_id: string;
  entity_id: string;
  fleet_type_id: string;
  vendor_tenant_id?: string;
  md_entities: { name: string; is_vendor?: boolean; vendor_tenant_id?: string };
  md_fleet_types: { type_name: string; icon_url?: string };
}

interface FleetGpsStatus {
  fleet_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  status_vehicle: number;
  engine_on: boolean;
  provider: string;
  gps_time: string;
  address: string | null;
}

export default function HQFleetsPage() {
  const { profile, loading: loadingAuth } = useAuth();
  const { syncStatus, loading: syncLoading, lastSync, lastResult } = useStatusSync({ autoSync: false });
  
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [gpsMap, setGpsMap] = useState<Record<string, FleetGpsStatus>>({});
  const [vendors, setVendors] = useState<{id: string, name: string}[]>([]);
  const [fleetTypes, setFleetTypes] = useState<{id: string, type_name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendor, setFilterVendor] = useState('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFleet, setSelectedFleet] = useState<Fleet | null>(null);
  const [tenantCodeMap, setTenantCodeMap] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    entity_id: '',
    fleet_type_id: '',
    plate_number: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    stnk_number: '',
    stnk_expiry: '',
    kir_expiry: '',
    status: 'available',
    is_active: true,
  });

  // Sync tenant info
  useEffect(() => {
    if (profile?.tenant_id) {
      setTenantId(profile.tenant_id);
    }
  }, [profile]);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const { data: fleetData, error: fleetError } = await supabase
        .from('md_fleets')
        .select('*, md_entities(name, is_vendor, vendor_tenant_id), md_fleet_types(type_name, icon_url)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (fleetError) throw fleetError;

      // Resolve tenant codes for cross-tenant vendor badges
      const vendorTenantIds = new Set<string>();
      for (const f of fleetData || []) {
        if (f.vendor_tenant_id) vendorTenantIds.add(f.vendor_tenant_id);
      }
      if (vendorTenantIds.size > 0) {
        const { data: tenantRows } = await supabase
          .from('tenants')
          .select('id, tenant_code')
          .in('id', [...vendorTenantIds]);
        const map: Record<string, string> = {};
        for (const t of tenantRows || []) map[t.id] = t.tenant_code || '';
        setTenantCodeMap(map);
      }

      const { data: vendorData } = await supabase
        .from('md_entities')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_vendor', true)
        .eq('vendor_type', 'TRANSPORTER')
        .eq('is_active', true);
      
      const { data: typeData } = await supabase
        .from('md_fleet_types')
        .select('id, type_name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      // Fetch the actual internal entity (vendor_type IS NULL = pure internal HQ)
      const companyName = profile?.tenants?.name || 'INTERNAL HQ';

      const { data: internalEntity } = await supabase
        .from('md_entities')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_vendor', false)
        .is('vendor_type', null)
        .limit(1)
        .maybeSingle();

      const ownEntity = internalEntity 
        ? [{ id: internalEntity.id, name: `(OWN) ${internalEntity.name}` }] 
        : [{ id: 'NEW_INTERNAL', name: `(OWN) ${companyName}` }];

      setVendors([...ownEntity, ...(vendorData || [])]);
      setFleets(fleetData || []);
      setFleetTypes(typeData || []);

      // Fetch live GPS status for all fleets
      const fleetIds = (fleetData || []).map((f: any) => f.id);
      if (fleetIds.length > 0) {
        const { data: gpsData } = await supabase
          .from('fleet_gps_status')
          .select('fleet_id, latitude, longitude, speed, status_vehicle, engine_on, provider, gps_time, address')
          .in('fleet_id', fleetIds);

        const map: Record<string, FleetGpsStatus> = {};
        for (const g of gpsData || []) {
          map[g.fleet_id] = g;
        }
        setGpsMap(map);
      }
    } catch (error: any) {
      toast.error('Gagal mengambil data master');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchData();
    } else if (!loadingAuth) {
      setLoading(false);
    }
  }, [tenantId, fetchData, loadingAuth]);

  const generateFleetCode = async () => {
    // Generate a short, unique, time-based code: e.g. FLT-LQKX2Z
    return `FLT-${Date.now().toString(36).toUpperCase()}`;
  };

  const handleSubmit = async () => {
    if (!tenantId) {
      toast.error('Identitas Tenant belum dimuat.');
      return;
    }
    
    if (!formData.stnk_expiry || !formData.kir_expiry) {
      toast.error('Tanggal STNK dan KIR wajib diisi.');
      return;
    }

    setSubmitting(true);

    try {
      let targetEntityId = formData.entity_id;

      // Handle OWN selection
      if (formData.entity_id === 'NEW_INTERNAL') {
          // Create a dedicated internal entity
          const companyName = profile?.tenants?.name || 'INTERNAL HQ';
          const entityCode = `INT-${companyName.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
          const { data: newEntity, error: createError } = await supabase
            .from('md_entities')
            .insert({
              tenant_id: tenantId,
              entity_code: entityCode,
              name: companyName,
              is_vendor: false,
              vendor_type: null,
              is_active: true
            })
            .select()
            .single();
          
          if (createError) throw createError;
          targetEntityId = newEntity.id;
      }

      if (selectedFleet) {
        const { error } = await supabase
          .from('md_fleets')
          .update({
            entity_id: targetEntityId,
            fleet_type_id: formData.fleet_type_id,
            plate_number: (formData.plate_number || '').toUpperCase(),
            brand: formData.brand,
            model: formData.model,
            year: formData.year,
            stnk_number: formData.stnk_number,
            stnk_expiry: formData.stnk_expiry || null,
            kir_expiry: formData.kir_expiry || null,
            status: formData.status,
            is_active: formData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedFleet.id);

        if (error) throw error;
        toast.success('Data armada berhasil diupdate');
      } else {
        const code = await generateFleetCode();
        const { error } = await supabase
          .from('md_fleets')
          .insert({
            tenant_id: tenantId,
            fleet_code: code,
            entity_id: targetEntityId,
            fleet_type_id: formData.fleet_type_id,
            plate_number: (formData.plate_number || '').toUpperCase(),
            brand: formData.brand,
            model: formData.model,
            year: formData.year,
            stnk_number: formData.stnk_number,
            stnk_expiry: formData.stnk_expiry || null,
            kir_expiry: formData.kir_expiry || null,
            status: formData.status,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success('Armada baru berhasil ditambahkan');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Final Fleet Catch Error:', JSON.stringify(error, null, 2), error);
      
      if (error?.code === '23505' && error?.message?.includes('plate_number_key')) {
        toast.error('Nomor Plat armada ini sudah terdaftar di sistem! Silakan gunakan plat yang berbeda.', { duration: 5000 });
      } else {
        toast.error(error?.message || error?.details || 'Gagal menyimpan armada.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFleet) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('md_fleets')
        .delete()
        .eq('id', selectedFleet.id);

      if (error) throw error;
      toast.success('Armada berhasil dihapus');
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error('Gagal menghapus data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenModal = (fleet: Fleet | null = null) => {
    if (fleet) {
      setSelectedFleet(fleet);
      setFormData({
        entity_id: fleet.entity_id,
        fleet_type_id: fleet.fleet_type_id,
        plate_number: fleet.plate_number,
        brand: fleet.brand || '',
        model: fleet.model || '',
        year: fleet.year || new Date().getFullYear(),
        stnk_number: fleet.stnk_number || '',
        stnk_expiry: fleet.stnk_expiry,
        kir_expiry: fleet.kir_expiry,
        status: fleet.status,
        is_active: fleet.is_active,
      });
    } else {
      setSelectedFleet(null);
      setFormData({
        entity_id: '',
        fleet_type_id: '',
        plate_number: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        stnk_number: '',
        stnk_expiry: '',
        kir_expiry: '',
        status: 'available',
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const getStatusBadge = (fleet: Fleet) => {
    const today = new Date();
    const stnkExpiry = new Date(fleet.stnk_expiry);
    const kirExpiry = new Date(fleet.kir_expiry);
    
    if (stnkExpiry < today || kirExpiry < today) {
      return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Expired</span>;
    }

    const diffSTNK = Math.ceil((stnkExpiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const diffKIR = Math.ceil((kirExpiry.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffSTNK < 30 || diffKIR < 30) {
      return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Exp. Soon</span>;
    }

    let dbBadge: React.ReactNode;
    switch (fleet.status) {
      case 'available': dbBadge = <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Available</span>; break;
      case 'on_road': dbBadge = <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">On Road</span>; break;
      case 'maintenance': dbBadge = <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Maintenance</span>; break;
      default: dbBadge = <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-full uppercase tracking-wider">{fleet.status}</span>;
    }

    const gps = gpsMap[fleet.id];
    let gpsBadge: React.ReactNode = null;
    if (gps) {
      const gpsAge = gps.gps_time ? (Date.now() - new Date(gps.gps_time).getTime()) / 1000 / 60 : Infinity;
      if (gpsAge > 30) {
        gpsBadge = <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded-full">Stale</span>;
      } else if (gps.status_vehicle === 2) {
        gpsBadge = <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">{gps.speed > 0 ? `${gps.speed}km/h` : 'Driving'}</span>;
      } else if (gps.status_vehicle === 1) {
        gpsBadge = <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-bold rounded-full">Idle</span>;
      } else {
        gpsBadge = <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">Parked</span>;
      }
    } else {
      gpsBadge = <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[10px] font-bold rounded-full">No GPS</span>;
    }

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {dbBadge}
        {gpsBadge}
      </div>
    );
  };

  const filteredFleets = fleets.filter(f => {
    const matchesSearch = f.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) || f.fleet_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesVendor = true;
    if (filterVendor !== 'all') {
      if (filterVendor === 'OWN') {
        matchesVendor = (f.md_entities as any)?.is_vendor === false;
      } else {
        matchesVendor = f.entity_id === filterVendor;
      }
    }
    
    return matchesSearch && matchesVendor;
  });

  const handleSync = async () => {
    const result = await syncStatus(false);
    if (result.success && result.summary) {
      const total = result.summary.total_resets;
      if (total > 0) {
        toast.success(`Synced: ${result.summary.drivers_reset} drivers, ${result.summary.fleets_reset} fleets reset to available`);
        fetchData(); // Refresh the fleet list
      } else {
        toast.success('All statuses are in sync');
      }
    } else if (result.error) {
      toast.error(`Sync failed: ${result.error}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
         <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-sky-600 text-white rounded-xl flex items-center justify-center shadow-sm">
                  <Truck size={22} />
               </div>
               <div>
                  <p className="text-xs font-medium text-sky-600 uppercase tracking-wide">Fleet Management</p>
                  <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">Fleets</h1>
               </div>
            </div>

             <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                <button
                  onClick={handleSync}
                  disabled={syncLoading}
                  className="h-10 px-4 bg-white border border-slate-200 hover:border-sky-500 hover:text-sky-600 text-slate-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-50"
                  title="Sync driver/fleet statuses"
                >
                  <RefreshCw size={16} className={syncLoading ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">Sync Status</span>
                </button>

                <div className="relative group w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-600 transition-colors" size={16} />
                  <input 
                     type="text" 
                     placeholder="Search fleet..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 transition-all outline-none"
                  />
               </div>

               <Button 
                  onClick={() => handleOpenModal()}
                  className="h-10 px-5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-sm shadow-sm flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
               >
                  <Plus size={16} /> Add Fleet
               </Button>
            </div>
         </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
             <div className="flex items-center gap-2 px-3 border-r border-slate-200">
                <Filter size={14} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-500">Entity:</span>
             </div>
             <select 
               value={filterVendor}
               onChange={(e) => setFilterVendor(e.target.value)}
               className="bg-transparent text-sm text-slate-700 outline-none cursor-pointer"
             >
               <option value="all">All Transporters</option>
               {vendors.map(v => (
                 <option key={v.id} value={v.id}>{v.name}</option>
               ))}
             </select>

             {/* Status Summary */}
             <div className="ml-auto flex items-center gap-4 text-xs">
               <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium">
                 Available: {fleets.filter(f => f.status === 'available').length}
               </span>
               <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                 Driving: {Object.values(gpsMap).filter(g => g.status_vehicle === 2).length}
               </span>
               <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-full font-medium">
                 Maintenance: {fleets.filter(f => f.status === 'maintenance').length}
               </span>
               <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded-full font-medium">
                 GPS Active: {Object.values(gpsMap).filter(g => {
                   const age = g.gps_time ? (Date.now() - new Date(g.gps_time).getTime()) / 1000 / 60 : Infinity;
                   return age <= 30;
                 }).length}/{fleets.length}
               </span>
             </div>
          </div>

          {/* Last Sync Info */}
          {lastSync && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw size={12} />
              <span>Last synced: {lastSync.toLocaleTimeString()}</span>
              {lastResult?.summary && lastResult.summary.total_resets > 0 && (
                <span className="text-emerald-600 font-medium">
                  ({lastResult.summary.drivers_reset} drivers, {lastResult.summary.fleets_reset} fleets reset)
                </span>
              )}
            </div>
          )}
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto">
         <Card className="overflow-hidden border border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Code</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Plate & Specs</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Type</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Owner</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {loading ? (
                        <tr>
                           <td colSpan={6} className="px-4 py-16 text-center">
                              <Loader2 className="w-8 h-8 text-sky-600 animate-spin mx-auto mb-3" />
                              <p className="text-xs text-slate-400">Loading fleets...</p>
                           </td>
                        </tr>
                     ) : filteredFleets.length === 0 ? (
                        <tr>
                           <td colSpan={6} className="px-4 py-16 text-center">
                              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                 <Truck size={24} className="text-slate-300" />
                              </div>
                              <p className="text-xs text-slate-400">No fleets found</p>
                           </td>
                        </tr>
                     ) : (
                        filteredFleets.map((f) => (
                           <tr key={f.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-4 py-3">
                                 <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded">
                                    {f.fleet_code}
                                 </span>
                              </td>
                              <td className="px-4 py-3">
                                 <div className="text-sm font-medium text-slate-900">{f.plate_number}</div>
                                 <div className="text-xs text-slate-400 mt-0.5">{f.brand} {f.model} · {f.year}</div>
                              </td>
                              <td className="px-4 py-3">
                                 <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden border border-slate-100">
                                       {f.md_fleet_types?.icon_url ? (
                                         <img src={f.md_fleet_types.icon_url} alt={f.md_fleet_types.type_name} className="w-full h-full object-cover" />
                                       ) : (
                                         <Box size={14} className="text-slate-300" />
                                       )}
                                    </div>
                                    <span className="text-sm text-slate-700">{f.md_fleet_types?.type_name || '-'}</span>
                                 </div>
                              </td>
                              <td className="px-4 py-3">
                                 <div className="flex items-center gap-2">
                                   <div className="text-sm text-slate-700">{f.md_entities?.name || 'Private HQ'}</div>
                                   {(f.vendor_tenant_id && f.vendor_tenant_id !== tenantId) && (
                                     <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-200">
                                       Vendor · {tenantCodeMap[f.vendor_tenant_id] || ''}
                                     </span>
                                   )}
                                 </div>
                              </td>
                              <td className="px-4 py-3">
                                 {getStatusBadge(f)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                 <div className="flex items-center justify-end gap-2">
                                    <button 
                                       onClick={() => handleOpenModal(f)}
                                       className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                                    >
                                       <Edit2 size={14} />
                                    </button>
                                    <button 
                                       onClick={() => { setSelectedFleet(f); setIsDeleteModalOpen(true); }}
                                       className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                    >
                                       <Trash2 size={14} />
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </Card>
      </div>

      {/* Modal & Delete Logic Same as Tenant Version */}
      {/* ... keeping it robust ... */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-none">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-900">{selectedFleet ? 'Edit Fleet' : 'Add New Fleet'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Transporter *</label>
                  <select required value={formData.entity_id} onChange={(e) => setFormData({...formData, entity_id: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">Select Transporter</option>
                    {vendors.map(v => (<option key={v.id} value={v.id}>{v.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Fleet Type *</label>
                  <select required value={formData.fleet_type_id} onChange={(e) => setFormData({...formData, fleet_type_id: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                    <option value="">Select Type</option>
                    {fleetTypes.map(t => (<option key={t.id} value={t.id}>{t.type_name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Plate Number *</label>
                  <input type="text" required value={formData.plate_number || ''} onChange={(e) => setFormData({...formData, plate_number: e.target.value.toUpperCase()})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black tracking-widest focus:border-sky-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Brand</label>
                  <input type="text" placeholder="e.g. HINO, ISUZU" value={formData.brand || ''} onChange={(e) => setFormData({...formData, brand: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-sky-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Model</label>
                  <input type="text" placeholder="e.g. RANGER, GIGA" value={formData.model || ''} onChange={(e) => setFormData({...formData, model: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-sky-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Manufacturing Year</label>
                  <input type="number" value={formData.year || ''} onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-sky-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">STNK Number</label>
                  <input type="text" value={formData.stnk_number || ''} onChange={(e) => setFormData({...formData, stnk_number: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-sky-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">STNK Expiry *</label>
                  <input type="date" required value={formData.stnk_expiry || ''} onChange={(e) => setFormData({...formData, stnk_expiry: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-sky-500 transition-all outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">KIR Expiry *</label>
                  <input type="date" required value={formData.kir_expiry || ''} onChange={(e) => setFormData({...formData, kir_expiry: e.target.value})} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm font-black focus:border-sky-500 transition-all outline-none" />
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                <button onClick={handleSubmit} disabled={submitting || !formData.plate_number || !formData.entity_id} className="px-8 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold text-sm shadow-lg shadow-slate-900/20">
                  {submitting ? 'Saving...' : 'Save Fleet'}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 shadow-2xl border-none">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Armada?</h3>
            <p className="text-slate-600 mb-8 leading-relaxed">Anda akan menghapus armada <strong className="text-slate-900">{selectedFleet?.plate_number}</strong>.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
              <button onClick={handleDelete} disabled={submitting} className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all font-medium text-sm">
                {submitting ? 'Deleting...' : 'Ya, Hapus'}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
