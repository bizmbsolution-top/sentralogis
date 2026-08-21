'use server';

import { supabase } from '@/lib/supabaseClient';
import type { DriverWithPin, FleetWithType, DriverAttendance, FleetInspection, DriverPerformanceLog } from './types';

export async function verifyDriver(phone: string, pin: string): Promise<DriverWithPin | null> {
  const { data, error } = await supabase
    .from('md_drivers')
    .select('id, name, phone, pin, tenant_id')
    .eq('phone', phone)
    .eq('pin', pin)
    .maybeSingle();

  if (error || !data) return null;
  return data as DriverWithPin;
}

export async function getDriverFleets(tenantId: string): Promise<FleetWithType[]> {
  const { data, error } = await supabase
    .from('md_fleets')
    .select('id, plate_number, md_fleet_types(type_name)')
    .eq('tenant_id', tenantId)
    .eq('status', 'ACTIVE')
    .order('plate_number');

  if (error) return [];
  return (data || []) as FleetWithType[];
}

export async function checkInDriver(driverId: string, fleetId: string, tenantId: string): Promise<DriverAttendance> {
  const { data, error } = await supabase
    .from('driver_attendance')
    .insert({
      driver_id: driverId,
      fleet_id: fleetId,
      tenant_id: tenantId,
      check_in: new Date().toISOString(),
      status: 'CHECK_IN'
    })
    .select()
    .single();

  if (error) throw error;
  return data as DriverAttendance;
}

export async function checkOutDriver(attendanceId: string): Promise<DriverAttendance> {
  const { data, error } = await supabase
    .from('driver_attendance')
    .update({
      check_out: new Date().toISOString(),
      status: 'CHECK_OUT'
    })
    .eq('id', attendanceId)
    .select()
    .single();

  if (error) throw error;
  return data as DriverAttendance;
}

export async function submitFleetInspection(
  driverId: string,
  fleetId: string,
  tenantId: string,
  inspection: {
    odometer_photo_url?: string;
    odometer_value?: number;
    condition_photo_url?: string;
    rem_ok: boolean;
    rem_notes?: string;
    lampu_ok: boolean;
    lampu_notes?: string;
    ban_ok: boolean;
    ban_notes?: string;
    wiper_ok: boolean;
    wiper_notes?: string;
    kemudi_ok: boolean;
    kemudi_notes?: string;
    notes?: string;
  }
): Promise<FleetInspection> {
  const totalScore = 
    (inspection.rem_ok ? 20 : 0) +
    (inspection.lampu_ok ? 20 : 0) +
    (inspection.ban_ok ? 20 : 0) +
    (inspection.wiper_ok ? 20 : 0) +
    (inspection.kemudi_ok ? 20 : 0);

  const status = totalScore >= 60 ? 'LAYAK JALAN' : 'GROUNDED';

  const { data, error } = await supabase
    .from('fleet_inspections')
    .insert({
      driver_id: driverId,
      fleet_id: fleetId,
      tenant_id: tenantId,
      odometer_photo_url: inspection.odometer_photo_url,
      odometer_value: inspection.odometer_value,
      condition_photo_url: inspection.condition_photo_url,
      rem_ok: inspection.rem_ok,
      rem_notes: inspection.rem_notes,
      lampu_ok: inspection.lampu_ok,
      lampu_notes: inspection.lampu_notes,
      ban_ok: inspection.ban_ok,
      ban_notes: inspection.ban_notes,
      wiper_ok: inspection.wiper_ok,
      wiper_notes: inspection.wiper_notes,
      kemudi_ok: inspection.kemudi_ok,
      kemudi_notes: inspection.kemudi_notes,
      total_score: totalScore,
      status: status,
      notes: inspection.notes
    })
    .select()
    .single();

  if (error) throw error;
  return data as FleetInspection;
}

export async function logKM(
  driverId: string,
  tenantId: string,
  jobOrderId: string,
  kmStart: number,
  kmEnd: number
): Promise<DriverPerformanceLog> {
  const { data, error } = await (supabase
    .from('driver_performance_logs' as any) as any)
    .insert({
      driver_id: driverId,
      tenant_id: tenantId,
      job_order_id: jobOrderId,
      type: 'KM_LOG',
      km_start: kmStart,
      km_end: kmEnd,
      total_km: kmEnd - kmStart
    })
    .select()
    .single();

  if (error) throw error;
  return data as DriverPerformanceLog;
}

export async function logSafetyIncident(
  driverId: string,
  tenantId: string,
  incidentType: string,
  description: string,
  incidentDate: string
): Promise<DriverPerformanceLog> {
  const { data, error } = await (supabase
    .from('driver_performance_logs' as any) as any)
    .insert({
      driver_id: driverId,
      tenant_id: tenantId,
      type: 'SAFETY_INCIDENT',
      incident_type: incidentType,
      incident_description: description,
      incident_date: incidentDate
    })
    .select()
    .single();

  if (error) throw error;
  return data as DriverPerformanceLog;
}

export async function getDriverJobOrders(driverId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('job_orders')
    .select('*, md_fleets(plate_number)')
    .eq('driver_id', driverId)
    .in('status', ['DITERIMA', 'STARTED', 'LOADING', 'UNLOADING'])
    .order('created_at', { ascending: false });

  if (error) return [];
  return (data as any[]) || [];
}

export async function getDriverAttendance(driverId: string): Promise<DriverAttendance[]> {
  const { data, error } = await (supabase
    .from('driver_attendance' as any) as any)
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return [];
  return (data as unknown as DriverAttendance[]) || [];
}

export async function getDriverPerformance(driverId: string): Promise<DriverPerformanceLog[]> {
  const { data, error } = await (supabase
    .from('driver_performance_logs' as any) as any)
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return [];
  return (data as unknown as DriverPerformanceLog[]) || [];
}