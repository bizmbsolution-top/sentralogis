import { Entity } from '../../../shared/kernel/Entity';
export interface TimelineProps extends Record<string, unknown> { referenceId: string; activities: any[]; }
export class Timeline extends Entity<TimelineProps> {
  private constructor(props: TimelineProps, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create(props: TimelineProps, id: string, tenantId: string): Timeline { return new Timeline(props, id, tenantId); }
}
