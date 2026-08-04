import { IIdentityProvider } from '../contracts/IIdentityProvider';
import { SessionModel } from '../types/SessionModel';
import { createClient } from '../../../../lib/supabase/server';

export class SupabaseIdentityProvider implements IIdentityProvider {
  async verifySession(token: string): Promise<SessionModel | null> {
    try {
      const supabase = await createClient();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) return null;
      
      // In a real scenario, this is where we query our custom DB tables to build the full session,
      // avoiding doing it on the client side.
      // For this foundation, we simulate the role extraction from metadata.
      const appMetadata = user.app_metadata || {};
      const userMetadata = user.user_metadata || {};
      
      return {
        userId: user.id,
        tenantId: userMetadata.tenant_id,
        role: appMetadata.role || userMetadata.role || 'user',
        permissions: [],
        correlationId: '', // To be filled by manager
        sessionId: 'generated-session-id', // Simulated
        issuedAt: Date.now(),
        expiresAt: Date.now() + 3600 * 1000,
        identityType: 'HUMAN'
      };
    } catch {
      return null;
    }
  }

  async logout(sessionId: string): Promise<void> {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
}
