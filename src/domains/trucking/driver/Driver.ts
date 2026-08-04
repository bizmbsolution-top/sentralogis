import { AggregateRoot } from '../../../shared/kernel/AggregateRoot';
import { Result } from '../../../shared/kernel/Result';

export enum DriverStatus {
  AVAILABLE = 'AVAILABLE',
  ON_DUTY = 'ON_DUTY',
  UNAVAILABLE = 'UNAVAILABLE'
}

export interface DriverProps extends Record<string, unknown> {
  readonly name: string;
  status: DriverStatus;
  readonly phoneNumber: string;
}

export class Driver extends AggregateRoot<DriverProps> {
  private constructor(props: DriverProps, id: string, tenantId: string) {
    super(props, id, tenantId);
  }

  public static create(props: DriverProps, id: string, tenantId: string): Result<Driver> {
    if (!props.name || props.name.trim() === '') {
      return Result.fail<Driver>('Driver name is required.');
    }
    return Result.ok(new Driver(props, id, tenantId));
  }

  public static restore(props: DriverProps, id: string, tenantId: string): Driver {
    return new Driver(props, id, tenantId);
  }

  public get name(): string { return this.props.name; }
  public get status(): DriverStatus { return this.props.status; }
  public get phoneNumber(): string { return this.props.phoneNumber; }

  public markOnDuty(): Result<void> {
    if (this.props.status === DriverStatus.UNAVAILABLE) {
      return Result.fail<void>('Cannot assign an unavailable driver.');
    }
    this.props.status = DriverStatus.ON_DUTY;
    return Result.ok<void>();
  }

  public release(): Result<void> {
    this.props.status = DriverStatus.AVAILABLE;
    return Result.ok<void>();
  }
}
