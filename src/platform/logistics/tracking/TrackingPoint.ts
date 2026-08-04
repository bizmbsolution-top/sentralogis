import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface TrackingPointProps extends Record<string, unknown> { readonly lat: number; readonly lng: number; readonly alt?: number; }
export class TrackingPoint extends ValueObject<TrackingPointProps> {
  private constructor(props: TrackingPointProps) { super(props); }
  public static create(props: TrackingPointProps): Result<TrackingPoint> { return Result.ok(new TrackingPoint(props)); }
  public static restore(props: TrackingPointProps): TrackingPoint { return new TrackingPoint(props); }
}
