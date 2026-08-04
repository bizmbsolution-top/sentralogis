import { ValueObject } from '../../../shared/kernel/ValueObject';
export interface GeoCoordinateProps extends Record<string, unknown> { latitude: number; longitude: number; }
export class GeoCoordinate extends ValueObject<GeoCoordinateProps> {
  private constructor(props: GeoCoordinateProps) { super(props); }
  public static create(lat: number, lng: number): GeoCoordinate {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new Error('Invalid coordinates');
    return new GeoCoordinate({ latitude: lat, longitude: lng });
  }
}
