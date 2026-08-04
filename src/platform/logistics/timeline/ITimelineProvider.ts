import { Result } from '../../../shared/kernel/Result';
import { TimelineEntry } from './TimelineEntry';
import { TimelineAggregate } from './TimelineAggregate';
export interface ITimelineProvider<TEntity, TPayload> {
  appendEntry(entityId: string, entry: Readonly<TimelineEntry<TPayload>>): Result<void>;
  getTimeline(entityId: string): Result<TimelineAggregate<TEntity, TPayload>>;
}
