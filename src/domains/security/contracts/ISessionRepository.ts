import { SessionModel } from '../types/SessionModel';

export interface ISessionRepository {
  findById(sessionId: string): Promise<SessionModel | null>;
  save(session: SessionModel): Promise<void>;
  delete(sessionId: string): Promise<void>;
}
