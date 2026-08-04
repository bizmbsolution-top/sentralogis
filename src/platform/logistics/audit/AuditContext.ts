import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface AuditContextProps extends Record<string, unknown> { readonly ipAddress: string; readonly userAgent: string; }
export class AuditContext extends ValueObject<AuditContextProps> {
  private constructor(props: AuditContextProps) { super(props); }
  public static create(props: AuditContextProps): Result<AuditContext> { return Result.ok(new AuditContext(props)); }
  public static restore(props: AuditContextProps): AuditContext { return new AuditContext(props); }
}
