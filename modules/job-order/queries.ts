import { createClient } from "@/lib/supabase/client";
import type { JobOrder, JoType } from "@/types/enterprise";

const supabase = createClient()!;

export async function getJobOrders(orgId: string, limit = 50): Promise<JobOrder[]> {
  const { data, error } = await supabase
    .from('wo_job_orders')
    .select('*, work_order:work_order_id(wo_number, wo_type)')
    .eq('executing_org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as JobOrder[]) || [];
}

export async function getJobOrdersByWorkOrder(woId: string): Promise<JobOrder[]> {
  const { data, error } = await supabase
    .from('wo_job_orders')
    .select('*')
    .eq('work_order_id', woId)
    .order('sequence_order');
  if (error) throw error;
  return (data as unknown as JobOrder[]) || [];
}

export async function getJobOrderById(id: string): Promise<JobOrder | null> {
  const { data, error } = await supabase
    .from('wo_job_orders')
    .select('*, work_order:work_order_id(*), items:wo_job_order_items(*)')
    .eq('id', id)
    .single();
  if (error) return null;
  return (data as unknown as JobOrder) || null;
}

export async function updateJobOrderStatus(id: string, status: string, result?: Record<string, unknown>): Promise<void> {
  const update: any = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'IN_PROGRESS') update.actual_start = new Date().toISOString();
  if (status === 'COMPLETED') update.actual_end = new Date().toISOString();
  if (result) update.result = result;

  const { error } = await supabase
    .from('wo_job_orders')
    .update(update)
    .eq('id', id);
  if (error) throw error;
}

export async function assignJobOrder(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('wo_job_orders')
    .update({
      assigned_to: userId,
      status: 'ASSIGNED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}
