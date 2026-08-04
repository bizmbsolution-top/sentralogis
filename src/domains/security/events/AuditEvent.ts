import { TraceContext } from '../contracts/IRequestContext';

export interface AuditEvent {
  eventId: string;
  actorId: string;
  tenantId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  trace: TraceContext;
  timestamp: string;
  hash?: string; // Cryptographic non-repudiation
}
