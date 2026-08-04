import { DomainEvent } from './DomainEvent';

export interface EventEnvelope<TEvent extends DomainEvent> {
  metadata: {
    source: string;
    schemaVersion: string;
    contentType: string;
    timestamp: Date;
  };
  headers: Record<string, string>;
  payload: TEvent;
}
