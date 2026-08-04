import { SessionModel } from '../types/SessionModel';

export interface IIdentityProvider {
  verifySession(token: string): Promise<SessionModel | null>;
  logout(sessionId: string): Promise<void>;
}
