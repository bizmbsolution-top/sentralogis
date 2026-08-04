import { AggregateRoot } from '../../../shared/kernel/AggregateRoot';
import { Result } from '../../../shared/kernel/Result';

export enum VehicleStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE'
}

export interface VehicleProps extends Record<string, unknown> {
  readonly licensePlate: string;
  status: VehicleStatus;
  readonly capacityKg: number;
}

export class Vehicle extends AggregateRoot<VehicleProps> {
  private constructor(props: VehicleProps, id: string, tenantId: string) {
    super(props, id, tenantId);
  }

  public static create(props: VehicleProps, id: string, tenantId: string): Result<Vehicle> {
    if (!props.licensePlate || props.licensePlate.trim() === '') {
      return Result.fail<Vehicle>('License plate is required.');
    }
    if (props.capacityKg <= 0) {
      return Result.fail<Vehicle>('Capacity must be greater than 0.');
    }
    return Result.ok(new Vehicle(props, id, tenantId));
  }

  public static restore(props: VehicleProps, id: string, tenantId: string): Vehicle {
    return new Vehicle(props, id, tenantId);
  }

  public get licensePlate(): string { return this.props.licensePlate; }
  public get status(): VehicleStatus { return this.props.status; }
  public get capacityKg(): number { return this.props.capacityKg; }

  public dispatch(): Result<void> {
    if (this.props.status !== VehicleStatus.AVAILABLE) {
      return Result.fail<void>('Vehicle is not available for dispatch.');
    }
    this.props.status = VehicleStatus.IN_USE;
    return Result.ok<void>();
  }

  public release(): Result<void> {
    this.props.status = VehicleStatus.AVAILABLE;
    return Result.ok<void>();
  }
}
