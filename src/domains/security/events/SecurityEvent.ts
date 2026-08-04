import { TraceContext } from '../contracts/IRequestContext';

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityEvent {
  eventId: string;
  type: 'LOGIN_FAILED' | 'ACCESS_DENIED' | 'ROLE_ESCALATION' | 'TENANT_MISMATCH';
  severity: SecuritySeverity;
  message: string;
  actorId?: string;
  trace: TraceContext;
  timestamp: string;
}
