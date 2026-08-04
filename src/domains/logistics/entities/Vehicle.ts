import { Entity } from '../../../shared/kernel/Entity';
export interface VehicleProps extends Record<string, unknown> { licensePlate: string; type: string; capacity: number; }
export class Vehicle extends Entity<VehicleProps> {
  private constructor(props: VehicleProps, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create(props: VehicleProps, id: string, tenantId: string): Vehicle { return new Vehicle(props, id, tenantId); }
}
