import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PartyContact,
  CreatePartyContactDTO,
} from './types';

export class PartyContactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PartyContactError';
  }
}

export class PartyContactService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createContact(tenantId: string, dto: CreatePartyContactDTO): Promise<PartyContact> {
    const errors: string[] = [];
    if (!dto.party_id) errors.push('party_id is required');
    if (!dto.contact_name) errors.push('contact_name is required');
    if (errors.length > 0) throw new PartyContactError(errors.join('; '));

    const { data, error } = await this.supabase
      .from('party_contacts')
      .insert({
        tenant_id: tenantId,
        party_id: dto.party_id,
        contact_name: dto.contact_name,
        contact_role: dto.contact_role ?? null,
        department: dto.department ?? null,
        title: dto.title ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        mobile: dto.mobile ?? null,
        whatsapp: dto.whatsapp ?? null,
        is_primary: dto.is_primary ?? false,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new PartyContactError(`Failed to create contact: ${error.message}`);
    return data as PartyContact;
  }

  async getContactsByParty(tenantId: string, partyId: string): Promise<PartyContact[]> {
    const { data, error } = await this.supabase
      .from('party_contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('party_id', partyId)
      .eq('is_active', true);

    if (error) throw new PartyContactError(`Failed to fetch contacts: ${error.message}`);
    return (data ?? []) as PartyContact[];
  }
}
