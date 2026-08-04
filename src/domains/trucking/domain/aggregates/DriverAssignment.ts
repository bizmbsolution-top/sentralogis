import { AggregateRoot } from '../../../../shared/kernel/AggregateRoot';

export interface DriverAssignmentProps extends Record<string, unknown> {
  jobOrderId: string;
  driverId: string;
  vehicleId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  vendorId?: string;
  assignedAt: Date;
  respondedAt?: Date;
  notes?: string;
}

export class DriverAssignment extends AggregateRoot<DriverAssignmentProps> {
  private constructor(props: DriverAssignmentProps, id: string, tenantId: string) {
    super(props, id, tenantId);
  }

  public static create(props: DriverAssignmentProps, id: string, tenantId: string): DriverAssignment {
    return new DriverAssignment(props, id, tenantId);
  }
  
  public accept(respondedAt: Date): void {
    this.props.status = 'ACCEPTED';
    this.props.respondedAt = respondedAt;
  }
  
  public reject(reason: string, respondedAt: Date): void {
    this.props.status = 'REJECTED';
    this.props.notes = reason;
    this.props.respondedAt = respondedAt;
  }
}
