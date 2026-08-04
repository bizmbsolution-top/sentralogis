import { IServiceAccountProvider } from '../contracts/IServiceAccountProvider';
import { SessionModel } from '../types/SessionModel';

export class ServiceAccountProvider implements IServiceAccountProvider {
  async authenticateApiKey(apiKey: string): Promise<SessionModel | null> {
    const systemKey = process.env.SYSTEM_API_KEY;
    
    if (systemKey && apiKey === systemKey) {
      return {
        userId: 'system-service-account',
        tenantId: 'SYSTEM',
        role: 'system_admin',
        permissions: ['*'],
        correlationId: '',
        sessionId: 'sys-' + Date.now(),
        issuedAt: Date.now(),
        expiresAt: Date.now() + 86400 * 1000,
        identityType: 'SERVICE_ACCOUNT'
      };
    }
    
    return null;
  }
}
