import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface CustomerRefProps extends Record<string, unknown> { readonly customerId: string; readonly name: string; }
export class CustomerReference extends ValueObject<CustomerRefProps> {
  private constructor(props: CustomerRefProps) { super(props); }
  public static create(props: CustomerRefProps): Result<CustomerReference> { return Result.ok(new CustomerReference(props)); }
  public static restore(props: CustomerRefProps): CustomerReference { return new CustomerReference(props); }
}
