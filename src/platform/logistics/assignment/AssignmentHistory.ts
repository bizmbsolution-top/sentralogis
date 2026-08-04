import { Entity } from '../../../shared/kernel/Entity';
import { Result } from '../../../shared/kernel/Result';
import { AssignmentStatus } from './AssignmentStatus';
export interface AssignmentHistoryProps extends Record<string, unknown> { readonly assignmentId: string; readonly action: AssignmentStatus; readonly timestamp: Date; }
export class AssignmentHistory extends Entity<AssignmentHistoryProps> {
  private constructor(props: AssignmentHistoryProps, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create(props: AssignmentHistoryProps, id: string, tenantId: string): Result<AssignmentHistory> { return Result.ok(new AssignmentHistory(props, id, tenantId)); }
  public static restore(props: AssignmentHistoryProps, id: string, tenantId: string): AssignmentHistory { return new AssignmentHistory(props, id, tenantId); }
}
