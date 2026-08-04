import { SessionModel } from '../types/SessionModel';

export interface ICurrentUserProvider {
  getCurrentUser(): SessionModel | null;
  requireCurrentUser(): SessionModel;
}
