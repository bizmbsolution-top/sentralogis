import { Entity } from '../../../shared/kernel/Entity';
import { Result } from '../../../shared/kernel/Result';
import { AuditAction } from './AuditAction';
import { AuditActor } from './AuditActor';
import { AuditContext } from './AuditContext';
export interface AuditEntryProps<TEntity> extends Record<string, unknown> { readonly action: AuditAction; readonly actor: AuditActor; readonly context: AuditContext; readonly targetId: string; readonly timestamp: Date; }
export class AuditEntry<TEntity> extends Entity<AuditEntryProps<TEntity>> {
  private constructor(props: AuditEntryProps<TEntity>, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create<TEntity>(props: AuditEntryProps<TEntity>, id: string, tenantId: string): Result<AuditEntry<TEntity>> { return Result.ok(new AuditEntry<TEntity>(props, id, tenantId)); }
  public static restore<TEntity>(props: AuditEntryProps<TEntity>, id: string, tenantId: string): AuditEntry<TEntity> { return new AuditEntry<TEntity>(props, id, tenantId); }
}
