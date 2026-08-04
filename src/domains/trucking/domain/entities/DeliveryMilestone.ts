import { Entity } from '../../../../shared/kernel/Entity';

export interface DeliveryMilestoneProps extends Record<string, unknown> {
  jobOrderId: string;
  routeStopId: string;
  milestoneType: 'ARRIVAL' | 'DEPARTURE' | 'LOADING' | 'UNLOADING' | 'POD_UPLOADED';
  timestamp: Date;
  recordedLat?: number;
  recordedLng?: number;
  geofenceMatched: boolean;
  notes?: string;
}

export class DeliveryMilestone extends Entity<DeliveryMilestoneProps> {
  private constructor(props: DeliveryMilestoneProps, id: string, tenantId: string) {
    super(props, id, tenantId);
  }

  public static create(props: DeliveryMilestoneProps, id: string, tenantId: string): DeliveryMilestone {
    return new DeliveryMilestone(props, id, tenantId);
  }
}
