import { SessionModel } from '../types/SessionModel';

export interface ISessionManager {
  getCurrentSession(req: Request): Promise<SessionModel | null>;
  createSession(userId: string, metadata: Record<string, any>): Promise<SessionModel>;
  invalidateSession(sessionId: string): Promise<void>;
}
