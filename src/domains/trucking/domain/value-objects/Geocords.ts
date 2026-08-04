import { ValueObject } from '../../../../shared/kernel/ValueObject';

interface GeocordsProps extends Record<string, unknown> {
  latitude: number;
  longitude: number;
}

export class Geocords extends ValueObject<GeocordsProps> {
  private constructor(props: GeocordsProps) {
    super(props);
  }

  public static create(latitude: number, longitude: number): Geocords {
    if (latitude < -90 || latitude > 90) throw new Error('Invalid latitude');
    if (longitude < -180 || longitude > 180) throw new Error('Invalid longitude');
    
    return new Geocords({ latitude, longitude });
  }

  get latitude(): number { return this.props.latitude; }
  get longitude(): number { return this.props.longitude; }
}
