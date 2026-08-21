// [AI] Status History utilities — record status changes across modules
// [AI] reading from .env.local for Supabase credentials

import { createClient } from '@supabase/supabase-js';

let adminClient: ReturnType<typeof createClient> | null = null;

function getAdmin() {
  if (adminClient) return adminClient;
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) return null;
  adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

export async function recordJobStatusChange(params: {
  job_order_id: string;
  old_status?: string;
  new_status: string;
  changed_by?: string;
  correlation_id?: string;
  notes?: string;
}) {
  const client = getAdmin();
  if (!client) return;
  try {
    await (client.from('job_status_history' as any) as any).insert({
      job_order_id: params.job_order_id,
      old_status: params.old_status || null,
      new_status: params.new_status,
      changed_by: params.changed_by || null,
      correlation_id: params.correlation_id || null,
      notes: params.notes || null,
    });
  } catch (err) {
    console.error('[StatusHistory] Failed to record job status:', err);
  }
}

export async function recordShipmentStatusChange(params: {
  shipment_id: string;
  old_status?: string;
  new_status: string;
  changed_by?: string;
  correlation_id?: string;
  notes?: string;
}) {
  const client = getAdmin();
  if (!client) return;
  try {
    await (client.from('shipment_status_history' as any) as any).insert({
      shipment_id: params.shipment_id,
      old_status: params.old_status || null,
      new_status: params.new_status,
      changed_by: params.changed_by || null,
      correlation_id: params.correlation_id || null,
      notes: params.notes || null,
    });
  } catch (err) {
    console.error('[StatusHistory] Failed to record shipment status:', err);
  }
}

export async function recordInventoryMovement(params: {
  item_id: string;
  warehouse_id?: string;
  old_quantity?: number;
  new_quantity: number;
  movement_type: string;
  reference_type?: string;
  reference_id?: string;
  changed_by?: string;
  correlation_id?: string;
  notes?: string;
}) {
  const client = getAdmin();
  if (!client) return;
  try {
    await (client.from('inventory_movement_history' as any) as any).insert({
      item_id: params.item_id,
      warehouse_id: params.warehouse_id || null,
      old_quantity: params.old_quantity || null,
      new_quantity: params.new_quantity,
      movement_type: params.movement_type,
      reference_type: params.reference_type || null,
      reference_id: params.reference_id || null,
      changed_by: params.changed_by || null,
      correlation_id: params.correlation_id || null,
      notes: params.notes || null,
    });
  } catch (err) {
    console.error('[StatusHistory] Failed to record inventory movement:', err);
  }
}
