import { Entity } from '../../../shared/kernel/Entity';
import { Result } from '../../../shared/kernel/Result';
import { TrackingPoint } from './TrackingPoint';
export interface TelemetryProps extends Record<string, unknown> { readonly trackingId: string; readonly point: TrackingPoint; readonly timestamp: Date; }
export class Telemetry extends Entity<TelemetryProps> {
  private constructor(props: TelemetryProps, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create(props: TelemetryProps, id: string, tenantId: string): Result<Telemetry> { return Result.ok(new Telemetry(props, id, tenantId)); }
  public static restore(props: TelemetryProps, id: string, tenantId: string): Telemetry { return new Telemetry(props, id, tenantId); }
}
