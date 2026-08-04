import { AggregateRoot } from '../../../shared/kernel/AggregateRoot';
import { Result } from '../../../shared/kernel/Result';
import { JobOrderStatus } from './JobOrderStatus';

export interface JobOrderProps extends Record<string, unknown> {
  readonly workOrderId: string;
  status: JobOrderStatus;
  driverId: string | null;
  vehicleId: string | null;
}

export class JobOrder extends AggregateRoot<JobOrderProps> {
  private constructor(props: JobOrderProps, id: string, tenantId: string) {
    super(props, id, tenantId);
  }

  public static create(workOrderId: string, id: string, tenantId: string): Result<JobOrder> {
    if (!workOrderId || workOrderId.trim() === '') {
      return Result.fail<JobOrder>('workOrderId is required to create a JobOrder.');
    }
    
    return Result.ok(new JobOrder({
      workOrderId,
      status: JobOrderStatus.PENDING_ASSIGNMENT,
      driverId: null,
      vehicleId: null
    }, id, tenantId));
  }

  public static restore(props: JobOrderProps, id: string, tenantId: string): JobOrder {
    return new JobOrder(props, id, tenantId);
  }

  public get workOrderId(): string { return this.props.workOrderId; }
  public get status(): JobOrderStatus { return this.props.status; }
  public get driverId(): string | null { return this.props.driverId; }
  public get vehicleId(): string | null { return this.props.vehicleId; }

  public assignDriverAndVehicle(driverId: string, vehicleId: string): Result<void> {
    if (this.props.status !== JobOrderStatus.PENDING_ASSIGNMENT) {
      return Result.fail<void>('JobOrder must be PENDING_ASSIGNMENT to assign resources.');
    }
    if (!driverId || driverId.trim() === '') {
      return Result.fail<void>('driverId must not be empty.');
    }
    if (!vehicleId || vehicleId.trim() === '') {
      return Result.fail<void>('vehicleId must not be empty.');
    }
    
    this.props.driverId = driverId;
    this.props.vehicleId = vehicleId;
    this.props.status = JobOrderStatus.ASSIGNED;
    
    return Result.ok<void>();
  }

  public acceptByDriver(): Result<void> {
    if (this.props.status !== JobOrderStatus.ASSIGNED) {
      return Result.fail<void>('JobOrder must be ASSIGNED to be accepted by driver.');
    }
    this.props.status = JobOrderStatus.DRIVER_ACCEPTED;
    return Result.ok<void>();
  }

  public startMission(): Result<void> {
    if (this.props.status !== JobOrderStatus.DRIVER_ACCEPTED) {
      return Result.fail<void>('JobOrder must be DRIVER_ACCEPTED to start mission.');
    }
    
    this.props.status = JobOrderStatus.IN_PROGRESS;
    return Result.ok<void>();
  }

  public markArrival(): Result<void> {
    if (this.props.status !== JobOrderStatus.IN_PROGRESS) {
      return Result.fail<void>('JobOrder must be IN_PROGRESS to mark arrival.');
    }
    
    this.props.status = JobOrderStatus.DELIVERED;
    return Result.ok<void>();
  }

  public submitPOD(): Result<void> {
    if (this.props.status !== JobOrderStatus.DELIVERED) {
      return Result.fail<void>('JobOrder must be DELIVERED to submit POD.');
    }
    
    this.props.status = JobOrderStatus.POD_SUBMITTED;
    return Result.ok<void>();
  }

  public completeMission(): Result<void> {
    // Note: Allow completing from DELIVERED or POD_SUBMITTED for flexibility, or strict POD_SUBMITTED.
    // Keeping it strict as requested by Domain requirements.
    if (this.props.status !== JobOrderStatus.POD_SUBMITTED) {
      return Result.fail<void>('JobOrder must have POD_SUBMITTED to be completed.');
    }
    
    this.props.status = JobOrderStatus.COMPLETED;
    return Result.ok<void>();
  }

  public cancelMission(): Result<void> {
    const cancelableStates = [
      JobOrderStatus.PENDING_ASSIGNMENT,
      JobOrderStatus.ASSIGNED,
      JobOrderStatus.DRIVER_ACCEPTED
    ];
    
    if (!cancelableStates.includes(this.props.status)) {
      return Result.fail<void>(`Cannot cancel JobOrder in ${this.props.status} state.`);
    }
    
    this.props.status = JobOrderStatus.CANCELLED;
    return Result.ok<void>();
  }
}
