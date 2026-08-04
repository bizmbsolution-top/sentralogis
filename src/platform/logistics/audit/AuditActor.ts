import { ValueObject } from '../../../shared/kernel/ValueObject';
import { Result } from '../../../shared/kernel/Result';
export interface AuditActorProps extends Record<string, unknown> { readonly actorId: string; readonly actorType: string; }
export class AuditActor extends ValueObject<AuditActorProps> {
  private constructor(props: AuditActorProps) { super(props); }
  public static create(props: AuditActorProps): Result<AuditActor> { return Result.ok(new AuditActor(props)); }
  public static restore(props: AuditActorProps): AuditActor { return new AuditActor(props); }
}
