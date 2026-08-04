import { IRequestContext } from './IRequestContext';

export interface ITenantResolutionStrategy {
  resolve(req: Request | any): Promise<string | null>;
}
