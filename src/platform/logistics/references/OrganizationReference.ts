import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface OrganizationRefProps extends Record<string, unknown> { readonly orgId: string; readonly name: string; }
export class OrganizationReference extends ValueObject<OrganizationRefProps> {
  private constructor(props: OrganizationRefProps) { super(props); }
  public static create(props: OrganizationRefProps): Result<OrganizationReference> { return Result.ok(new OrganizationReference(props)); }
  public static restore(props: OrganizationRefProps): OrganizationReference { return new OrganizationReference(props); }
}
