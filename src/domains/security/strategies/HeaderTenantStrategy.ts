import { ITenantResolutionStrategy } from '../contracts/ITenantResolver';

export class HeaderTenantStrategy implements ITenantResolutionStrategy {
  async resolve(req: Request): Promise<string | null> {
    const tenantId = req.headers?.get('x-tenant-id');
    return tenantId || null;
  }
}
