import { createClient } from "@/lib/supabase/client";
import type { WorkOrder, WorkOrderItem, WoType, Priority } from "@/types/enterprise";

const supabase = createClient()!;

export interface CreateWorkOrderInput {
  originating_org_id: string;
  assigned_org_id?: string;
  wo_type: WoType;
  priority?: Priority;
  description?: string;
  reference_type?: string;
  reference_id?: string;
  target_date?: string;
  items: {
    product_sku_id?: string;
    item_description?: string;
    requested_quantity?: number;
    from_warehouse_id?: string;
    to_warehouse_id?: string;
    batch_number?: string;
  }[];
}

export async function createWorkOrder(input: CreateWorkOrderInput): Promise<WorkOrder> {
  const { data: wo, error: woErr } = await (supabase
    .rpc as any)('wo_create_work_order', {
      p_originating_org_id: input.originating_org_id,
      p_assigned_org_id: input.assigned_org_id || input.originating_org_id,
      p_wo_type: input.wo_type,
      p_priority: input.priority || 'NORMAL',
      p_description: input.description || null,
      p_reference_type: input.reference_type || null,
      p_reference_id: input.reference_id || null,
      p_target_date: input.target_date || null,
    });
  if (woErr) throw woErr;
  return wo as WorkOrder;
}

export async function getWorkOrders(orgId: string, limit = 50): Promise<WorkOrder[]> {
  const { data, error } = await supabase
    .from('wo_work_orders')
    .select('*')
    .or(`originating_org_id.eq.${orgId},assigned_org_id.eq.${orgId}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as WorkOrder[]) || [];
}

export async function getWorkOrderById(id: string): Promise<WorkOrder | null> {
  const { data, error } = await supabase
    .from('wo_work_orders')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return (data as unknown as WorkOrder) || null;
}

export async function getWorkOrderItems(woId: string): Promise<WorkOrderItem[]> {
  const { data, error } = await supabase
    .from('wo_work_order_items')
    .select('*, product_sku:product_sku_id(sku_code, name)')
    .eq('work_order_id', woId)
    .order('line_number');
  if (error) throw error;
  return (data as unknown as WorkOrderItem[]) || [];
}

export async function updateWorkOrderStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('wo_work_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function approveWorkOrder(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('wo_work_orders')
    .update({
      status: 'APPROVED',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}
