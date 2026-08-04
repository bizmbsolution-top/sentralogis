import { AggregateRoot } from '../../../../shared/kernel/AggregateRoot';

export interface TripTelemetryProps extends Record<string, unknown> {
  jobOrderId: string;
  driverId: string;
  vehicleId?: string;
  lastLat?: number;
  lastLng?: number;
  lastPingAt?: Date;
  totalDistanceMeters: number;
  geofenceRadiusMeters: number;
}

export class TripTelemetry extends AggregateRoot<TripTelemetryProps> {
  private constructor(props: TripTelemetryProps, id: string, tenantId: string) {
    super(props, id, tenantId);
  }

  public static create(props: TripTelemetryProps, id: string, tenantId: string): TripTelemetry {
    return new TripTelemetry(props, id, tenantId);
  }
  
  public recordPing(lat: number, lng: number, pingTime: Date): void {
    this.props.lastLat = lat;
    this.props.lastLng = lng;
    this.props.lastPingAt = pingTime;
  }
}
