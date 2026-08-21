export type DriverPortalTab = "home" | "history" | "profile";

export interface DriverProfileData {
  id: string;
  name: string;
  whatsapp?: string;
  phone?: string;
  pin?: string;
  photo_url?: string;
  entity_id?: string | null;
  tenant_id?: string;
  driver_code?: string;
  is_active?: boolean;
  status?: string;
  sim_number?: string;
  sim_class?: string;
  sim_expiry?: string;
  trust_score?: number;
  total_jobs_completed?: number;
  total_km_driven?: number;
  has_native_app?: boolean;
  last_app_version?: string;
  linked_driver_ids?: string[];
  [key: string]: any;
}

export interface TenantInfoData {
  id: string;
  name: string;
  code?: string;
  logo_url?: string;
}

export interface RouteStop {
  id: string;
  job_order_id?: string;
  sequence: number;
  stop_type: "PICKUP" | "DROPOFF" | "WAYPOINT" | string;
  location_name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
  duration_minutes?: number;
  status?: "pending" | "arrived" | "completed" | "departed" | string;
  actual_arrival?: string | null;
  actual_departure?: string | null;
  pod_photo_url?: string | null;
  notes?: string | null;
  geofence_triggered_at?: string | null;
}

export interface JobOrderData {
  id: string;
  jo_number: string;
  status: string;
  tenant_id?: string;
  tenant_name?: string;
  driver_id?: string;
  fleet_id?: string;
  driver_link_token?: string;
  driver_response?: "pending" | "accepted" | "rejected" | string;
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  customer_name?: string;
  wo_items?: {
    item_data?: {
      shipper_name?: string;
      cargo_description?: string;
      stops?: any[];
      [key: string]: any;
    };
    [key: string]: any;
  };
  md_fleets?: {
    id?: string;
    plate_number?: string;
    vehicle_type?: string;
    is_vendor?: boolean;
    [key: string]: any;
  };
  job_routes?: RouteStop[];
  tracking_logs?: any[];
  job_distance_km?: number;
  [key: string]: any;
}

export interface DeviceTelemetryState {
  isNativeApp: boolean;
  isOnline: boolean;
  gpsStatus: "active" | "inactive" | "error" | "loading" | "recovering" | "idle" | null;
  gpsAccuracy: number | null;
  gpsSpeed: number | null;
  gpsBattery: number | null;
  gpsErrorMessage: string | null;
  gpsPingCount: number;
  lastGpsSyncTime?: string | null;
}
