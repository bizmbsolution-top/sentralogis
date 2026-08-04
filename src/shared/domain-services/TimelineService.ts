import { Entity } from '../kernel/Entity';

export interface TimelineEntry {
  entryId: string;
  timestamp: Date;
  action: string;
  actorId: string;
  type: 'ACTIVITY' | 'STATUS' | 'AUDIT' | 'APPROVAL' | 'ASSIGNMENT' | 'NOTIFICATION' | 'EVENT';
  details?: Record<string, unknown>;
}

export interface TimelineQuery {
  types?: ('ACTIVITY' | 'STATUS' | 'AUDIT' | 'APPROVAL' | 'ASSIGNMENT' | 'NOTIFICATION' | 'EVENT')[];
  actorId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export abstract class TimelineService<TEntity extends Entity<unknown>> {
  abstract recordActivity(entity: TEntity, entry: Omit<TimelineEntry, 'entryId' | 'timestamp'>): Promise<void>;
  
  // Unified query object pattern eliminates interface explosion
  abstract getTimeline(entityId: string, query?: TimelineQuery): Promise<TimelineEntry[]>;
}
