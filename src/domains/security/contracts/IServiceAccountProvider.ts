import { SessionModel } from '../types/SessionModel';

export interface IServiceAccountProvider {
  authenticateApiKey(apiKey: string): Promise<SessionModel | null>;
}
