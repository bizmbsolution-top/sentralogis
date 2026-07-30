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
  | 'POD'
  | 'PIC1_GATE_IN'
  | 'PIC2_GATE_OUT'
  | 'PIC1_DROPOFF_ARRIVE'
  | 'PIC_DROPOFF_DOCUMENT';

export type VerificationType = 'plate' | 'sim' | 'container' | 'plate_recheck' | 'document';
export type SiteRole = 'pickup' | 'dropoff';

export type PickupFlowStage = 'awaiting_pic1' | 'pic1_done' | 'pic2_done' | 'pickup_complete';
export type DropoffFlowStage = 'awaiting_arrival' | 'arrived' | 'documents_done' | 'dropoff_complete';

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
  verification_type: VerificationType | null;
  verified_against: string | null;
  verified_match: boolean | null;
  source: string | null;
}

export interface GroundDocument {
  id: string;
  ground_event_id: string | null;
  job_order_id: string;
  document_type: string;
  file_url: string;
  notes: string | null;
  created_at: string;
}

export interface GroundAssignmentPIC {
  id: string;
  job_order_id: string;
  pic1_staff_id: string | null;
  pic2_staff_id: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
  pic1_name?: string | null;
  pic2_name?: string | null;
}

export const GROUND_EVENT_LABELS: Record<string, string> = {
  GATE_IN_DEPOT: 'Gate In Depot',
  GATE_OUT_DEPOT: 'Gate Out Depot',
  GATE_IN_FACTORY: 'Gate In Factory',
  GATE_OUT_FACTORY: 'Gate Out Factory',
  GATE_IN_PORT: 'Gate In Port',
  GATE_OUT_PORT: 'Gate Out Port',
  LOADING_START: 'Loading Start',
  LOADING_FINISH: 'Loading Finish',
  DOCUMENT_HANDOVER: 'Dokumen Diserahkan',
  CONTAINER_INSPECTION: 'Inspeksi Kontainer',
  DAMAGE_REPORT: 'Laporan Kerusakan',
  SEAL_INSPECTION: 'Inspeksi Seal',
  POD: 'Proof of Delivery',
  PIC1_GATE_IN: 'PIC1 — Gate In (Plat + SIM)',
  PIC2_GATE_OUT: 'PIC2 — Gate Out (Dokumen + Plat)',
  PIC1_DROPOFF_ARRIVE: 'PIC Dropoff — Truck Tiba',
  PIC_DROPOFF_DOCUMENT: 'PIC Dropoff — Tambah Dokumen',
};

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
  pickup_flow_stage: PickupFlowStage;
  dropoff_flow_stage: DropoffFlowStage;
  pic1_assigned_to: string | null;
  pic2_assigned_to: string | null;
  site_role: SiteRole | null;
}
