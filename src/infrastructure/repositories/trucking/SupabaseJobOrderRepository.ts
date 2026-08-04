import { SupabaseClient } from '@supabase/supabase-js';
import { IJobOrderRepository } from '../../../domains/trucking/repositories/IJobOrderRepository';
import { JobOrder } from '../../../domains/trucking/job-order/JobOrder';
import { Result } from '../../../shared/kernel/Result';
import { JobOrderRow } from './LegacyRowTypes';
import { mapLegacyToJobOrderStatus, mapJobOrderStatusToLegacy } from './StatusMappers';

export class SupabaseJobOrderRepository implements IJobOrderRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string, tenantId: string): Promise<JobOrder | null> {
    const { data, error } = await this.client
      .from('job_orders')
      .select('id, tenant_id, wo_item_id, jo_number, status, driver_id, fleet_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as JobOrderRow;

    return JobOrder.restore(
      {
        workOrderId: row.wo_item_id,
        status: mapLegacyToJobOrderStatus(row.status),
        driverId: row.driver_id,
        vehicleId: row.fleet_id,
      },
      row.id,
      row.tenant_id
    );
  }

  async save(jobOrder: JobOrder): Promise<Result<void>> {
    const { error } = await this.client
      .from('job_orders')
      .update({
        status: mapJobOrderStatusToLegacy(jobOrder.status),
        driver_id: jobOrder.driverId,
        fleet_id: jobOrder.vehicleId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobOrder.id)
      .eq('tenant_id', jobOrder.tenantId);

    if (error) {
      return Result.fail<void>(`Failed to save JobOrder ${jobOrder.id}: ${error.message}`);
    }

    return Result.ok<void>();
  }
}
