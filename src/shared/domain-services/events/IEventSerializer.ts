import { EventEnvelope } from './EventEnvelope';
import { DomainEvent } from './DomainEvent';

export interface IEventSerializer {
  serialize(envelope: EventEnvelope<DomainEvent>): string | Buffer;
  deserialize(payload: string | Buffer): EventEnvelope<DomainEvent>;
}
