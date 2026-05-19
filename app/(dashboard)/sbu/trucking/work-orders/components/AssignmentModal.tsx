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
  const [transporters, setTransporters] = useState<any[]>([]);
  const [transporterFleets, setTransporterFleets] = useState<any[]>([]);
  const [transporterDrivers, setTransporterDrivers] = useState<any[]>([]);
  const [driverReadiness, setDriverReadiness] = useState<Record<string, { ready: boolean; reason: string; hasAttendance: boolean; hasInspection: boolean; inspectionStatus: string }>>({});

  const [assignments, setAssignments] = useState<any[]>([]);
  const [existingJOs, setExistingJOs] = useState<any[]>([]);

  const itemData = typeof item?.item_data === 'string' ? JSON.parse(item.item_data) : (item?.item_data || {});
  const dealPrice = Number(itemData.deal_price) || 0;
  const unitCount = Number(itemData.unit_count) || 1;
  const isHandoverApproved = itemData.handover_approved === true;
  const maxJOCount = isHandoverApproved ? (Number(itemData.max_jo_count) || 0) : unitCount;

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

        // Get list of drivers/fleets that have active jobs (not completed)
        const activeJobDrivers = (jos || [])
          .filter(j => !['SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE'].includes(j.status))
          .map(j => j.driver_id)
          .filter(Boolean);
        
        const activeJobFleets = (jos || [])
          .filter(j => !['SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE'].includes(j.status))
          .map(j => j.fleet_id)
          .filter(Boolean);

        // 2. Fetch available assets and transporters
        // [AI] Also fetch already-assigned fleets/drivers separately so they always appear in dropdowns
        // even if their status is on_road/is_working=true (they were assigned by this WO item)
        const [fleetRes, driverRes, transporterRes, tfRes, tdRes, assignedFleetRes, assignedDriverRes] = await Promise.all([
          // Only show available fleets (not on_road, not non_active)
          (async () => {
            let query = supabase.from('md_fleets').select(`
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
            .in('status', ['available', 'maintenance']);
            
            // Exclude fleets with active jobs if any exist
            if (activeJobFleets.length > 0) {
              query = query.not('id', 'in', `(${activeJobFleets.join(',')})`);
            }
            return query;
          })(),
          
          // Only show drivers who are not currently working
          (async () => {
            let query = supabase.from('md_drivers')
              .select('*')
              .eq('is_active', true)
              .eq('tenant_id', tenantId)
              .eq('is_working', false);
            
            // Exclude drivers with active jobs if any exist
            if (activeJobDrivers.length > 0) {
              query = query.not('id', 'in', `(${activeJobDrivers.join(',')})`);
            }
            return query;
          })(),
          
          supabase.from('md_entities')
            .select('id, name, vendor_type, is_vendor, is_customer, is_own')
            .eq('tenant_id', tenantId)
            .eq('is_active', true),
            
          supabase.from('md_fleets').select('id, plate_number, truck_type, truck_brand, status, company_id'),
          supabase.from('md_drivers').select('id, name, phone, entity_id, is_active').eq('is_active', true),
          
          // [AI] Fetch already-assigned fleets by their IDs regardless of status
          // This ensures the dropdown always shows the currently-assigned fleet even if it's on_road
          assignedFleetIds.length > 0
            ? supabase.from('md_fleets').select(`
                id, entity_id, fleet_code, plate_number, brand, model, status,
                md_fleet_types (type_name)
              `).in('id', assignedFleetIds)
            : Promise.resolve({ data: [], error: null }),
          
          // [AI] Fetch already-assigned drivers by their IDs regardless of is_working status
          // This ensures the dropdown always shows the currently-assigned driver even if is_working=true
          assignedDriverIds.length > 0
            ? supabase.from('md_drivers').select('*').in('id', assignedDriverIds)
            : Promise.resolve({ data: [], error: null })
        ]);

        if (fleetRes.error) console.error("Error fetching fleets:", { code: fleetRes.error.code, message: fleetRes.error.message, details: fleetRes.error.details, hint: fleetRes.error.hint });
        if (driverRes.error) console.error("Error fetching drivers:", { code: driverRes.error.code, message: driverRes.error.message, details: driverRes.error.details, hint: driverRes.error.hint });
        if (transporterRes.error) console.error("Error fetching transporters:", { code: transporterRes.error.code, message: transporterRes.error.message, details: transporterRes.error.details, hint: transporterRes.error.hint });

        // [AI] Merge assigned fleets/drivers into the available lists so dropdowns always show them
        const availableFleets = fleetRes.data || [];
        const assignedFleets = assignedFleetRes?.data || [];
        const availableFleetIds = new Set(availableFleets.map(f => f.id));
        // Add assigned fleets that weren't in the available query (e.g. status=on_road)
        for (const af of assignedFleets) {
          if (!availableFleetIds.has(af.id)) {
            availableFleets.push(af);
          }
        }
        
        const availableDrivers = driverRes.data || [];
        const assignedDriversList = assignedDriverRes?.data || [];
        const availableDriverIds = new Set(availableDrivers.map(d => d.id));
        // Add assigned drivers that weren't in the available query (e.g. is_working=true)
        for (const ad of assignedDriversList) {
          if (!availableDriverIds.has(ad.id)) {
            availableDrivers.push(ad);
          }
        }

        setFleets(availableFleets);
        setDrivers(availableDrivers);
        
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
            
            const hasAttendance = attRes.data && attRes.data.length > 0;
            const hasInspection = inspRes.data && inspRes.data.length > 0;
            const inspectionStatus = inspRes.data?.[0]?.status || 'N/A';
            
            if (d.status === 'unavailable') {
              readinessMap[d.id] = { ready: false, reason: 'Sakit/Cuti', hasAttendance: false, hasInspection: false, inspectionStatus: 'N/A' };
            } else if (!hasAttendance) {
              readinessMap[d.id] = { ready: false, reason: 'Belum absen', hasAttendance: false, hasInspection: false, inspectionStatus: 'N/A' };
            } else if (!hasInspection) {
              readinessMap[d.id] = { ready: false, reason: 'Belum inspeksi', hasAttendance: true, hasInspection: false, inspectionStatus: 'N/A' };
            } else if (inspectionStatus === 'GROUNDED') {
              readinessMap[d.id] = { ready: false, reason: 'Fleet GROUNDED', hasAttendance: true, hasInspection: true, inspectionStatus: 'GROUNDED' };
            } else {
              readinessMap[d.id] = { ready: true, reason: 'Ready', hasAttendance: true, hasInspection: true, inspectionStatus: inspectionStatus };
            }
          } else {
            // Vendor drivers don't need attendance/inspection check
            readinessMap[d.id] = { ready: true, reason: 'Vendor', hasAttendance: true, hasInspection: true, inspectionStatus: 'N/A' };
          }
        }
        
        setDriverReadiness(readinessMap);
        
        console.log('[AssignmentModal] Assets Fetched:', {
          fleetsCount: availableFleets.length,
          driversCount: availableDrivers.length,
          transportersCount: transporterRes.data?.length || 0,
          mergedAssignedFleets: assignedFleets.length,
          mergedAssignedDrivers: assignedDriversList.length,
          allFleets: availableFleets.map(f => f.id),
          allDrivers: availableDrivers.map(d => d.id)
        });
        
        console.log('[AssignmentModal] Vehicle type from itemData:', itemData?.vehicle_type_name);
        
        const tenantName = (profile?.tenants?.name || '').toUpperCase();
        const tenantCode = (profile?.tenant_code || '').toUpperCase();

        const trans = (transporterRes.data || [])
          .filter(t => t.is_vendor || !t.is_customer) // Include vendors OR internal entities (not customers)
          .map(t => {
            const isActuallyOwn = !t.is_vendor || 
                                 t.name.toUpperCase().includes(tenantName) || 
                                 t.name.toUpperCase().includes(tenantCode) ||
                                 t.name.toUpperCase().includes('INTERNAL') ||
                                 t.name.toUpperCase().includes('(OWN)');
            
            return {
              id: t.id,
              name: isActuallyOwn && !t.name.includes('(OWN)') ? `(OWN) ${t.name}` : t.name,
              is_vendor: !isActuallyOwn,
              is_own: isActuallyOwn
            };
          }).sort((a, b) => (a.is_own === b.is_own ? 0 : a.is_own ? -1 : 1));

        setTransporters(trans);

        // 3. Initialize assignments: Show ALL existing JOs first, then add empty slots if count < maxJOCount
        const unitCount = Number(itemData.unit_count) || 1;
        const isHandoverApproved = itemData.handover_approved === true;
        const maxJOCount = isHandoverApproved ? (Number(itemData.max_jo_count) || 0) : unitCount;
        const internalHqId = trans.find(t => t.is_own)?.id || '';
        
        const existingAssignments = (jos || []).map(existing => {
          console.log('[AssignmentModal] Mapping JO:', existing.jo_number, 'transporter_id:', existing.transporter_id, 'driver_id:', existing.driver_id, 'fleet_id:', existing.fleet_id);
          return {
            id: existing.id,
            transporter_id: existing.transporter_id || null,
            fleet_id: existing.fleet_id,
            driver_id: existing.driver_id,
            driver_phone: existing.driver_phone || '',
            purchase_price: existing.purchase_price || 0,
            base_price: existing.base_price || dealPrice,
            driver_share_percentage: existing.driver_share_percentage || 40,
            advance_amount: existing.advance_amount || 0,
            advance_status: existing.advance_status || 'unpaid',
            wa_link_sent_at: existing.wa_link_sent_at,
            jo_number: existing.jo_number,
            tracking_token: existing.tracking_token,
            wa_token: existing.wa_token,
            status: existing.status || 'assigned',
            job_routes: [],
            progress_percent: 0
          };
        });

        const emptySlotsNeeded = isHandoverApproved ? 0 : Math.max(0, maxJOCount - existingAssignments.length);
        const emptySlots = Array.from({ length: emptySlotsNeeded }).map(() => ({
          transporter_id: internalHqId || null,
          fleet_id: null,
          driver_id: null,
          driver_phone: '',
          purchase_price: 0,
          base_price: dealPrice,
          driver_share_percentage: 40,
          status: 'draft',
          id: undefined,
          jo_number: undefined
        }));

        const finalAssignments = [...existingAssignments, ...emptySlots];
        console.log('[AssignmentModal] Setting assignments:', {
          existingCount: existingAssignments.length,
          emptyCount: emptySlots.length,
          total: finalAssignments.length,
          assignments: finalAssignments.map((a: any) => ({ 
            id: a.id, 
            jo_number: a.jo_number,
            transporter_id: a.transporter_id,
            driver_id: a.driver_id, 
            fleet_id: a.fleet_id,
            status: a.status
          }))
        });
        setAssignments(finalAssignments);

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
    console.log('[AssignmentModal] Saving draft for item:', item.id);

    try {
      // [AI] Save ALL assignments including partial ones (without fleet/driver)
      // This allows user to continue editing later
      const generateToken = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      };
      
      for (let i = 0; i < assignments.length; i++) {
        const assign = assignments[i];
        
        // Skip if no data at all (completely empty slot)
        if (!assign.id && !assign.transporter_id && !assign.fleet_id && !assign.driver_id) {
          continue;
        }
        
        const selectedTransporter = transporters.find(t => t.id === assign.transporter_id);
        const woNumber = item.work_orders?.wo_number || item.item_code;
        const joNumber = assign.jo_number || `${woNumber}-${String(i + 1).padStart(2, '0')}`;
        
        const payload = {
          wo_item_id: item.id,
          tenant_id: tenantId,
          jo_number: joNumber,
          transporter_id: assign.transporter_id || null,
          vendor_id: assign.transporter_id || null,
          fleet_id: assign.fleet_id || null,
          driver_id: assign.driver_id || null,
          driver_phone: assign.driver_phone || null,
          purchase_price: Number(assign.purchase_price) || 0,
          base_price: Number(assign.base_price) || dealPrice,
          driver_share_percentage: Number(assign.driver_share_percentage) || 0,
          advance_amount: Number(assign.advance_amount) || 0,
          estimated_margin: (Number(assign.base_price) || dealPrice) - (Number(assign.purchase_price) || 0),
          wa_token: assign.wa_token || generateToken(),
          tracking_token: assign.tracking_token || generateToken(),
          total_stops: itemData.stops?.length || 0,
          updated_at: new Date().toISOString(),
          status: 'pending' // [AI] Always pending for drafts
        };

        if (assign.id) {
          const { error: updErr } = await supabase.from('job_orders').update({
            ...payload,
            driver_link_token: assign.driver_link_token || Math.random().toString(36).substring(2, 15),
          }).eq('id', assign.id);
          if (updErr) throw updErr;
          console.log(`[AssignmentModal] Updated draft JO: ${joNumber}`);
        } else {
          const { data: newJo, error: insErr } = await supabase.from('job_orders').insert({
            ...payload,
            driver_link_token: Math.random().toString(36).substring(2, 15),
          }).select('id').single();
          
          if (insErr) throw insErr;
          console.log(`[AssignmentModal] Inserted draft JO: ${joNumber}`);
        }
      }

      // Keep WO item status as pending so user can continue editing
      const { error: woUpdateError } = await supabase
        .from('wo_items')
        .update({ status: 'pending' })
        .eq('id', item.id);
      
      if (woUpdateError) throw woUpdateError;
      
      toast.success('Draft saved — bisa lanjut edit nanti');
      console.log('[AssignmentModal] Draft saved successfully.');
      onSuccess();
    } catch (err: any) {
      console.error('[AssignmentModal] Draft Save Error:', err);
      const errorMessage = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
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
    console.log('[AssignmentModal] Starting save process for item:', item.id);

    try {
      // [AI] Only process assignments that have BOTH fleet_id AND driver_id
      // Skip empty slots — they should NOT create ghost JO records
      const filledAssignments = assignments.filter(a => a.fleet_id && a.driver_id);
      const emptyAssignments = assignments.filter(a => !a.fleet_id || !a.driver_id);
      
      console.log(`[AssignmentModal] Filled: ${filledAssignments.length}, Empty: ${emptyAssignments.length}`);

      // 1. Clean up stale/pending job orders (only truly empty ones with no fleet/driver)
      const { error: delErr } = await supabase
        .from('job_orders')
        .delete()
        .eq('wo_item_id', item.id)
        .eq('status', 'pending')
        .is('driver_id', null)
        .is('fleet_id', null);
      
      if (delErr) {
        console.warn('[AssignmentModal] Cleanup warning (non-fatal):', delErr);
      }

      const generateToken = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      };
      
      // 2. Only save filled assignments
      for (let i = 0; i < filledAssignments.length; i++) {
        const assign = filledAssignments[i];
        const originalIndex = assignments.indexOf(assign);
        console.log(`[AssignmentModal] Processing filled assignment ${i + 1}/${filledAssignments.length} (original slot ${originalIndex + 1})`);
        
        const selectedTransporter = transporters.find(t => t.id === assign.transporter_id);
        const isVendor = selectedTransporter?.is_vendor;
        
        if (isVendor && (!assign.purchase_price || assign.purchase_price <= 0)) {
          toast.error(`Harga beli untuk unit ${originalIndex + 1} harus diisi untuk vendor`);
          setAssigning(false);
          return;
        }

        // [AI] For internal/own drivers, validate attendance & inspection before assignment
        if (!isVendor && assign.driver_id) {
          const today = new Date().toISOString().split('T')[0];
          
          // Check attendance today
          const { data: todayAttendance } = await supabase
            .from('driver_attendance')
            .select('id')
            .eq('driver_id', assign.driver_id)
            .eq('status', 'CHECK_IN')
            .gte('check_in', `${today}T00:00:00`)
            .limit(1);
          
          if (!todayAttendance || todayAttendance.length === 0) {
            const driverName = drivers.find(d => d.id === assign.driver_id)?.name || 'Driver';
            toast.error(`${driverName} belum absen hari ini. Driver harus absen sebelum di-assign.`);
            setAssigning(false);
            return;
          }

          // Check inspection today
          const { data: todayInspection } = await supabase
            .from('fleet_inspections')
            .select('status')
            .eq('driver_id', assign.driver_id)
            .gte('created_at', `${today}T00:00:00`)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (!todayInspection || todayInspection.length === 0) {
            const driverName = drivers.find(d => d.id === assign.driver_id)?.name || 'Driver';
            toast.error(`${driverName} belum inspeksi fleet hari ini. Driver harus inspeksi sebelum di-assign.`);
            setAssigning(false);
            return;
          }

          if (todayInspection[0].status === 'GROUNDED') {
            const driverName = drivers.find(d => d.id === assign.driver_id)?.name || 'Driver';
            toast.error(`${driverName} - fleet tidak layak jalan (GROUNDED). Tidak bisa di-assign.`);
            setAssigning(false);
            return;
          }
        }

        const woNumber = item.work_orders?.wo_number || item.item_code;
        const joNumber = `${woNumber}-${String(originalIndex + 1).padStart(2, '0')}`;
        
        const payload = {
          wo_item_id: item.id,
          tenant_id: tenantId,
          jo_number: joNumber,
          transporter_id: assign.transporter_id || null,
          vendor_id: assign.transporter_id || null,
          fleet_id: assign.fleet_id,
          driver_id: assign.driver_id,
          driver_phone: assign.driver_phone || null,
          purchase_price: Number(assign.purchase_price) || 0,
          base_price: Number(assign.base_price) || dealPrice,
          driver_share_percentage: Number(assign.driver_share_percentage) || 0,
          advance_amount: Number(assign.advance_amount) || 0,
          estimated_margin: (Number(assign.base_price) || dealPrice) - (Number(assign.purchase_price) || 0),
          wa_token: assign.wa_token || generateToken(),
          tracking_token: assign.tracking_token || generateToken(),
          total_stops: itemData.stops?.length || 0,
          updated_at: new Date().toISOString(),
          status: assign.id ? assign.status : 'assigned'
        };

        let joId = assign.id;

        if (assign.id) {
          const { error: updErr } = await supabase.from('job_orders').update(payload).eq('id', assign.id);
          if (updErr) throw updErr;
          console.log(`[AssignmentModal] Updated JO: ${joNumber}`);
        } else {
          const { data: newJo, error: insErr } = await supabase.from('job_orders').insert({
            ...payload,
            driver_link_token: Math.random().toString(36).substring(2, 15),
          }).select('id').single();
          
          if (insErr) throw insErr;
          joId = newJo.id;
          console.log(`[AssignmentModal] Inserted new JO: ${joNumber}`);
        }

        // 2. Sync Routes (NON-BLOCKING: RLS for job_routes can be restrictive for non-HQ roles)
        if (joId) {
          console.log(`[AssignmentModal] Attempting route sync for JO ID: ${joId}`);
          try {
            const { data: existingRoutes, error: routeFetchErr } = await supabase.from('job_routes').select('id').eq('job_order_id', joId);
            if (routeFetchErr) console.warn('[AssignmentModal] Route fetch failed:', routeFetchErr);

            if (!existingRoutes || existingRoutes.length === 0) {
              const stops = itemData.stops || [];
              const estDistanceKm = itemData.est_distance_km || null;
              const estDuration = itemData.est_duration || null;
              if (stops.length > 0) {
                const routePayloads = stops.map((stop: any, sIdx: number) => ({
                  job_order_id: joId,
                  sequence: sIdx + 1,
                  stop_type: stop.stop_type || (sIdx === 0 ? 'PICKUP' : 'DROPOFF'),
                  source_type: stop.source_type || 'MD_LOCATION',
                  source_id: String(stop.source_id || 'LEGACY'),
                  location_name: stop.location_name || stop.name || '-',
                  address: stop.address || stop.location_address || '-',
                  latitude: stop.latitude !== null && stop.latitude !== undefined ? Number(stop.latitude) : null,
                  longitude: stop.longitude !== null && stop.longitude !== undefined ? Number(stop.longitude) : null,
                  contact_name: stop.contact_name || '-',
                  contact_phone: stop.contact_phone || '-',
                  status: 'pending',
                  distance_km: sIdx === stops.length - 1 ? estDistanceKm : null,
                  duration_minutes: sIdx === stops.length - 1 ? (estDuration ? parseInt(estDuration.replace(/\D/g, '')) || null : null) : null
                }));
                const { error: routeInsErr } = await supabase.from('job_routes').insert(routePayloads);
                if (routeInsErr) {
                   console.warn('[AssignmentModal] Route Insert suppressed (RLS issue):', routeInsErr.message);
                   // We don't throw here to allow the JO assignment to proceed
                } else {
                   console.log(`[AssignmentModal] Successfully created routes for JO ${joId}`);
                }
              }
            }
          } catch (routeErr: any) {
             console.warn('[AssignmentModal] Route Sync logic error (suppressed):', routeErr);
          }
        }
      }

      // 3. Finalize WO Item status
      console.log('[AssignmentModal] Finalizing WO Item status...');
      
      // [AI] If handover was approved, use max_jo_count as the limit
      const effectiveUnitCount = isHandoverApproved ? maxJOCount : (unitCount || 1);
      
      // Count saved assignments (only filled ones)
      const successfulAssignments = filledAssignments.length;
      const allUnitsAssigned = successfulAssignments >= effectiveUnitCount;
      
      console.log(`[AssignmentModal] Saved: ${successfulAssignments}/${effectiveUnitCount} - All assigned: ${allUnitsAssigned}`);
      
      // [AI] If nextAction is handover, don't change status — handover modal will set it to handover_pending
      const isHandoverFlow = !!nextAction;
      const newStatus = isHandoverFlow ? item.status : (allUnitsAssigned ? 'assigned' : 'pending');
      
      // [AI] If all units assigned, set confirmed_approved flag in item_data
      const currentItemData = typeof item?.item_data === 'string' ? JSON.parse(item.item_data) : (item?.item_data || {});
      const updatePayload: any = { status: newStatus };
      if (allUnitsAssigned && !isHandoverFlow) {
        updatePayload.item_data = {
          ...currentItemData,
          confirmed_assigned: true,
          confirmed_assigned_at: new Date().toISOString()
        };
      }
      
      const { error: woUpdateError } = await supabase
        .from('wo_items')
        .update(updatePayload)
        .eq('id', item.id);
      
      if (woUpdateError) throw woUpdateError;
      console.log(`[AssignmentModal] WO Item status set to: ${newStatus}`);

      // 4. Update parent Work Order status if needed
      const { data: siblingItems } = await supabase
        .from('wo_items')
        .select('status')
        .eq('wo_id', item.wo_id);
      
      const allAssigned = siblingItems?.every(i => ['assigned', 'active', 'in_progress', 'completed'].includes(i.status?.toLowerCase()));
      
      if (allAssigned) {
        await supabase
          .from('work_orders')
          .update({ status: 'assigned' })
          .eq('id', item.wo_id);
      }
      
      // [AI] Different toast for handover flow vs normal save
      if (isHandoverFlow) {
        toast.success(`${successfulAssignments} JO(s) saved — proceeding to handover...`);
      } else {
        toast.success('Assignment berhasil disimpan');
      }
      console.log('[AssignmentModal] Save process completed successfully.');
      
      if (nextAction) {
        nextAction();
      } else {
        onSuccess(); 
      } 
    } catch (err: any) {
      console.error('[AssignmentModal] Critical Save Error:', err);
      // Detailed error logging for objects that don't serialize well
      const errorMessage = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(15,23,42,0.15)] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
        
        {/* Header Section */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-6">
             <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 rotate-3 transition-transform">
                <Activity size={28} />
             </div>
             <div>
                <h2 className="text-2xl font-black text-indigo-950 italic uppercase tracking-tighter">Assignment Console</h2>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.work_orders.wo_number}</p>
                   <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                      {isHandoverApproved ? `${maxJOCount}/${unitCount} Units (Locked)` : `${unitCount} Fleet Required`}
                    </p>
                </div>
             </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400 hover:text-slate-700">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
          {/* WO Summary Card - ENHANCED HEADER */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div className="md:col-span-3 bg-white border border-slate-100 rounded-[2rem] p-8 shadow-[0_4px_25px_rgba(0,0,0,0.02)] flex flex-col justify-center space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic">
                       {itemData.vehicle_type_name || itemData.vehicle_type || '-'}
                    </div>
                    {isHandoverApproved && (
                      <div className="px-4 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic flex items-center gap-1.5">
                        <ShieldCheck size={12} /> HANDOVER APPROVED — {maxJOCount} JO(s) LOCKED
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-slate-600 bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-100">
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
                      <h3 className="text-3xl font-black text-indigo-950 uppercase italic tracking-tighter">
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

             <div className="bg-emerald-50/60 border border-emerald-100 rounded-[2rem] p-8 flex flex-col justify-center items-center text-center shadow-[0_4px_25px_rgba(16,185,129,0.03)]">
                <div className="w-12 h-12 bg-emerald-100/50 rounded-full flex items-center justify-center mb-4 border border-emerald-200/30">
                   <DollarSign size={24} className="text-emerald-600" />
                </div>
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em] mb-1">HARGA JUAL (DEALS)</p>
                <p className="text-3xl font-black text-emerald-600 italic tracking-tighter">{formatRupiah(dealPrice)}</p>
                <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mt-1">PER FLEET UNIT</p>
             </div>
          </div>

          <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h3 className="text-xs font-black text-indigo-950 uppercase tracking-[0.3em] italic">
                   {isHandoverApproved ? `Locked Units (${maxJOCount} of ${unitCount} Original)` : 'Deploy Units'}
                 </h3>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Syncing</span>
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
                    const isVendor = selectedTransporter?.is_vendor;
                    const isOwn = selectedTransporter?.is_own;
                    const purchasePrice = Number(assign.purchase_price) || 0;
                    const effectiveBasePrice = Number(assign.base_price) > 0 ? Number(assign.base_price) : (Number(dealPrice) > 0 ? Number(dealPrice) : Number(itemData?.deal_price || 0));
                    const basePrice = effectiveBasePrice;
                    const sharePct = Number(assign.driver_share_percentage) || 0;
                   
                    const margin = basePrice - purchasePrice;
                    const marginPercent = basePrice > 0 ? (margin / basePrice) * 100 : 0;
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

                    const statusFlag = assign.id ? getStatusFlag(assign.status, assign.job_routes) : null;

                    return (
                      <div key={idx} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:border-indigo-100/80 transition-all group relative overflow-hidden">
                        {statusFlag && (
                           <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest border-l border-b ${statusFlag.color} shadow-sm z-10`}>
                              {statusFlag.text}
                           </div>
                        )}
                        
                        <div className="absolute top-0 left-0 px-4 py-2 bg-indigo-50 text-indigo-600 border-r border-b border-indigo-100 rounded-br-2xl text-[8px] font-black uppercase tracking-[0.2em] italic shadow-sm z-10">
                            Unit {idx + 1} - {itemData.vehicle_type_name || itemData.vehicle_type}
                        </div>

                        {assign.id && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
                             <div 
                               className="h-full bg-blue-500 transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.3)]" 
                               style={{ width: `${assign.progress_percent || 0}%` }}
                             />
                          </div>
                        )}

                        <div className="flex flex-wrap items-end gap-6">
                           <div className="flex-1 min-w-[200px] space-y-2 mt-4">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vendor / Transporter</label>
                              <select
                                value={assign.transporter_id || ""}
                                onChange={(e) => handleAssignmentChange(idx, 'transporter_id', e.target.value)}
                                className="w-full h-12 px-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-black italic text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                              >
                                <option value="" className="not-italic bg-white">Pilih Vendor / Transporter</option>
                                {assign.transporter_id && !transporters.some(t => t.id === assign.transporter_id) && (
                                   <option value={assign.transporter_id} className="not-italic text-slate-500 bg-white">Legacy Transporter (ID: {assign.transporter_id.substring(0,6)}...)</option>
                                )}
                                {transporters.map(t => (
                                  <option key={t.id} value={t.id} className="not-italic bg-white">{t.name}</option>
                                ))}
                              </select>
                           </div>

                           <div className="flex-1 min-w-[150px] space-y-2 mt-4">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fleet / Armada</label>
                              <select
                                value={assign.fleet_id ? String(assign.fleet_id) : ""}
                                onChange={(e) => handleAssignmentChange(idx, 'fleet_id', e.target.value)}
                                className="w-full h-12 px-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-black italic text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                              >
                                <option value="" className="not-italic bg-white">Pilih Armada</option>
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
                                    return <option disabled className="text-rose-500 font-bold italic bg-white">Maaf, Anda belum memiliki unit {requestedType}</option>;
                                  }
                                  return filteredFleets.map(f => {
                                    const isBusy = f.status === 'on_road' && assign.fleet_id !== f.id;
                                    return (
                                      <option key={f.id} value={f.id} disabled={isBusy} className={`not-italic bg-white ${isBusy ? 'text-rose-500' : 'text-slate-800'}`}>
                                        {f.md_fleet_types?.type_name || 'Fleet'} - {f.plate_number} {isBusy ? ' [BUSY / ON ROAD]' : ` (${f.status?.toUpperCase() || 'AVAILABLE'})`}
                                      </option>
                                    );
                                  });
                                })()}
                              </select>
                           </div>

                           <div className="flex-1 min-w-[150px] space-y-2 mt-4">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Driver / Sopir</label>
                              <select
                                value={assign.driver_id ? String(assign.driver_id) : ""}
                                onChange={(e) => handleAssignmentChange(idx, 'driver_id', e.target.value)}
                                className="w-full h-12 px-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-black italic text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                              >
                                <option value="" className="not-italic bg-white">Pilih Driver</option>
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
                                      <option key={d.id} value={d.id} disabled={isBusy || notReady} className={`not-italic bg-white ${(isBusy || notReady) ? 'text-rose-500' : 'text-slate-800'}`}>
                                        {d.name} {isBusy ? ' [BUSY / ON ROAD]' : readinessLabel || ` (${d.status?.toUpperCase() || 'AVAILABLE'})`}
                                      </option>
                                    );
                                   })}
                              </select>
                           </div>

                           <div className={`flex-1 min-w-[200px] space-y-2 mt-4 transition-all duration-500 ${isVendor ? 'opacity-100 scale-100' : 'opacity-30 grayscale pointer-events-none'}`}>
                              <div className="flex justify-between items-center px-1">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Harga Beli (Vendor)</label>
                                 {isVendor && purchasePrice > 0 && (
                                    <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${marginColor}`}>
                                       {marginStatus} {marginPercent.toFixed(1)}%
                                    </div>
                                 )}
                              </div>
                              <div className="relative">
                                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Rp</span>
                                 <input
                                   type="text"
                                   value={formatNumber(assign.purchase_price)}
                                   onChange={(e) => {
                                     const raw = e.target.value.replace(/\D/g, '');
                                     handleAssignmentChange(idx, 'purchase_price', raw ? parseInt(raw, 10) : 0);
                                   }}
                                   disabled={!isVendor}
                                   className="w-full h-12 pl-10 pr-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-black italic text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                   placeholder="0"
                                 />
                              </div>
                           </div>

                           {isVendor && (
                              <div className="flex-1 min-w-[200px] space-y-2 animate-in slide-in-from-top-2 duration-300">
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Harga Jual (Customer)</label>
                                 <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Rp</span>
                                    <input
                                      type="text"
                                      value={formatNumber(assign.base_price)}
                                      onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        handleAssignmentChange(idx, 'base_price', raw ? parseInt(raw, 10) : 0);
                                      }}
                                      className="w-full h-12 pl-10 pr-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-black italic text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                      placeholder="0"
                                    />
                                 </div>
                              </div>
                           )}

                            {isOwn && (
                              <>
                                <div className="flex-1 min-w-[200px] space-y-2 animate-in slide-in-from-top-2 duration-300">
                                  <div className="flex justify-between items-center px-1">
                                    <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Bagi Hasil Driver (%)</label>
                                    {basePrice > 0 && (
                                      <div className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm bg-blue-50 text-blue-600 border border-blue-100">
                                        Payout: {formatRupiah(driverPayout)} ({sharePct}%)
                                      </div>
                                    )}
                                  </div>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      defaultValue={assign.driver_share_percentage || 40}
                                      onChange={(e) => {
                                        const pct = e.target.value;
                                        const updated = [...assignments];
                                        updated[idx] = { ...updated[idx], driver_share_percentage: pct };
                                        const payout = basePrice * (Number(pct) / 100);
                                        updated[idx].advance_amount = Math.round(payout * 0.5);
                                        setAssignments(updated);
                                      }}
                                      className="w-full h-12 px-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none cursor-text"
                                      placeholder="40"
                                      max="100"
                                      min="0"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">%</span>
                                  </div>
                                </div>
                               
                               <div className="flex-1 min-w-[200px] space-y-2 animate-in slide-in-from-top-2 duration-300">
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Uang Jalan (Advance)</label>
                                  <div className="relative">
                                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Rp</span>
                                     <input
                                       type="text"
                                       value={formatNumber(assign.advance_amount)}
                                       onChange={(e) => {
                                         const raw = e.target.value.replace(/\D/g, '');
                                         handleAssignmentChange(idx, 'advance_amount', raw ? parseInt(raw, 10) : 0);
                                       }}
                                       className="w-full h-12 pl-10 pr-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-black italic text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all outline-none"
                                       placeholder="0"
                                     />
                                  </div>
                               </div>
                             </>
                            )}

                           <div className="flex-1 min-w-[50px] space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 opacity-0">WA</label>
                              <div className="flex gap-2">
                                 {assign.tracking_token && (
                                    <button
                                       onClick={() => {
                                          const driver = drivers.find(d => d.id === assign.driver_id);
                                          const driverName = driver?.name || 'Driver';
                                          const phone = assign.driver_phone || driver?.phone || '';
                                          if (!phone) { toast.error('Nomor telepon driver tidak ditemukan'); return; }
                                          let formattedPhone = phone.replace(/\D/g, '');
                                          if (formattedPhone.startsWith('0')) { formattedPhone = '62' + formattedPhone.substring(1); }
                                          const origin = window.location.origin;
                                          const link = `${origin}/driver/response?token=${assign.wa_token}&wo=${assign.id}`;
                                          const msg = `Halo ${driverName}, berikut link untuk konfirmasi tugas Anda: ${link}`;
                                          window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                       }}
                                       className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center hover:bg-emerald-100 transition-all border border-emerald-200 active:scale-95"
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

        <div className="p-6 md:p-8 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-4 text-slate-600">
              <ShieldCheck size={20} className="text-indigo-600" />
              <div>
                 <p className="text-[9px] font-black uppercase tracking-[0.2em] italic text-slate-700">Mission Critical</p>
                 <p className="text-xs font-bold text-slate-400 italic">Assign units to initiate operational phase</p>
              </div>
           </div>

            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <button
                onClick={handleSaveDraft}
                disabled={assigning}
                className="flex-1 md:flex-none px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all border border-amber-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Save size={16} /> Save Draft
              </button>
              {onHandover && (
                <button
                  type="button"
                  onClick={() => handleSave(onHandover)}
                  disabled={assigning}
                  className="flex-1 md:flex-none px-8 h-14 rounded-2xl font-black text-xs uppercase tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all border border-rose-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
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
