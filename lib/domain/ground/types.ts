export type GroundEventType =
  | 'GATE_IN_DEPOT'
  | 'GATE_OUT_DEPOT'
  | 'GATE_IN_FACTORY'
  | 'GATE_OUT_FACTORY'
  | 'GATE_IN_PORT'
  | 'GATE_OUT_PORT'
  | 'LOADING_START'
  | 'LOADING_FINISH'
  | 'DOCUMENT_HANDOVER'
  | 'CONTAINER_INSPECTION'
  | 'DAMAGE_REPORT'
  | 'SEAL_INSPECTION'
  | 'POD';

export interface GroundEventTypeMeta {
  event_type: GroundEventType;
  label: string;
  requires_photo: boolean;
  requires_container: boolean;
  sort_order: number;
}

export interface GroundSite {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  site_type: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number;
  is_active: boolean;
}

export interface GroundEvent {
  id: string;
  job_order_id: string;
  event_type: GroundEventType;
  captured_by: string | null;
  captured_by_name: string | null;
  site_id: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
  ocr_json: Record<string, any>;
  ocr_confidence: number | null;
  match_method: string | null;
  notes: string | null;
  created_at: string;
}

export type GateFlowStage = "awaiting_gate_in" | "gate_in_done" | "gate_out_done";

export interface QueueItem {
  jo_id: string;
  jo_number: string;
  status: string;
  dispatch_ready_at: string | null;
  container_number: string | null;
  fleet_plate: string | null;
  fleet_type: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  transporter_name: string | null;
  transporter_phone: string | null;
  customer_name: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  route_stops: any[];
  last_event: GroundEvent | null;
  last_event_type: string | null;
  last_event_at: string | null;
  site_name: string | null;
  eta_minutes: number | null;
  flow_stage: GateFlowStage;
}
