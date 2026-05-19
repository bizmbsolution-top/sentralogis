export type DriverAttendanceStatus = 'CHECK_IN' | 'CHECK_OUT';

export interface DriverAttendance {
  id: string;
  driver_id: string;
  fleet_id: string | null;
  tenant_id: string;
  check_in: string;
  check_out: string | null;
  status: DriverAttendanceStatus;
  created_at: string;
}

export interface FleetInspection {
  id: string;
  driver_id: string;
  fleet_id: string;
  tenant_id: string;
  odometer_photo_url: string | null;
  odometer_value: number | null;
  condition_photo_url: string | null;
  rem_ok: boolean;
  rem_notes: string | null;
  lampu_ok: boolean;
  lampu_notes: string | null;
  ban_ok: boolean;
  ban_notes: string | null;
  wiper_ok: boolean;
  wiper_notes: string | null;
  kemudi_ok: boolean;
  kemudi_notes: string | null;
  total_score: number;
  status: 'LAYAK JALAN' | 'GROUNDED';
  notes: string | null;
  created_at: string;
}

export type PerformanceLogType = 'KM_LOG' | 'SAFETY_INCIDENT';

export interface DriverPerformanceLog {
  id: string;
  driver_id: string;
  tenant_id: string;
  job_order_id: string | null;
  type: PerformanceLogType;
  km_start: number | null;
  km_end: number | null;
  total_km: number | null;
  incident_type: string | null;
  incident_description: string | null;
  incident_date: string | null;
  created_at: string;
}

export interface DriverWithPin {
  id: string;
  name: string;
  phone: string;
  pin: string | null;
  tenant_id: string;
}

export interface FleetWithType {
  id: string;
  plate_number: string;
  md_fleet_types?: {
    type_name: string;
  };
}

export interface InspectionChecklist {
  rem: boolean;
  lampu: boolean;
  ban: boolean;
  wiper: boolean;
  kemudi: boolean;
}