import { Entity } from '../../../shared/kernel/Entity';
export interface DriverProps extends Record<string, unknown> { name: string; licenseNumber: string; isAvailable: boolean; }
export class Driver extends Entity<DriverProps> {
  private constructor(props: DriverProps, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create(props: DriverProps, id: string, tenantId: string): Driver { return new Driver(props, id, tenantId); }
}
