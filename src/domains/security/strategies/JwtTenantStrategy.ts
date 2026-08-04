import { ITenantResolutionStrategy } from '../contracts/ITenantResolver';

export class JwtTenantStrategy implements ITenantResolutionStrategy {
  async resolve(req: Request | any): Promise<string | null> {
    // Requires decoding JWT. Currently returning null as a fallback.
    return null;
  }
}
