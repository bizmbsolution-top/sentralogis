import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface DriverRefProps extends Record<string, unknown> { readonly driverId: string; readonly name: string; }
export class DriverReference extends ValueObject<DriverRefProps> {
  private constructor(props: DriverRefProps) { super(props); }
  public static create(props: DriverRefProps): Result<DriverReference> { return Result.ok(new DriverReference(props)); }
  public static restore(props: DriverRefProps): DriverReference { return new DriverReference(props); }
}
