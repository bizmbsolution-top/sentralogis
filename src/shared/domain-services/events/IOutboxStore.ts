import { EventEnvelope } from './EventEnvelope';
import { DomainEvent } from './DomainEvent';

export interface OutboxRecord {
  id: string;
  aggregateId: string;
  eventType: string;
  envelope: EventEnvelope<DomainEvent>;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED' | 'DEAD_LETTER';
  createdAt: Date;
  publishedAt?: Date;
  retryCount: number;
  lastError?: string;
}

export interface IOutboxStore {
  save(record: OutboxRecord): Promise<void>;
  markAsPublished(id: string): Promise<void>;
  markAsFailed(id: string, error: string): Promise<void>;
  markAsDeadLetter(id: string, reason: string): Promise<void>;
  getPendingRecords(limit: number): Promise<OutboxRecord[]>;
}
