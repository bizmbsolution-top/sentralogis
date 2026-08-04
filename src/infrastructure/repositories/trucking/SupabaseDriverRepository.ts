import { SupabaseClient } from '@supabase/supabase-js';
import { IDriverRepository } from '../../../domains/trucking/repositories/IDriverRepository';
import { Driver, DriverStatus } from '../../../domains/trucking/driver/Driver';
import { Result } from '../../../shared/kernel/Result';
import { DriverRow } from './LegacyRowTypes';
import { mapLegacyToDriverStatus, mapDriverStatusToLegacy } from './StatusMappers';

export class SupabaseDriverRepository implements IDriverRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string, tenantId: string): Promise<Driver | null> {
    const { data, error } = await this.client
      .from('md_drivers')
      .select('id, tenant_id, name, phone, status, is_active, is_working')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as DriverRow;

    return Driver.restore(
      {
        name: row.name,
        status: mapLegacyToDriverStatus(row.status),
        phoneNumber: row.phone ?? '',
      },
      row.id,
      row.tenant_id
    );
  }

  async save(driver: Driver): Promise<Result<void>> {
    const { error } = await this.client
      .from('md_drivers')
      .update({
        status: mapDriverStatusToLegacy(driver.status),
        is_working: driver.status === DriverStatus.ON_DUTY,
        updated_at: new Date().toISOString(),
      })
      .eq('id', driver.id)
      .eq('tenant_id', driver.tenantId);

    if (error) {
      return Result.fail<void>(`Failed to save Driver ${driver.id}: ${error.message}`);
    }

    return Result.ok<void>();
  }
}
