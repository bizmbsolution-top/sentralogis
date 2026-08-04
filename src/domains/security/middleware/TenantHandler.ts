import { IMiddlewareHandler } from '../contracts/IMiddlewareHandler';
import { ITenantResolutionStrategy } from '../contracts/ITenantResolver';
import { UnauthorizedException } from '../exceptions/UnauthorizedException';

export class TenantHandler implements IMiddlewareHandler {
  constructor(private strategies: ITenantResolutionStrategy[]) {}

  async handle(req: Request, next: () => Promise<Response>): Promise<Response> {
    let tenantId: string | null = null;

    for (const strategy of this.strategies) {
      tenantId = await strategy.resolve(req);
      if (tenantId) break;
    }

    if (!tenantId) {
      throw new UnauthorizedException('Missing or invalid tenant context');
    }

    req.headers.set('x-resolved-tenant-id', tenantId);
    return next();
  }
}
