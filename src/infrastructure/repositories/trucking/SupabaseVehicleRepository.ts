import { SupabaseClient } from '@supabase/supabase-js';
import { IVehicleRepository } from '../../../domains/trucking/repositories/IVehicleRepository';
import { Vehicle } from '../../../domains/trucking/vehicle/Vehicle';
import { Result } from '../../../shared/kernel/Result';
import { FleetRow } from './LegacyRowTypes';
import { mapLegacyToVehicleStatus, mapVehicleStatusToLegacy } from './StatusMappers';

export class SupabaseVehicleRepository implements IVehicleRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string, tenantId: string): Promise<Vehicle | null> {
    const { data, error } = await this.client
      .from('md_fleets')
      .select('id, tenant_id, plate_number, status, capacity_kg')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as FleetRow;

    if (row.capacity_kg === null || row.capacity_kg === undefined) {
      console.warn(`[SupabaseVehicleRepository] Vehicle ${row.id} has NULL capacity_kg, defaulting to 0`);
    }

    return Vehicle.restore(
      {
        licensePlate: row.plate_number,
        status: mapLegacyToVehicleStatus(row.status),
        capacityKg: row.capacity_kg ?? 0,
      },
      row.id,
      row.tenant_id
    );
  }

  async save(vehicle: Vehicle): Promise<Result<void>> {
    const { error } = await this.client
      .from('md_fleets')
      .update({
        status: mapVehicleStatusToLegacy(vehicle.status),
        updated_at: new Date().toISOString(),
      })
      .eq('id', vehicle.id)
      .eq('tenant_id', vehicle.tenantId);

    if (error) {
      return Result.fail<void>(`Failed to save Vehicle ${vehicle.id}: ${error.message}`);
    }

    return Result.ok<void>();
  }
}
