import { ISessionManager } from '../contracts/ISessionManager';
import { IIdentityProvider } from '../contracts/IIdentityProvider';
import { IServiceAccountProvider } from '../contracts/IServiceAccountProvider';
import { SessionModel } from '../types/SessionModel';
import { UnauthorizedException } from '../exceptions/UnauthorizedException';

export class SessionManager implements ISessionManager {
  constructor(
    private identityProvider: IIdentityProvider,
    private serviceAccountProvider: IServiceAccountProvider
  ) {}

  async getCurrentSession(req: Request): Promise<SessionModel | null> {
    // 1. Check for Service Account API Key
    const apiKey = req.headers.get('x-api-key');
    if (apiKey) {
      const session = await this.serviceAccountProvider.authenticateApiKey(apiKey);
      if (session) return session;
      throw new UnauthorizedException('Invalid API Key');
    }

    // 2. Check for Bearer Token
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const session = await this.identityProvider.verifySession(token);
      if (session) return session;
    }

    return null;
  }

  async createSession(userId: string, metadata: Record<string, any>): Promise<SessionModel> {
    throw new Error('Not implemented. Creation delegated to Supabase.');
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.identityProvider.logout(sessionId);
  }
}
