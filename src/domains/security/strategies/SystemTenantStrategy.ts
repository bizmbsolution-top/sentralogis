import { ITenantResolutionStrategy } from '../contracts/ITenantResolver';

export const SYSTEM_TENANT_ID = 'SYSTEM';

export class SystemTenantStrategy implements ITenantResolutionStrategy {
  async resolve(req: Request | any): Promise<string | null> {
    const apiKey = req.headers?.get('x-system-api-key');
    if (apiKey === process.env.SYSTEM_API_KEY && process.env.SYSTEM_API_KEY) {
      return SYSTEM_TENANT_ID;
    }
    return null;
  }
}
