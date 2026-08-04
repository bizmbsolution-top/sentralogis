import { IAuditPublisher } from '../contracts/IAuditPublisher';

export class SupabaseAuditPublisher implements IAuditPublisher {
  async publish(event: any): Promise<void> {
    // Stub for inserting into Supabase audit tables
    if (process.env.NODE_ENV === 'development') {
      console.log('[SupabaseAudit] Captured:', event);
    }
  }
}
