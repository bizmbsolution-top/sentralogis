import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
import { TrackingPoint } from './TrackingPoint';
export interface GeoFenceProps extends Record<string, unknown> { readonly center: TrackingPoint; readonly radiusMeters: number; }
export class GeoFence extends ValueObject<GeoFenceProps> {
  private constructor(props: GeoFenceProps) { super(props); }
  public static create(props: GeoFenceProps): Result<GeoFence> { return Result.ok(new GeoFence(props)); }
  public static restore(props: GeoFenceProps): GeoFence { return new GeoFence(props); }
}
