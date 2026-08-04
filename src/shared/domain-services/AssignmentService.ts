import { Entity } from '../kernel/Entity';

export interface AssignmentContext {
  assignerId: string;
  effectiveDate?: Date;
  notes?: string;
}

export abstract class AssignmentService<TTarget extends Entity<unknown>, TResource extends Entity<unknown>> {
  abstract assign(target: TTarget, resource: TResource, context: AssignmentContext): Promise<void>;
  abstract unassign(target: TTarget, resource: TResource, context: AssignmentContext): Promise<void>;
  abstract validateAssignment(target: TTarget, resource: TResource): boolean;
}
