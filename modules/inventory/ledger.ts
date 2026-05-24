import { createClient } from "@/lib/supabase/client";
import type { InventoryLedgerEntry, MovementType } from "@/types/enterprise";

const supabase = createClient()!;

export interface RecordMovementInput {
  correlation_id: string;
  product_sku_id: string;
  warehouse_id: string;
  bin_id?: string;
  movement_type: MovementType;
  movement_reason?: string;
  quantity_change: number;
  quantity_before?: number;
  quantity_after?: number;
  batch_number?: string;
  expiry_date?: string;
  lot_number?: string;
  unit_cost?: number;
  source_document_type?: string;
  source_document_id?: string;
  job_order_id?: string;
  job_order_item_id?: string;
}

export async function recordMovement(input: RecordMovementInput): Promise<void> {
  const { error } = await supabase
    .from('wo_inventory_ledger')
    .insert({
      correlation_id: input.correlation_id,
      tenant_id: '',  // populated by RLS
      product_sku_id: input.product_sku_id,
      warehouse_id: input.warehouse_id,
      bin_id: input.bin_id || null,
      movement_type: input.movement_type,
      movement_reason: input.movement_reason || null,
      quantity_change: input.quantity_change,
      quantity_before: input.quantity_before || null,
      quantity_after: input.quantity_after || null,
      batch_number: input.batch_number || null,
      expiry_date: input.expiry_date || null,
      lot_number: input.lot_number || null,
      unit_cost: input.unit_cost || null,
      source_document_type: input.source_document_type || null,
      source_document_id: input.source_document_id || null,
      job_order_id: input.job_order_id || null,
      job_order_item_id: input.job_order_item_id || null,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
  if (error) throw error;
}

export async function getInventorySnapshot(warehouseId: string) {
  const { data, error } = await supabase
    .from('wo_inventory_snapshots')
    .select('*, product_sku:product_sku_id(sku_code, name)')
    .eq('warehouse_id', warehouseId)
    .gt('current_quantity', 0);
  if (error) throw error;
  return data || [];
}

export async function getMovementHistory(skuId: string, warehouseId: string, limit = 100) {
  const { data, error } = await supabase
    .from('wo_inventory_ledger')
    .select('*')
    .eq('product_sku_id', skuId)
    .eq('warehouse_id', warehouseId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
