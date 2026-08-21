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
      bin_id: input.bin_id || undefined,
      movement_type: input.movement_type,
      movement_reason: input.movement_reason || undefined,
      quantity_change: input.quantity_change,
      quantity_before: input.quantity_before || undefined,
      quantity_after: input.quantity_after || undefined,
      batch_number: input.batch_number || undefined,
      expiry_date: input.expiry_date || undefined,
      lot_number: input.lot_number || undefined,
      unit_cost: input.unit_cost || undefined,
      source_document_type: input.source_document_type || undefined,
      source_document_id: input.source_document_id || undefined,
      job_order_id: input.job_order_id || undefined,
      job_order_item_id: input.job_order_item_id || undefined,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });
  if (error) throw error;
}

export interface InventorySnapshotRow {
  id: string;
  tenant_id: string;
  warehouse_id: string;
  product_sku_id: string;
  current_quantity: number;
  reserved_quantity?: number | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  product_sku?: { sku_code: string; name: string } | null;
}

export async function getInventorySnapshot(warehouseId: string) {
  const { data, error } = await (supabase
    .from('wo_inventory_snapshots' as never) as any)
    .select('*, product_sku:product_sku_id(sku_code, name)')
    .eq('warehouse_id', warehouseId)
    .gt('current_quantity', 0);
  if (error) throw error;
  return (data || []) as InventorySnapshotRow[];
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
