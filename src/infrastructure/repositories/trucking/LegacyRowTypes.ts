/**
 * Supabase Legacy Database Row Types
 * 
 * These types represent the EXACT shape of rows in the legacy database.
 * They exist ONLY in the infrastructure layer and must NEVER leak into
 * the domain or application layers.
 * 
 * If the legacy schema changes, only these types and the corresponding
 * repository adapters need to be updated.
 */

export interface JobOrderRow {
  id: string;
  tenant_id: string;
  wo_item_id: string;
  jo_number: string;
  status: string;
  transporter_id: string | null;
  fleet_id: string | null;
  driver_id: string | null;
  is_doc_finished: boolean;
  is_cost_finished: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DriverRow {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  status: string;
  is_active: boolean;
  is_working: boolean;
  entity_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FleetRow {
  id: string;
  tenant_id: string;
  plate_number: string;
  status: string;
  entity_id: string | null;
  fleet_type_id: string | null;
  brand: string | null;
  model: string | null;
  capacity_kg: number | null;
  created_at: string;
  updated_at: string;
}
