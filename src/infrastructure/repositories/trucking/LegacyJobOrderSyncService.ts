import { SupabaseClient } from '@supabase/supabase-js';

export interface AssignmentLegacyPayload {
  transporterId?: string;
  purchasePrice?: number;
  notes?: string;
}

export interface CancellationLegacyPayload {
  transporterId?: string;
  note?: string;
}

export class LegacyJobOrderSyncService {
  constructor(private readonly supabase: SupabaseClient) {}

  async syncAssignmentLegacyFields(jobOrderId: string, payload: AssignmentLegacyPayload): Promise<void> {
    const updatePayload: any = {};
    
    if (payload.transporterId !== undefined) updatePayload.transporter_id = payload.transporterId || null;
    if (payload.purchasePrice !== undefined) updatePayload.purchase_price = payload.purchasePrice || 0;
    if (payload.notes !== undefined) updatePayload.notes = payload.notes || null;

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await this.supabase
        .from('job_orders')
        .update(updatePayload)
        .eq('id', jobOrderId);

      if (error) {
        throw new Error(`Legacy Sync Error: ${error.message}`);
      }
    }
  }

  async syncCancellationLegacyFields(jobOrderId: string, payload: CancellationLegacyPayload): Promise<void> {
    const updatePayload: any = {};
    
    if (payload.transporterId !== undefined) updatePayload.transporter_id = payload.transporterId || null;
    if (payload.note !== undefined) updatePayload.notes = payload.note || null;

    if (Object.keys(updatePayload).length > 0) {
      const { error } = await this.supabase
        .from('job_orders')
        .update(updatePayload)
        .eq('id', jobOrderId);

      if (error) {
        throw new Error(`Legacy Sync Error: ${error.message}`);
      }
    }
  }
}
