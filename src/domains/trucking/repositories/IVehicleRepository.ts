import { Vehicle } from '../vehicle/Vehicle';
import { Result } from '../../../shared/kernel/Result';

export interface IVehicleRepository {
  findById(id: string, tenantId: string): Promise<Vehicle | null>;
  save(vehicle: Vehicle): Promise<Result<void>>;
}
