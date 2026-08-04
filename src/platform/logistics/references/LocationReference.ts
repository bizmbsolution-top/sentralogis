import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface LocationRefProps extends Record<string, unknown> { readonly locationId: string; readonly type: string; }
export class LocationReference extends ValueObject<LocationRefProps> {
  private constructor(props: LocationRefProps) { super(props); }
  public static create(props: LocationRefProps): Result<LocationReference> { return Result.ok(new LocationReference(props)); }
  public static restore(props: LocationRefProps): LocationReference { return new LocationReference(props); }
}
