import { ITokenValidator } from '../contracts/ITokenValidator';
import { UnauthorizedException } from '../exceptions/UnauthorizedException';

export class TokenValidator implements ITokenValidator {
  async validateAccessToken(token: string): Promise<any> {
    if (!token) throw new UnauthorizedException('Missing token');
    
    // In Edge environments, we might use 'jose' to verify the signature.
    // For now, we decode the payload for inspection (assuming signature is validated elsewhere or we are relying on Supabase).
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT format');
      
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new UnauthorizedException('Token expired');
      }
      
      return payload;
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'Invalid token');
    }
  }
}
