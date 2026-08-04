import { AggregateRoot } from '../../../../shared/kernel/AggregateRoot';

export interface TruckingJobOrderProps extends Record<string, unknown> {
  joNumber: string;
  workOrderId: string;
  sbuType: 'TRUCKING';
  status: string;
  vehicleId?: string;
  driverId?: string;
  vendorId?: string;
  assignedAt?: Date;
  dispatchReadyAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export class TruckingJobOrder extends AggregateRoot<TruckingJobOrderProps> {
  private constructor(props: TruckingJobOrderProps, id: string, tenantId: string) {
    super(props, id, tenantId);
  }

  public static create(props: TruckingJobOrderProps, id: string, tenantId: string): TruckingJobOrder {
    if (!props.joNumber) throw new Error('joNumber is required');
    if (props.sbuType !== 'TRUCKING') throw new Error('Invalid SBU type for Trucking Job Order');
    
    return new TruckingJobOrder(props, id, tenantId);
  }
  
  public get joNumber(): string { return this.props.joNumber; }
  public get status(): string { return this.props.status; }
  
  public assignDriver(driverId: string, vehicleId: string, assignedAt: Date): void {
    if (this.props.status !== 'DRAFT' && this.props.status !== 'UNASSIGNED') {
      throw new Error('Cannot assign driver to job order in current status');
    }
    this.props.driverId = driverId;
    this.props.vehicleId = vehicleId;
    this.props.assignedAt = assignedAt;
    this.props.status = 'ASSIGNED';
  }
}
