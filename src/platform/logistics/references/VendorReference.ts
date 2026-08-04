import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface VendorRefProps extends Record<string, unknown> { readonly vendorId: string; readonly name: string; }
export class VendorReference extends ValueObject<VendorRefProps> {
  private constructor(props: VendorRefProps) { super(props); }
  public static create(props: VendorRefProps): Result<VendorReference> { return Result.ok(new VendorReference(props)); }
  public static restore(props: VendorRefProps): VendorReference { return new VendorReference(props); }
}
