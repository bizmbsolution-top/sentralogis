import type { SupabaseClient } from '@supabase/supabase-js';

export interface DriverReadiness {
  ready: boolean;
  reason: string;
  hasAttendance: boolean;
  hasInspection: boolean;
  inspectionStatus: string;
}

export function computeDriverReadiness(params: {
  driverStatus?: string | null;
  hasAttendance: boolean;
  hasInspection: boolean;
  inspectionStatus?: string | null;
  isVendor: boolean;
}): DriverReadiness {
  const { driverStatus, hasAttendance, hasInspection, inspectionStatus, isVendor } = params;

  if (isVendor) {
    return {
      ready: true,
      reason: 'Vendor',
      hasAttendance: true,
      hasInspection: true,
      inspectionStatus: 'N/A',
    };
  }

  if (driverStatus === 'unavailable') {
    return {
      ready: false,
      reason: 'Sakit/Cuti',
      hasAttendance: false,
      hasInspection: false,
      inspectionStatus: 'N/A',
    };
  }

  if (!hasAttendance) {
    return {
      ready: false,
      reason: 'Belum absen',
      hasAttendance: false,
      hasInspection: false,
      inspectionStatus: 'N/A',
    };
  }

  if (!hasInspection) {
    return {
      ready: false,
      reason: 'Belum inspeksi',
      hasAttendance: true,
      hasInspection: false,
      inspectionStatus: 'N/A',
    };
  }

  const status = inspectionStatus || 'N/A';
  if (status === 'GROUNDED') {
    return {
      ready: false,
      reason: 'Fleet GROUNDED',
      hasAttendance: true,
      hasInspection: true,
      inspectionStatus: 'GROUNDED',
    };
  }

  return {
    ready: true,
    reason: 'Ready',
    hasAttendance: true,
    hasInspection: true,
    inspectionStatus: status,
  };
}

export async function fetchDriverReadinessForToday(
  supabase: SupabaseClient,
  driverId: string,
  dateYmd: string
): Promise<Pick<DriverReadiness, 'hasAttendance' | 'hasInspection' | 'inspectionStatus'>> {
  const dayStart = `${dateYmd}T00:00:00`;

  const [attRes, inspRes] = await Promise.all([
    supabase
      .from('driver_attendance')
      .select('id')
      .eq('driver_id', driverId)
      .eq('status', 'CHECK_IN')
      .gte('check_in', dayStart)
      .limit(1),
    supabase
      .from('fleet_inspections')
      .select('status')
      .eq('driver_id', driverId)
      .gte('created_at', dayStart)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  return {
    hasAttendance: !!(attRes.data && attRes.data.length > 0),
    hasInspection: !!(inspRes.data && inspRes.data.length > 0),
    inspectionStatus: inspRes.data?.[0]?.status || 'N/A',
  };
}

export function validateInternalDriverReadiness(
  readiness: DriverReadiness | undefined,
  driverName: string
): string | null {
  if (!readiness || readiness.ready) return null;
  if (readiness.reason === 'Belum absen') {
    return `${driverName} belum absen hari ini. Driver harus absen sebelum di-assign.`;
  }
  if (readiness.reason === 'Belum inspeksi') {
    return `${driverName} belum inspeksi fleet hari ini. Driver harus inspeksi sebelum di-assign.`;
  }
  if (readiness.inspectionStatus === 'GROUNDED') {
    return `${driverName} - fleet tidak layak jalan (GROUNDED). Tidak bisa di-assign.`;
  }
  return `${driverName} tidak siap (${readiness.reason}).`;
}
