'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Truck, Search, Filter, Loader2, 
  MapPin, Calendar, Clock, ChevronRight, User,
  ClipboardList, AlertCircle, Activity,
  Package, CheckCircle, ArrowRight, AlertTriangle,
  Layers, ExternalLink, ShieldCheck, Box, Save, MessageCircle,
  X, Edit2, Plus, Trash2, GripVertical, FileText, DollarSign
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { saveAssignmentsAction } from '@/lib/actions/assignmentActions';
import {
  computeDriverReadiness,
} from '@/lib/domain/driver/readiness';
import {
  type AssignmentSlot,
  type TransporterOption,
  buildInitialAssignmentSlots,
  computeMaxJoCount,
  getActiveAssetIdsFromJos,
  getRouteOriginDest,
  mapTransportersForTenant,
  matchDriverAllowance,
  parseItemData,
  resolveIsVendor,
  computeMargin,
} from '@/lib/domain/jo/assignment';
import { buildDriverAssignmentMessage, buildWaLink } from '@/lib/domain/phone';

interface AssignmentModalProps {
  item: any;
  onClose: () => void;
  onSuccess: () => void;
  onHandover?: () => void;
  onSbuHandover?: () => void;
}

export default function AssignmentModal({ item, onClose, onSuccess, onHandover, onSbuHandover }: AssignmentModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  
  // Selection Data
  const [fleets, setFleets] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [transporters, setTransporters] = useState<TransporterOption[]>([]);
  const [transporterFleets, setTransporterFleets] = useState<any[]>([]);
  const [transporterDrivers, setTransporterDrivers] = useState<any[]>([]);
  const [driverReadiness, setDriverReadiness] = useState<Record<string, { ready: boolean; reason: string; hasAttendance: boolean; hasInspection: boolean; inspectionStatus: string }>>({});
  const [driverAllowances, setDriverAllowances] = useState<any[]>([]);

  const [assignments, setAssignments] = useState<AssignmentSlot[]>([]);
  const [existingJOs, setExistingJOs] = useState<any[]>([]);

  const itemData = parseItemData(item?.item_data);
  const dealPrice = Number(itemData.deal_price) || 0;
  const unitCount = Number(itemData.unit_count) || 1;
  const isHandoverApproved = itemData.handover_approved === true;
  const maxJOCount = computeMaxJoCount(itemData);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.tenant_id) return;
      setLoading(true);

      try {
        const tenantId = profile?.tenant_id;
        
        // 1. Fetch existing Job Orders first - without tenant_id filter since it might block due to RLS
        console.log('[AssignmentModal] Fetching JOs for item:', item.id);
        
        // Use simpler query like parent page - don't filter by status to avoid RLS issues
        // Fetch JOs - try without select to get all fields
        const { data: jos, error: joError } = await supabase
          .from('job_orders')
          .select('*')
          .eq('wo_item_id', item.id);

        console.log('[AssignmentModal] Found JOs:', jos?.length, 'error:', joError?.message, 'errorDetail:', joError);
        if (jos && jos.length > 0) {
          console.log('[AssignmentModal] First JO fields:', Object.keys(jos[0]));
          console.log('[AssignmentModal] First JO values:', { id: jos[0].id, driver_id: jos[0].driver_id, fleet_id: jos[0].fleet_id });
        }
        
        if (joError) {
          console.error('[AssignmentModal] Error fetching JOs:', joError);
        }
        
        setExistingJOs(jos || []);

        const assignedFleetIds = (jos || []).map(j => j.fleet_id).filter(Boolean);
        const assignedDriverIds = (jos || []).map(j => j.driver_id).filter(Boolean);

        const { activeFleetIds: activeJobFleets, activeDriverIds: activeJobDrivers } =
          getActiveAssetIdsFromJos(jos || []);

        // 2. Fetch available assets and transporters
        // [AI] Also fetch already-assigned fleets/drivers separately so they always appear in dropdowns
        // even if their status is on_road/is_working=true (they were assigned by this WO item)
        console.log('[AssignmentModal] Fetching assets. tenantId:', tenantId);
        console.log('[AssignmentModal] assignedFleetIds:', assignedFleetIds);
        console.log('[AssignmentModal] assignedDriverIds:', assignedDriverIds);
        console.log('[AssignmentModal] activeJobFleets:', activeJobFleets);
        console.log('[AssignmentModal] activeJobDrivers:', activeJobDrivers);

        const [fleetRes, driverRes, transporterRes, tfRes, tdRes, assignedFleetRes, assignedDriverRes] = await Promise.all([
          // Only show available fleets (include on_duty for checked-in but unassigned)
          (async () => {
            let query = supabase.from('md_fleets').select(`
              id,
              entity_id,
              fleet_code,
              plate_number,
              brand,
              model,
              status,
              fleet_type_id,
              md_fleet_types (type_name)
            `)
            .eq('is_active', true)
            .eq('tenant_id', tenantId)
            .in('status', ['available', 'maintenance', 'on_duty']);
            
            // Exclude fleets with active jobs if any exist
            if (activeJobFleets.length > 0) {
              const unquotedFleets = activeJobFleets.join(',');
              query = query.not('id', 'in', `(${unquotedFleets})`);
            }
            return query;
          })(),
          
          // Only show drivers who are available or on_duty (checked in but not yet assigned)
          (async () => {
            let query = supabase.from('md_drivers')
              .select('*, md_entities(is_vendor)')
              .eq('is_active', true)
              .eq('tenant_id', tenantId)
              .in('status', ['available', 'on_duty']);
            
            // Exclude drivers with active jobs if any exist
            if (activeJobDrivers.length > 0) {
              const unquotedDrivers = activeJobDrivers.join(',');
              query = query.not('id', 'in', `(${unquotedDrivers})`);
            }
            return query;
          })(),
          
          supabase.from('md_entities')
            .select('id, name, vendor_type, is_vendor, is_customer, is_own')
            .eq('tenant_id', tenantId)
            .eq('is_active', true),
            
          supabase.from('md_fleets').select('id, plate_number, brand, model, status, entity_id'),
          supabase.from('md_drivers').select('id, name, phone, entity_id, is_active').eq('is_active', true),
          
          // [AI] Fetch already-assigned fleets by their IDs regardless of status
          // This ensures the dropdown always shows the currently-assigned fleet even if it's on_road
          assignedFleetIds.length > 0
            ? supabase.from('md_fleets').select(`
                id, entity_id, fleet_code, plate_number, brand, model, status, fleet_type_id,
                md_fleet_types (type_name)
              `).in('id', assignedFleetIds)
            : Promise.resolve({ data: [], error: null }),
          
          // [AI] Fetch already-assigned drivers by their IDs regardless of is_working status
          // This ensures the dropdown always shows the currently-assigned driver even if is_working=true
          assignedDriverIds.length > 0
            ? supabase.from('md_drivers').select('*, md_entities(is_vendor)').in('id', assignedDriverIds)
            : Promise.resolve({ data: [], error: null })
        ]);

        console.log('[AssignmentModal] Promise.all results:', {
          fleetData: fleetRes.data?.length || 0, fleetError: fleetRes.error?.message,
          driverData: driverRes.data?.length || 0, driverError: driverRes.error?.message,
          transporterData: transporterRes.data?.length || 0, transporterError: transporterRes.error?.message,
          tfData: tfRes?.data?.length || 0, tfError: tfRes?.error?.message,
          tdData: tdRes?.data?.length || 0, tdError: tdRes?.error?.message,
          assignedFleetData: assignedFleetRes?.data?.length || 0, assignedFleetError: assignedFleetRes?.error?.message,
          assignedDriverData: assignedDriverRes?.data?.length || 0, assignedDriverError: assignedDriverRes?.error?.message,
        });

        if (fleetRes.error) console.error("[AssignmentModal] Error fetching fleets:", { code: fleetRes.error.code, message: fleetRes.error.message, details: fleetRes.error.details, hint: fleetRes.error.hint });
        if (driverRes.error) console.error("[AssignmentModal] Error fetching drivers:", { code: driverRes.error.code, message: driverRes.error.message, details: driverRes.error.details, hint: driverRes.error.hint });
        if (transporterRes.error) console.error("[AssignmentModal] Error fetching transporters:", { code: transporterRes.error.code, message: transporterRes.error.message, details: transporterRes.error.details, hint: transporterRes.error.hint });
        if (tfRes?.error) console.error("[AssignmentModal] Error fetching all fleets:", { code: tfRes.error.code, message: tfRes.error.message });
        if (tdRes?.error) console.error("[AssignmentModal] Error fetching all drivers:", { code: tdRes.error.code, message: tdRes.error.message });
        if (assignedFleetRes?.error) console.error("[AssignmentModal] Error fetching assigned fleets:", { code: assignedFleetRes.error.code, message: assignedFleetRes.error.message });
        if (assignedDriverRes?.error) console.error("[AssignmentModal] Error fetching assigned drivers:", { code: assignedDriverRes.error.code, message: assignedDriverRes.error.message });

        // [AI] Merge assigned fleets/drivers into the available lists so dropdowns always show them
        let availableFleets = fleetRes.data || [];
        const assignedFleets = assignedFleetRes?.data || [];
        const availableFleetIds = new Set(availableFleets.map(f => f.id));
        // Add assigned fleets that weren't in the available query (e.g. status=on_road)
        for (const af of assignedFleets) {
          if (!availableFleetIds.has(af.id)) {
            availableFleets.push(af);
            availableFleetIds.add(af.id);
          }
        }
        
        // Final deduplication for fleets just to be safe against duplicate keys
        availableFleets = availableFleets.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        
        let availableDrivers = driverRes.data || [];
        const assignedDriversList = assignedDriverRes?.data || [];
        const availableDriverIds = new Set(availableDrivers.map(d => d.id));
        // Add assigned drivers that weren't in the available query (e.g. is_working=true)
        for (const ad of assignedDriversList) {
          if (!availableDriverIds.has(ad.id)) {
            availableDrivers.push(ad);
            availableDriverIds.add(ad.id);
          }
        }
        
        // Final deduplication for drivers just to be safe
        availableDrivers = availableDrivers.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

        setFleets(availableFleets);
        setDrivers(availableDrivers);
        
        const tenantName = (profile?.tenants?.name || '').toUpperCase();
        const tenantCode = (profile?.tenant_code || '').toUpperCase();
        const trans = mapTransportersForTenant(
          transporterRes.data || [],
          tenantName,
          tenantCode
        );

        // [AI] Check readiness for internal drivers (attendance + inspection today)
        const today = new Date().toISOString().split('T')[0];
        const readinessMap: Record<string, { ready: boolean; reason: string; hasAttendance: boolean; hasInspection: boolean; inspectionStatus: string }> = {};
        
        for (const d of availableDrivers) {
          const transporter = trans.find(t => t.id === d.entity_id);
          const isInternal = transporter?.is_own || !transporter?.is_vendor;
          
          if (isInternal && d.id) {
            const [attRes, inspRes] = await Promise.all([
              supabase.from('driver_attendance').select('id').eq('driver_id', d.id).eq('status', 'CHECK_IN').gte('check_in', `${today}T00:00:00`).limit(1),
              supabase.from('fleet_inspections').select('status').eq('driver_id', d.id).gte('created_at', `${today}T00:00:00`).order('created_at', { ascending: false }).limit(1)
            ]);
            
            readinessMap[d.id] = computeDriverReadiness({
              driverStatus: d.status,
              hasAttendance: !!(attRes.data && attRes.data.length > 0),
              hasInspection: !!(inspRes.data && inspRes.data.length > 0),
              inspectionStatus: inspRes.data?.[0]?.status || 'N/A',
              isVendor: false,
            });
          } else {
            readinessMap[d.id] = computeDriverReadiness({
              isVendor: true,
              hasAttendance: true,
              hasInspection: true,
              inspectionStatus: 'N/A',
            });
          }
        }
        
        setDriverReadiness(readinessMap);
        
        console.log('[AssignmentModal] Assets Fetched:', {
          fleetsCount: availableFleets.length,
          driversCount: availableDrivers.length,
          transportersCount: trans.length,
          mergedAssignedFleets: assignedFleets.length,
          mergedAssignedDrivers: assignedDriversList.length,
          allFleets: availableFleets.map(f => f.id),
          allDrivers: availableDrivers.map(d => d.id)
        });
        
        console.log('[AssignmentModal] Vehicle type from itemData:', itemData?.vehicle_type_name);

        setTransporters(trans);

        const internalHqId = trans.find(t => t.is_own)?.id || '';
        const finalAssignments = buildInitialAssignmentSlots(
          (jos || []) as AssignmentSlot[],
          itemData,
          dealPrice,
          internalHqId
        );
        setAssignments(finalAssignments);
        const missingFleetIds = activeJobFleets.filter(id => !availableFleets.some(f => f.id === id));
        if (missingFleetIds.length > 0) {
           const { data: missingFleets } = await supabase.from('md_fleets').select(`
             id, entity_id, fleet_code, plate_number, brand, model, status, fleet_type_id,
             md_fleet_types (type_name)
           `).in('id', missingFleetIds);
           if (missingFleets) {
              setFleets(prev => {
                const combined = [...prev, ...missingFleets];
                return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
              });
           }
        }
        
        // [AI] Fetch driver allowances (ignore 404 if table doesn't exist yet)
        try {
          const { data: allowances, error: allowErr } = await supabase
            .from('md_driver_allowances')
            .select('*, md_fleet_types(type_name)')
            .eq('tenant_id', tenantId)
            .eq('is_active', true);
          if (allowances && !allowErr) setDriverAllowances(allowances);
        } catch(e) {
          // Table probably doesn't exist, ignore
        }

      } catch (err: any) {
        console.error('[AssignmentModal] Error:', err);
        toast.error('Gagal mengambil data referensi: ' + err.message);
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
    
    if (field === 'fleet_id') {
       const fleet = fleets.find(f => f.id === value);
       if (fleet) {
          const { origin, dest } = getRouteOriginDest(itemData);
          const found = matchDriverAllowance(
            driverAllowances,
            origin,
            dest,
            fleet.fleet_type_id
          );
          
          if (found) {
             updated[index].advance_amount = Number(found.amount) || 0;
             updated[index].save_to_master = false;
          } else {
             if (!updated[index].advance_amount) {
                updated[index].advance_amount = 0;
             }
             updated[index].save_to_master = true;
          }
       }
    }
    
    if (field === 'transporter_id') {
       updated[index].fleet_id = null;
       updated[index].driver_id = null;
       updated[index].driver_phone = '';
    }
    
    setAssignments(updated);
  };

  const handleSaveDraft = async () => {
    if (assigning) return;
    
    const tenantId = profile?.tenant_id;
    if (!tenantId) {
      toast.error('Tenant ID tidak ditemukan. Harap refresh halaman.');
      return;
    }

    setAssigning(true);

    try {
      const result = await saveAssignmentsAction({
        tenantId,
        woItem: {
          id: item.id,
          wo_id: item.wo_id,
          status: item.status,
          item_code: item.item_code,
          work_orders: item.work_orders,
          item_data: item.item_data,
        },
        assignments,
        mode: 'draft',
        dealPrice,
        transporters,
        drivers,
        fleets,
      });

      if (!result.success) {
        toast.error(`Gagal save draft: ${result.error}`);
        return;
      }

      toast.success('Draft saved — bisa lanjut edit nanti');
      onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Gagal save draft: ${errorMessage}`);
    } finally {
      setAssigning(false);
    }
  };

  const handleSave = async (nextAction?: () => void) => {
    if (assigning) return;
    
    const tenantId = profile?.tenant_id;
    if (!tenantId) {
      toast.error('Tenant ID tidak ditemukan. Harap refresh halaman.');
      return;
    }

    setAssigning(true);

    try {
      const result = await saveAssignmentsAction({
        tenantId,
        woItem: {
          id: item.id,
          wo_id: item.wo_id,
          status: item.status,
          item_code: item.item_code,
          work_orders: item.work_orders,
          item_data: item.item_data,
        },
        assignments,
        mode: nextAction ? 'handover' : 'confirm',
        dealPrice,
        transporters,
        drivers,
        fleets,
      });

      if (!result.success) {
        toast.error(result.error || 'Gagal menyimpan assignment');
        return;
      }

      if (result.isHandoverFlow) {
        toast.success(`${result.savedCount} JO(s) saved — proceeding to handover...`);
        nextAction?.();
      } else {
        toast.success('Assignment berhasil disimpan');
        onSuccess();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Gagal menyimpan assignment: ${errorMessage}`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
        
        {/* Header Section */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center border border-slate-200">
                <Activity size={20} />
             </div>
             <div>
                <h2 className="text-lg font-semibold text-slate-900">Assignment Console</h2>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-xs font-medium text-slate-500">{item.work_orders.wo_number}</p>
                   <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <p className="text-xs font-medium text-slate-600">
                      {isHandoverApproved ? `${maxJOCount}/${unitCount} Units (Locked)` : `${unitCount} Fleet Required`}
                    </p>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
          {/* WO Summary Card - FORMAL ENHANCED HEADER */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="md:col-span-3 bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col justify-center space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-semibold">
                       {itemData.vehicle_type_name || itemData.vehicle_type || '-'}
                    </div>
                    {isHandoverApproved && (
                      <div className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold flex items-center gap-1.5">
                        <ShieldCheck size={14} /> HANDOVER APPROVED — {maxJOCount} JO(s) LOCKED
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-slate-600 bg-white px-3 py-1 rounded border border-slate-200">
                      <MapPin size={14} className="text-slate-400" />
                      <div className="flex items-center gap-2 text-xs font-medium">
                        {(itemData.stops || []).map((stop: any, sIdx: number) => (
                           <span key={sIdx} className="flex items-center">
                              {stop.location_name || stop.name || '-'}
                              {sIdx < ((itemData.stops?.length ?? 0) - 1) && <span className="mx-2 text-slate-300">→</span>}
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
                   <p className="text-xs font-semibold text-slate-500 mb-1">CUSTOMER / BILL TO</p>
                   <div className="flex items-baseline gap-3">
                      <h3 className="text-xl font-bold text-slate-900">
                         {item.work_orders.md_entities.name}
                      </h3>
                      {item.work_orders.md_entities.legal_name && (
                        <span className="text-sm font-medium text-slate-500">
                           ({item.work_orders.md_entities.legal_name})
                        </span>
                      )}
                   </div>
                </div>
             </div>

             <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-center items-center text-center shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                   <DollarSign size={20} className="text-emerald-600" />
                </div>
                <p className="text-xs font-semibold text-slate-500 mb-1">HARGA JUAL (DEALS)</p>
                <p className="text-2xl font-bold text-slate-900">{formatRupiah(dealPrice)}</p>
                <p className="text-xs font-medium text-slate-400 mt-1">PER FLEET UNIT</p>
             </div>
          </div>

          <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                 <h3 className="text-sm font-semibold text-slate-900">
                   {isHandoverApproved ? `Locked Units (${maxJOCount} of ${unitCount} Original)` : 'Deploy Units'}
                 </h3>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                       <span className="text-xs font-medium text-slate-500">Live Syncing</span>
                    </div>
                 </div>
              </div>

             {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                   <Loader2 className="animate-spin text-slate-400" size={40} />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Loading data resources...</p>
                </div>
             ) : (
                <div className="space-y-4">
                  {assignments.map((assign, idx) => {
                    const selectedTransporter = assign.transporter_id 
                      ? transporters.find(t => t.id === assign.transporter_id)
                      : transporters.find(t => t.is_own);
                    const driverEntity = drivers.find(d => d.id === assign.driver_id)?.md_entities;
                    const isVendor = resolveIsVendor(selectedTransporter, driverEntity?.is_vendor);
                    const isOwn = selectedTransporter?.is_own;
                    const purchasePrice = Number(assign.purchase_price) || 0;
                    const effectiveBasePrice = Number(assign.base_price) > 0 ? Number(assign.base_price) : (Number(dealPrice) > 0 ? Number(dealPrice) : Number(itemData?.deal_price || 0));
                    const basePrice = effectiveBasePrice;
                    const sharePct = Number(assign.driver_share_percentage) || 0;
                   
                    const { margin, percent: marginPercent } = computeMargin(basePrice, purchasePrice);
                    const driverPayout = basePrice * (sharePct / 100);
                    
                    let marginStatus = "MARGIN AMAN";
                    let marginColor = "text-emerald-600 bg-emerald-50";
                    if (marginPercent <= 5) {
                      marginStatus = "MARGIN KRITIS";
                      marginColor = "text-rose-600 bg-rose-50 border border-rose-100";
                    } else if (marginPercent <= 15) {
                      marginStatus = "MARGIN TIPIS";
                      marginColor = "text-amber-600 bg-amber-50 border border-amber-100";
                    }

                     const getStatusFlag = (status: string, routes: any[]) => {
                       if (!status) return null;
                       if (status === 'accepted') return { text: 'MENUNGGU BERANGKAT', color: 'bg-amber-50 text-amber-700 border-amber-200' };
                       if (status === 'in_progress') {
                         const activeStop = routes?.find((r: any) => r.status === 'arrived');
                         if (activeStop) return { 
                           text: `TIBA DI ${activeStop.location_name?.toUpperCase()}`,
                           color: 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse'
                         };
                         const nextStop = routes?.find((r: any) => r.status === 'pending');
                         if (nextStop) return { 
                           text: `MENUJU ${nextStop.location_name?.toUpperCase()}`,
                           color: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                         };
                         return { text: 'MENUNGGU SELESAI', color: 'bg-slate-50 text-slate-600 border-slate-200 animate-pulse' };
                       }
                       if (status === 'completed') return { text: 'PEKERJAAN SELESAI', color: 'bg-emerald-600 text-white border-emerald-500 shadow-sm' };
                       return { text: status.toUpperCase().replace(/_/g, ' '), color: 'bg-slate-100 text-slate-500 border-slate-200' };
                     };

                    const statusFlag = assign.id ? getStatusFlag(assign.status || '', []) : null;

                    return (
                      <div key={idx} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:border-slate-300 transition-colors relative overflow-hidden">
                        {statusFlag && (
                           <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-lg text-[10px] font-semibold uppercase border-l border-b ${statusFlag.color}`}>
                              {statusFlag.text}
                           </div>
                        )}
                        
                        <div className="absolute top-0 left-0 px-3 py-1 bg-slate-100 text-slate-600 border-r border-b border-slate-200 rounded-br-lg text-[10px] font-semibold uppercase">
                            Unit {idx + 1} - {itemData.vehicle_type_name || itemData.vehicle_type}
                        </div>

                        {assign.id && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100">
                             <div 
                               className="h-full bg-blue-500 transition-all duration-1000" 
                               style={{ width: '0%' }}
                             />
                          </div>
                        )}

                        <div className="flex flex-wrap items-end gap-4 mt-8">
                           <div className="flex-1 min-w-[200px] space-y-1">
                              <label className="text-xs font-medium text-slate-500">Vendor / Transporter</label>
                              <select
                                value={assign.transporter_id || ""}
                                onChange={(e) => handleAssignmentChange(idx, 'transporter_id', e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors outline-none"
                              >
                                <option value="">Pilih Vendor / Transporter</option>
                                {assign.transporter_id && !transporters.some(t => t.id === assign.transporter_id) && (
                                   <option value={assign.transporter_id} className="text-slate-500">Legacy Transporter (ID: {assign.transporter_id.substring(0,6)}...)</option>
                                )}
                                {transporters.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                           </div>

                           <div className="flex-1 min-w-[150px] space-y-1">
                              <label className="text-xs font-medium text-slate-500">Fleet / Armada</label>
                              <select
                                value={assign.fleet_id ? String(assign.fleet_id) : ""}
                                onChange={(e) => handleAssignmentChange(idx, 'fleet_id', e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors outline-none"
                              >
                                <option value="">Pilih Armada</option>
                                {(() => {
                                  const requestedType = (itemData.vehicle_type_name || itemData.vehicle_type || '').toUpperCase();
                                  const selectedTrans = transporters.find(t => t.id === assign.transporter_id);
                                  const filteredFleets = fleets.filter(f => {
                                    if (f.id === assign.fleet_id) return true;
                                    return selectedTrans?.is_own ? (!f.entity_id || f.entity_id === selectedTrans.id) : (f.entity_id === assign.transporter_id);
                                  });
                                  const assignedFleet = fleets.find(f => f.id === assign.fleet_id);
                                  if (assignedFleet && !filteredFleets.find(f => f.id === assignedFleet.id)) {
                                    filteredFleets.unshift(assignedFleet);
                                  }
                                  if (filteredFleets.length === 0) {
                                    return <option disabled className="text-rose-500 font-medium">Maaf, Anda belum memiliki unit {requestedType}</option>;
                                  }
                                  return filteredFleets.map(f => {
                                    const isBusy = f.status === 'on_road' && assign.fleet_id !== f.id;
                                    return (
                                      <option key={f.id} value={f.id} disabled={isBusy} className={isBusy ? 'text-rose-500' : 'text-slate-800'}>
                                        {f.md_fleet_types?.type_name || 'Fleet'} - {f.plate_number} {isBusy ? ' [BUSY / ON ROAD]' : ` (${f.status?.toUpperCase() || 'AVAILABLE'})`}
                                      </option>
                                    );
                                  });
                                })()}
                              </select>
                           </div>

                           <div className="flex-1 min-w-[150px] space-y-1">
                              <label className="text-xs font-medium text-slate-500">Driver / Sopir</label>
                              <select
                                value={assign.driver_id ? String(assign.driver_id) : ""}
                                onChange={(e) => handleAssignmentChange(idx, 'driver_id', e.target.value)}
                                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors outline-none"
                              >
                                <option value="">Pilih Driver</option>
                                {(() => {
                                  const selectedTrans = assign.transporter_id ? transporters.find(t => t.id === assign.transporter_id) : null;
                                  const filteredDrivers = drivers.filter(d => {
                                    if (d.id === assign.driver_id) return true;
                                    if (!assign.transporter_id) return true;
                                    return selectedTrans?.is_own ? (!d.entity_id || d.entity_id === selectedTrans.id) : (d.entity_id === assign.transporter_id);
                                  });
                                  return filteredDrivers;
                                })().map(d => {
                                    const isBusy = d.status === 'on_road' && assign.driver_id !== d.id;
                                    const readiness = driverReadiness[d.id];
                                    const notReady = readiness && !readiness.ready && !isBusy;
                                    const readinessLabel = notReady ? ` [${readiness.reason.toUpperCase()}]` : '';
                                    
                                    return (
                                      <option key={d.id} value={d.id} disabled={isBusy || notReady} className={(isBusy || notReady) ? 'text-rose-500' : 'text-slate-800'}>
                                        {d.name} {isBusy ? ' [BUSY / ON ROAD]' : readinessLabel || ` (${d.status?.toUpperCase() || 'AVAILABLE'})`}
                                      </option>
                                    );
                                   })}
                              </select>
                           </div>

                           <div className={`flex-1 min-w-[200px] space-y-1 transition-opacity duration-300 ${isVendor ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                              <div className="flex justify-between items-center w-full pb-1">
                                 <label className="text-xs font-medium text-slate-500">Harga Beli (Vendor)</label>
                                 {isVendor && purchasePrice > 0 && (
                                    <div className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase ${marginColor}`}>
                                       {marginStatus} {marginPercent.toFixed(1)}%
                                    </div>
                                 )}
                              </div>
                              <div className="relative">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Rp</span>
                                 <input
                                   type="text"
                                   value={formatNumber(assign.purchase_price)}
                                   onChange={(e) => {
                                     const raw = e.target.value.replace(/\D/g, '');
                                     handleAssignmentChange(idx, 'purchase_price', raw ? parseInt(raw, 10) : 0);
                                   }}
                                   disabled={!isVendor}
                                   className="w-full h-10 pl-8 pr-3 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors outline-none"
                                   placeholder="0"
                                 />
                              </div>
                           </div>

                           {isVendor && (
                              <div className="flex-1 min-w-[200px] space-y-1 animate-in slide-in-from-top-2 duration-300">
                                 <div className="flex items-center pb-1">
                                    <label className="text-xs font-medium text-slate-500">Harga Jual (Customer)</label>
                                 </div>
                                 <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Rp</span>
                                    <input
                                      type="text"
                                      value={formatNumber(assign.base_price)}
                                      onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        handleAssignmentChange(idx, 'base_price', raw ? parseInt(raw, 10) : 0);
                                      }}
                                      className="w-full h-10 pl-8 pr-3 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors outline-none"
                                      placeholder="0"
                                    />
                                 </div>
                              </div>
                            )}

                            {isOwn && (
                              <>
                               <div className="flex-1 min-w-[200px] space-y-1 animate-in slide-in-from-top-2 duration-300">
                                  <div className="flex items-center pb-1">
                                     <label className="text-xs font-medium text-slate-500">Uang Jalan (Bagi Hasil)</label>
                                  </div>
                                  <div className="relative">
                                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Rp</span>
                                     <input
                                       type="text"
                                       value={formatNumber(assign.advance_amount)}
                                       onChange={(e) => {
                                         const raw = e.target.value.replace(/\D/g, '');
                                         handleAssignmentChange(idx, 'advance_amount', raw ? parseInt(raw, 10) : 0);
                                       }}
                                       className="w-full h-10 pl-8 pr-3 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors outline-none"
                                       placeholder="0"
                                     />
                                  </div>
                               </div>

                               <div className="flex-1 min-w-[200px] space-y-1 animate-in slide-in-from-top-2 duration-300 flex flex-col justify-end">
                                  <div className="h-10 flex items-center">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                      <div className="relative flex items-center justify-center">
                                        <input 
                                          type="checkbox" 
                                          checked={assign.save_to_master || false}
                                          onChange={(e) => handleAssignmentChange(idx, 'save_to_master', e.target.checked)}
                                          className="peer appearance-none w-4 h-4 border border-slate-300 rounded checked:border-indigo-500 checked:bg-indigo-500 transition-all cursor-pointer"
                                        />
                                        <CheckCircle size={12} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">Simpan Master</span>
                                        <span className="text-[10px] text-slate-500">Simpan tarif ini ke master data</span>
                                      </div>
                                    </label>
                                  </div>
                               </div>
                              </>
                            )}

                           <div className="flex-1 min-w-[40px] space-y-1 flex flex-col justify-end">
                              <div className="h-4"></div>
                              <div className="flex h-10 items-center">
                                 {assign.tracking_token && (
                                    <button
                                       onClick={() => {
                                          const driver = drivers.find(d => d.id === assign.driver_id);
                                          const driverName = driver?.name || 'Driver';
                                          const phone = assign.driver_phone || driver?.phone || '';
                                          if (!phone) { toast.error('Nomor telepon driver tidak ditemukan'); return; }
                                          const origin = window.location.origin;
                                          const isInternal = driver?.md_entities?.is_vendor === false;
                                          const link = isInternal
                                            ? `${origin}/driver/portal`
                                            : `${origin}/jo/${assign.driver_link_token || assign.id}`;
                                          const msg = buildDriverAssignmentMessage({
                                            driverName,
                                            isInternal,
                                            link,
                                          });
                                          window.open(buildWaLink(phone, msg), '_blank');
                                       }}
                                       className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-md flex items-center justify-center hover:bg-emerald-100 transition-colors border border-emerald-200"
                                       title="Send WA Link"
                                    >
                                       <MessageCircle size={18} />
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

        <div className="p-6 border-t border-slate-200 bg-white sticky bottom-0 z-10 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-4 text-slate-600">
              <ShieldCheck size={20} className="text-slate-500" />
              <div>
                 <p className="text-sm font-semibold text-slate-900">Mission Critical</p>
                 <p className="text-xs text-slate-500">Assign units to initiate operational phase</p>
              </div>
           </div>

            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <button
                onClick={handleSaveDraft}
                disabled={assigning}
                className="flex-1 md:flex-none px-6 h-10 rounded-md font-medium text-sm bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Save size={16} /> Save Draft
              </button>
              {onHandover && (
                <button
                  type="button"
                  onClick={() => handleSave(onHandover)}
                  disabled={assigning}
                  className="flex-1 md:flex-none px-6 h-10 rounded-md font-medium text-sm bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <AlertTriangle size={16} /> Handover to HQ
                </button>
              )}
             <button
               onClick={onClose}
               className="flex-1 md:flex-none px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all border border-slate-200"
               disabled={assigning}
             >
               Cancel
             </button>
             <button
               onClick={() => handleSave()}
               disabled={assigning}
               className="flex-1 md:flex-none px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_4px_20px_rgba(79,70,229,0.25)] hover:shadow-[0_4px_30px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
             >
               {assigning ? (
                 <><Loader2 className="animate-spin" size={18} /> Processing...</>
               ) : (
                 <><CheckCircle size={18} /> Confirm Assignments</>
               )}
             </button>
            </div>
         </div>
      </div>
    </div>
  );
}
