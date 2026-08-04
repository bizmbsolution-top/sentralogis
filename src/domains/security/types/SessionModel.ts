export type IdentityType = 'HUMAN' | 'SERVICE_ACCOUNT' | 'API_KEY' | 'WEBHOOK' | 'BACKGROUND_WORKER' | 'CRON_JOB';

export interface SessionModel {
  userId: string;
  tenantId?: string;
  role: string;
  permissions?: string[];
  correlationId: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  refreshTokenId?: string;
  identityType: IdentityType;
}
