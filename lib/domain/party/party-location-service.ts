import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PartyLocation,
  CreatePartyLocationDTO,
  PartyLocationRelationshipType,
} from './types';
import { PARTY_LOCATION_RELATIONSHIP_TYPES } from './types';

export class PartyLocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PartyLocationError';
  }
}

export class PartyLocationService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createPartyLocation(tenantId: string, dto: CreatePartyLocationDTO): Promise<PartyLocation> {
    const errors: string[] = [];
    if (!dto.party_id) errors.push('party_id is required');
    if (!dto.location_id) errors.push('location_id is required');
    if (!dto.relationship_type) errors.push('relationship_type is required');
    if (!PARTY_LOCATION_RELATIONSHIP_TYPES.includes(dto.relationship_type)) {
      errors.push(`relationship_type must be one of: ${PARTY_LOCATION_RELATIONSHIP_TYPES.join(', ')}`);
    }
    if (errors.length > 0) throw new PartyLocationError(errors.join('; '));

    const { data, error } = await this.supabase
      .from('party_locations')
      .insert({
        tenant_id: tenantId,
        party_id: dto.party_id,
        location_id: dto.location_id,
        relationship_type: dto.relationship_type,
        is_primary: dto.is_primary ?? false,
        effective_from: dto.effective_from ?? null,
        effective_to: dto.effective_to ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new PartyLocationError('Party-location relationship already exists');
      }
      throw new PartyLocationError(`Failed to create party location: ${error.message}`);
    }
    return data as PartyLocation;
  }

  async getLocationsByParty(tenantId: string, partyId: string): Promise<PartyLocation[]> {
    const { data, error } = await this.supabase
      .from('party_locations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('party_id', partyId)
      .eq('is_active', true);

    if (error) throw new PartyLocationError(`Failed to fetch party locations: ${error.message}`);
    return (data ?? []) as PartyLocation[];
  }

  async getPartiesByLocation(tenantId: string, locationId: string): Promise<PartyLocation[]> {
    const { data, error } = await this.supabase
      .from('party_locations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId)
      .eq('is_active', true);

    if (error) throw new PartyLocationError(`Failed to fetch parties by location: ${error.message}`);
    return (data ?? []) as PartyLocation[];
  }
}
