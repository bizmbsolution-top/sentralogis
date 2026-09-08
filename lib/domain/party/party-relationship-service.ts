import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PartyRelationship,
  CreatePartyRelationshipDTO,
  PartyRelationshipType,
} from './types';
import { PARTY_RELATIONSHIP_TYPES } from './types';

export class PartyRelationshipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PartyRelationshipError';
  }
}

export class PartyRelationshipService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createRelationship(tenantId: string, dto: CreatePartyRelationshipDTO): Promise<PartyRelationship> {
    const errors: string[] = [];
    if (!dto.from_party_id) errors.push('from_party_id is required');
    if (!dto.to_party_id) errors.push('to_party_id is required');
    if (dto.from_party_id === dto.to_party_id) errors.push('from_party_id and to_party_id must be different');
    if (!dto.relationship_type) errors.push('relationship_type is required');
    if (!PARTY_RELATIONSHIP_TYPES.includes(dto.relationship_type)) {
      errors.push(`relationship_type must be one of: ${PARTY_RELATIONSHIP_TYPES.join(', ')}`);
    }
    if (errors.length > 0) throw new PartyRelationshipError(errors.join('; '));

    const { data, error } = await this.supabase
      .from('party_relationships')
      .insert({
        tenant_id: tenantId,
        from_party_id: dto.from_party_id,
        to_party_id: dto.to_party_id,
        relationship_type: dto.relationship_type,
        effective_from: dto.effective_from ?? null,
        effective_to: dto.effective_to ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new PartyRelationshipError('Relationship already exists');
      }
      throw new PartyRelationshipError(`Failed to create relationship: ${error.message}`);
    }
    return data as PartyRelationship;
  }

  async getRelationships(tenantId: string, partyId: string): Promise<PartyRelationship[]> {
    const { data, error } = await this.supabase
      .from('party_relationships')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`from_party_id.eq.${partyId},to_party_id.eq.${partyId}`)
      .eq('is_active', true);

    if (error) throw new PartyRelationshipError(`Failed to fetch relationships: ${error.message}`);
    return (data ?? []) as PartyRelationship[];
  }
}
