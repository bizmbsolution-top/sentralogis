'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  X, Truck, User, Phone, MapPin, 
  ChevronRight, Save, Loader2, ShieldCheck,
  Building2, Hash, Activity, Timer, Fuel,
  MessageCircle, Info, DollarSign, TrendingDown
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface AssignmentModalProps {
  item: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignmentModal({ item, onClose, onSuccess }: AssignmentModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  
  // Selection Data
  const [fleets, setFleets] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [transporters, setTransporters] = useState<any[]>([]);

  const [assignments, setAssignments] = useState<any[]>([]);
  const [existingJOs, setExistingJOs] = useState<any[]>([]);

  const itemData = typeof item.item_data === 'string' ? JSON.parse(item.item_data) : (item.item_data || {});
  const dealPrice = Number(itemData.deal_price) || 0;

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.tenant_id) return;
      setLoading(true);

      try {
        const tenantId = profile?.tenant_id;
        
        // 1. Fetch existing Job Orders first
        const { data: jos } = await supabase
          .from('job_orders')
          .select('*, routes:job_routes(*)')
          .eq('wo_item_id', item.id)
          .eq('tenant_id', tenantId)
          .not('status', 'eq', 'cancelled')
          .order('jo_number', { ascending: true });

        setExistingJOs(jos || []);

        const assignedFleetIds = (jos || []).map(j => j.fleet_id).filter(Boolean);
        const assignedDriverIds = (jos || []).map(j => j.driver_id).filter(Boolean);

        // 2. Fetch available assets and transporters
        // We use .or() to include specifically assigned items even if they are not 'available'
        const [fleetRes, driverRes, transporterRes] = await Promise.all([
          supabase.from('md_fleets').select(`
            id,
            entity_id,
            fleet_code,
            plate_number,
            brand,
            model,
            status,
            md_fleet_types (type_name)
          `)
          .eq('is_active', true)
          .eq('tenant_id', tenantId)
          .or(`status.eq.available${assignedFleetIds.length > 0 ? `,id.in.(${assignedFleetIds.join(',')})` : ''}`),
          
          supabase.from('md_drivers')
          .select('*')
          .eq('is_active', true)
          .eq('tenant_id', tenantId)
          .or(`status.eq.available${assignedDriverIds.length > 0 ? `,id.in.(${assignedDriverIds.join(',')})` : ''}`),
          
          supabase.from('md_entities')
            .select('id, name, is_vendor, tenant_id')
            .eq('tenant_id', tenantId)
            .eq('is_active', true)
        ]);

        setFleets(fleetRes.data || []);
        setDrivers(driverRes.data || []);
        
        const tenantNameFromProfile = (profile?.tenants?.name || '').toLowerCase().trim();
        const trans = (transporterRes.data || []).map(t => {
          const entityName = (t.name || '').toLowerCase();
          const isActuallyOwn = t.tenant_id === tenantId || (!t.is_vendor && (entityName.includes('internal') || entityName.includes('hq') || (tenantNameFromProfile && entityName.includes(tenantNameFromProfile))));
          
          return {
            id: t.id,
            name: isActuallyOwn ? `(OWN) ${t.name}` : t.name,
            is_vendor: t.is_vendor,
            is_own: isActuallyOwn
          };
        }).sort((a, b) => (a.is_own === b.is_own ? 0 : a.is_own ? -1 : 1));

        setTransporters(trans);

        // 3. Initialize assignments
        const unitCount = Number(itemData.unit_count) || 1;
        const internalHqId = trans.find(t => t.is_own)?.id || '';

        const initial = Array.from({ length: unitCount }).map((_, i) => {
          const existing = (jos || [])[i];
          if (existing) {
            return {
              id: existing.id,
              transporter_id: existing.transporter_id || '',
              fleet_id: existing.fleet_id || '',
              driver_id: existing.driver_id || '',
              driver_phone: existing.driver_phone || '',
              purchase_price: existing.purchase_price || 0,
              jo_number: existing.jo_number,
              tracking_token: existing.tracking_token,
              status: existing.status,
              routes: existing.routes || [],
              progress_percent: (() => {
                const stops = existing.routes || [];
                const totalPoints = stops.length * 2;
                let currentPoints = 0;
                stops.forEach((s: any) => {
                  if (s.status === 'completed') currentPoints += 2;
                  else if (s.status === 'arrived') currentPoints += 1;
                });
                return totalPoints > 0 ? (currentPoints / totalPoints) * 100 : 0;
              })()
            };
          }
          return {
            transporter_id: internalHqId,
            fleet_id: '',
            driver_id: '',
            driver_phone: '',
            purchase_price: 0
          };
        });
        setAssignments(initial);

      } catch (err) {
        toast.error('Gagal memuat data dropdown');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile?.tenant_id, item.id]);

  const handleAssignmentChange = (index: number, field: string, value: any) => {
    const updated = [...assignments];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'driver_id') {
      const driver = drivers.find(d => d.id === value);
      if (driver) updated[index].driver_phone = driver.phone;
    }
    
    if (field === 'transporter_id') {
       updated[index].fleet_id = '';
       updated[index].driver_id = '';
       updated[index].driver_phone = '';
    }
    
    setAssignments(updated);
  };

  const handleSave = async () => {
    setAssigning(true);
    try {
      for (let i = 0; i < assignments.length; i++) {
        const assign = assignments[i];
        
        // Validasi untuk vendor
        const selectedTransporter = transporters.find(t => t.id === assign.transporter_id);
        const isVendor = selectedTransporter?.is_vendor;
        
        if (isVendor && (!assign.purchase_price || assign.purchase_price <= 0)) {
          toast.error(`Harga beli untuk unit ${i+1} harus diisi untuk vendor`);
          setAssigning(false);
          return;
        }
        
        const payload = {
          wo_item_id: item.id,
          tenant_id: profile.tenant_id,
          transporter_id: assign.transporter_id,
          fleet_id: assign.fleet_id || null,
          driver_id: assign.driver_id || null,
          driver_phone: assign.driver_phone || null,
          purchase_price: Number(assign.purchase_price) || 0,
          updated_at: new Date().toISOString()
        };

        if (assign.id) {
          const { error: updErr } = await supabase.from('job_orders').update(payload).eq('id', assign.id);
          if (updErr) throw updErr;
          
          // Ensure routes exist (Self-healing)
          const { data: existingRoutes } = await supabase.from('job_routes').select('id').eq('job_order_id', assign.id);
          if (!existingRoutes || existingRoutes.length === 0) {
             const stops = itemData.stops || [];
             if (stops.length > 0) {
                const routePayloads = stops.map((stop: any, sIdx: number) => ({
                   job_order_id: assign.id,
                   sequence: sIdx + 1,
                   stop_type: stop.stop_type || (sIdx === 0 ? 'PICKUP' : 'DROPOFF'),
                   source_type: 'MD_LOCATION',
                   source_id: 'LEGACY',
                   location_name: stop.location_name || stop.name || '-',
                   address: stop.address || stop.location_address || '-',
                   contact_name: stop.contact_name || '-',
                   contact_phone: stop.contact_phone || '-',
                   status: 'pending'
                }));
                await supabase.from('job_routes').insert(routePayloads);
             }
          }
        } else {
          const jo_number = `${item.work_orders.wo_number}-JO-${String(i + 1).padStart(3, '0')}`;
          const { data: newJo, error: insErr } = await supabase.from('job_orders').insert({
            ...payload,
            jo_number,
            status: 'pending',
            tracking_token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            driver_link_token: Math.random().toString(36).substring(2, 15)
          }).select().single();
          
          if (insErr) throw insErr;

          // Create routes for new JO
          if (newJo) {
             const stops = itemData.stops || [];
             if (stops.length > 0) {
                const routePayloads = stops.map((stop: any, sIdx: number) => ({
                   job_order_id: newJo.id,
                   sequence: sIdx + 1,
                   stop_type: stop.stop_type || (sIdx === 0 ? 'PICKUP' : 'DROPOFF'),
                   source_type: 'MD_LOCATION',
                   source_id: 'LEGACY',
                   location_name: stop.location_name || stop.name || '-',
                   address: stop.address || stop.location_address || '-',
                   contact_name: stop.contact_name || '-',
                   contact_phone: stop.contact_phone || '-',
                   status: 'pending'
                }));
                await supabase.from('job_routes').insert(routePayloads);
             }
          }
        }
      }

      // Update parent status based on assignments
      const { error: woUpdateError } = await supabase
        .from('wo_items')
        .update({ status: 'assigned' })
        .eq('id', item.id);
      
      if (woUpdateError) throw woUpdateError;
      
      toast.success('Assignment berhasil disimpan');
      onSuccess();
    } catch (err) {
      toast.error('Gagal menyimpan assignment');
    } finally {
      setAssigning(false);
    }
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };

  const formatNumber = (val: any) => {
    if (val === undefined || val === null || val === '') return '';
    const num = val.toString().replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
        
        {/* Header Section */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-6">
             <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl rotate-3 group-hover:rotate-0 transition-transform">
                <Activity size={28} />
             </div>
             <div>
                <h2 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">Assignment Console</h2>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.work_orders.wo_number}</p>
                   <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{itemData.unit_count} Fleet Required</p>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-900">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/30">
          {/* WO Summary Card - ENHANCED HEADER */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="md:col-span-3 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm flex flex-col justify-center space-y-6">
                <div className="flex items-center gap-4">
                   <div className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic shadow-lg shadow-blue-500/20">
                      {itemData.vehicle_type_name || itemData.vehicle_type || '-'}
                   </div>
                   <div className="flex flex-wrap items-center gap-2 text-slate-400 bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-100">
                      <MapPin size={14} className="text-rose-500" />
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                        {(itemData.stops || []).map((stop: any, sIdx: number) => (
                           <span key={sIdx} className="flex items-center">
                              {stop.location_name || stop.name || '-'}
                              {sIdx < (itemData.stops?.length - 1) && <span className="mx-2 text-slate-300">→</span>}
                           </span>
                        ))}
                        {(!itemData.stops || itemData.stops.length === 0) && (
                           <span>
                              {itemData.origin_name || itemData.origin_location_name || '-'} 
                              <span className="mx-2 text-slate-300">→</span> 
                              {itemData.destination_name || itemData.destination_location_name || '-'}
                           </span>
                        )}
                      </div>
                   </div>
                </div>
                
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">CUSTOMER / BILL TO</p>
                   <div className="flex items-baseline gap-3">
                      <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
                         {item.work_orders.md_entities.name}
                      </h3>
                      {item.work_orders.md_entities.legal_name && (
                        <span className="text-sm font-bold text-slate-400 uppercase italic">
                           ({item.work_orders.md_entities.legal_name})
                        </span>
                      )}
                   </div>
                </div>
             </div>

             <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-8 flex flex-col justify-center items-center text-center shadow-inner">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                   <DollarSign size={24} className="text-emerald-600" />
                </div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">HARGA JUAL (DEALS)</p>
                <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{formatRupiah(dealPrice)}</p>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">PER FLEET UNIT</p>
             </div>
          </div>

          <div className="space-y-6">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] italic">Deploy Units</h3>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Syncing</span>
                   </div>
                </div>
             </div>

             {loading ? (
               <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="animate-spin text-slate-200" size={40} />
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Loading data resources...</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {assignments.map((assign, idx) => {
                   const isVendor = transporters.find(t => t.id === assign.transporter_id)?.is_vendor;
                   const purchasePrice = Number(assign.purchase_price) || 0;
                   const margin = dealPrice - purchasePrice;
                   const marginPercent = dealPrice > 0 ? (margin / dealPrice) * 100 : 0;
                   
                   let marginStatus = "MARGIN AMAN";
                   let marginColor = "text-emerald-600 bg-emerald-50";
                   if (marginPercent <= 5) {
                     marginStatus = "MARGIN KRITIS";
                     marginColor = "text-rose-600 bg-rose-50";
                   } else if (marginPercent <= 15) {
                     marginStatus = "MARGIN TIPIS";
                     marginColor = "text-amber-600 bg-amber-50";
                   }

                    const getStatusFlag = (status: string, routes: any[]) => {
                      if (!status) return null;
                      if (status === 'accepted') return { text: 'MENUNGGU BERANGKAT', color: 'bg-amber-100 text-amber-700 border-amber-200' };
                      if (status === 'in_progress') {
                        // 1. Current active stop (arrived)
                        const activeStop = routes?.find((r: any) => r.status === 'arrived');
                        if (activeStop) return { 
                          text: `TIBA DI ${activeStop.location_name?.toUpperCase()}`,
                          color: 'bg-emerald-100 text-emerald-700 border-emerald-200 animate-pulse'
                        };

                        // 2. Next pending stop (moving)
                        const nextStop = routes?.find((r: any) => r.status === 'pending');
                        if (nextStop) return { 
                          text: `MENUJU ${nextStop.location_name?.toUpperCase()}`,
                          color: 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse'
                        };

                        return { text: 'MENUNGGU SELESAI', color: 'bg-slate-100 text-slate-600 border-slate-200 animate-pulse' };
                      }
                      if (status === 'completed') return { text: 'PEKERJAAN SELESAI', color: 'bg-emerald-500 text-white border-emerald-600 shadow-sm' };
                      return { text: status.toUpperCase().replace(/_/g, ' '), color: 'bg-slate-50 text-slate-400 border-slate-200' };
                    };

                   const statusFlag = assign.id ? getStatusFlag(assign.status, assign.routes) : null;

                   return (
                     <div key={idx} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:border-slate-200 transition-all group relative overflow-hidden">
                        {statusFlag && (
                           <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest border-l border-b ${statusFlag.color} shadow-sm z-10`}>
                              {statusFlag.text}
                           </div>
                        )}
                        
                        {/* Granular Progress Pipeline */}
                        {assign.id && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-50 overflow-hidden">
                             <div 
                               className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                               style={{ width: `${assign.progress_percent || 0}%` }}
                             />
                          </div>
                        )}

                        <div className="flex flex-wrap items-end gap-6">
                           {/* Transporter */}
                           <div className="flex-1 min-w-[200px] space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendor / Transporter</label>
                              <select
                                value={assign.transporter_id}
                                onChange={(e) => handleAssignmentChange(idx, 'transporter_id', e.target.value)}
                                className="w-full h-12 px-4 bg-slate-50 border-transparent rounded-2xl text-xs font-black italic focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
                              >
                                {transporters.map(t => (
                                  <option key={t.id} value={t.id} className="not-italic">{t.name}</option>
                                ))}
                              </select>
                           </div>

                           {/* Fleet */}
                           <div className="flex-1 min-w-[150px] space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fleet / Armada</label>
                              <select
                                value={assign.fleet_id}
                                onChange={(e) => handleAssignmentChange(idx, 'fleet_id', e.target.value)}
                                className="w-full h-12 px-4 bg-slate-50 border-transparent rounded-2xl text-xs font-black italic focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
                              >
                                <option value="" className="not-italic">Pilih Armada</option>
                                {fleets
                                  .filter(f => {
                                      const selectedTransporter = transporters.find(t => t.id === assign.transporter_id);
                                      if (selectedTransporter?.is_own) {
                                         return f.tenant_id === profile.tenant_id || !f.entity_id;
                                      }
                                      return f.entity_id === assign.transporter_id || !assign.transporter_id;
                                   })
                                  .map(f => (
                                    <option key={f.id} value={f.id} className="not-italic">
                                      {f.md_fleet_types?.type_name || 'Fleet'} - {f.plate_number}
                                    </option>
                                  ))}
                              </select>
                           </div>

                           {/* Driver */}
                           <div className="flex-1 min-w-[150px] space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Driver / Sopir</label>
                              <select
                                value={assign.driver_id}
                                onChange={(e) => handleAssignmentChange(idx, 'driver_id', e.target.value)}
                                className="w-full h-12 px-4 bg-slate-50 border-transparent rounded-2xl text-xs font-black italic focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
                              >
                                <option value="" className="not-italic">Pilih Driver</option>
                                {drivers
                                  .filter(d => {
                                      const selectedTransporter = transporters.find(t => t.id === assign.transporter_id);
                                      if (selectedTransporter?.is_own) {
                                         return d.tenant_id === profile.tenant_id || !d.entity_id;
                                      }
                                      return d.entity_id === assign.transporter_id || !assign.transporter_id;
                                   })
                                  .map(d => (
                                    <option key={d.id} value={d.id} className="not-italic">{d.name}</option>
                                  ))}
                              </select>
                           </div>

                           {/* Purchase Price (If Vendor) */}
                           <div className={`flex-1 min-w-[200px] space-y-2 transition-all duration-500 ${isVendor ? 'opacity-100 scale-100' : 'opacity-30 grayscale pointer-events-none'}`}>
                              <div className="flex justify-between items-center px-1">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Harga Beli (Vendor)</label>
                                 {isVendor && purchasePrice > 0 && (
                                    <div className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm ${marginColor}`}>
                                       {marginStatus} {marginPercent.toFixed(1)}%
                                    </div>
                                 )}
                              </div>
                              <div className="flex gap-2">
                                 <div className="relative flex-1">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Rp</span>
                                    <input
                                      type="text"
                                      value={formatNumber(assign.purchase_price)}
                                      onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        handleAssignmentChange(idx, 'purchase_price', raw ? parseInt(raw) : 0);
                                      }}
                                      disabled={!isVendor}
                                      className="w-full h-12 pl-10 pr-4 bg-slate-50 border-transparent rounded-2xl text-xs font-black focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
                                      placeholder="0"
                                    />
                                 </div>
                                 {assign.tracking_token && (
                                    <button
                                       onClick={() => {
                                          const driver = drivers.find(d => d.id === assign.driver_id);
                                          const driverName = driver?.name || 'Driver';
                                          const phone = assign.driver_phone || driver?.phone || '';
                                          
                                          if (!phone) {
                                             toast.error('Nomor telepon driver tidak ditemukan');
                                             return;
                                          }

                                          // Format phone to international (62...)
                                          let formattedPhone = phone.replace(/\D/g, '');
                                          if (formattedPhone.startsWith('0')) {
                                             formattedPhone = '62' + formattedPhone.substring(1);
                                          }

                                          const origin = window.location.origin;
                                          const link = `${origin}/jo/${assign.tracking_token}`;
                                          const msg = `Halo ${driverName}, berikut link tracking untuk tugas Anda: ${link}`;
                                          window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                       }}
                                       className="h-12 w-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                                       title="Send WA Link"
                                    >
                                       <MessageCircle size={20} />
                                    </button>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                   );
                 })}
               </div>
             )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-white border-t border-slate-100 flex justify-between items-center sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="h-14 px-8 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            Cancel Process
          </button>
          
          <button
            onClick={handleSave}
            disabled={assigning}
            className="h-14 px-12 bg-slate-900 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
          >
            {assigning ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Save size={16} />
                Deploy & Sync Assignments
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
