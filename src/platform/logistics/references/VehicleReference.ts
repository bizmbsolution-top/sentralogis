import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface VehicleRefProps extends Record<string, unknown> { readonly vehicleId: string; readonly plateNumber: string; }
export class VehicleReference extends ValueObject<VehicleRefProps> {
  private constructor(props: VehicleRefProps) { super(props); }
  public static create(props: VehicleRefProps): Result<VehicleReference> { return Result.ok(new VehicleReference(props)); }
  public static restore(props: VehicleRefProps): VehicleReference { return new VehicleReference(props); }
}
