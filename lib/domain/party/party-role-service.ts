import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PartyRole,
  CreatePartyRoleDTO,
  PartyRoleType,
  PartyRoleContextType,
} from './types';
import {
  PARTY_ROLE_TYPES,
  PARTY_ROLE_CONTEXT_TYPES,
} from './types';

export class PartyRoleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PartyRoleError';
  }
}

export class PartyRoleService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createRole(tenantId: string, dto: CreatePartyRoleDTO): Promise<PartyRole> {
    const errors: string[] = [];
    if (!dto.party_id) errors.push('party_id is required');
    if (!dto.role_type) errors.push('role_type is required');
    if (!PARTY_ROLE_TYPES.includes(dto.role_type)) {
      errors.push(`role_type must be one of: ${PARTY_ROLE_TYPES.join(', ')}`);
    }
    if (!dto.context_type) errors.push('context_type is required');
    if (!PARTY_ROLE_CONTEXT_TYPES.includes(dto.context_type)) {
      errors.push(`context_type must be one of: ${PARTY_ROLE_CONTEXT_TYPES.join(', ')}`);
    }
    if (dto.context_type !== 'GLOBAL' && !dto.context_id) {
      errors.push('context_id is required for non-GLOBAL context types');
    }
    if (errors.length > 0) throw new PartyRoleError(errors.join('; '));

    const { data, error } = await this.supabase
      .from('party_roles')
      .insert({
        tenant_id: tenantId,
        party_id: dto.party_id,
        role_type: dto.role_type,
        context_type: dto.context_type,
        context_id: dto.context_id ?? null,
        is_primary: dto.is_primary ?? false,
        effective_from: dto.effective_from ?? null,
        effective_to: dto.effective_to ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new PartyRoleError('Party already has this role in this context');
      }
      throw new PartyRoleError(`Failed to create party role: ${error.message}`);
    }
    return data as PartyRole;
  }

  async getRolesByParty(tenantId: string, partyId: string): Promise<PartyRole[]> {
    const { data, error } = await this.supabase
      .from('party_roles')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('party_id', partyId)
      .eq('is_active', true);

    if (error) throw new PartyRoleError(`Failed to fetch party roles: ${error.message}`);
    return (data ?? []) as PartyRole[];
  }

  async hasRole(tenantId: string, partyId: string, roleType: PartyRoleType): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('party_roles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('party_id', partyId)
      .eq('role_type', roleType)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw new PartyRoleError(`Failed to check party role: ${error.message}`);
    return !!data;
  }

  async deactivateRole(tenantId: string, roleId: string): Promise<void> {
    const { error } = await this.supabase
      .from('party_roles')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('id', roleId);

    if (error) throw new PartyRoleError(`Failed to deactivate party role: ${error.message}`);
  }

  async getVendors(tenantId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('party_roles')
      .select('party_id')
      .eq('tenant_id', tenantId)
      .eq('role_type', 'VENDOR')
      .eq('context_type', 'GLOBAL')
      .eq('is_active', true);

    if (error) throw new PartyRoleError(`Failed to fetch vendors: ${error.message}`);
    return (data ?? []).map(r => r.party_id);
  }

  async getPartyIdsByRole(tenantId: string, roleType: PartyRoleType): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('party_roles')
      .select('party_id')
      .eq('tenant_id', tenantId)
      .eq('role_type', roleType)
      .eq('context_type', 'GLOBAL')
      .eq('is_active', true);

    if (error) throw new PartyRoleError(`Failed to fetch party IDs: ${error.message}`);
    return (data ?? []).map(r => r.party_id);
  }

  async getPartyIdsWithoutRole(tenantId: string, roleType: PartyRoleType): Promise<string[]> {
    const { data: partyRoles, error: roleError } = await this.supabase
      .from('party_roles')
      .select('party_id')
      .eq('tenant_id', tenantId)
      .eq('role_type', roleType)
      .eq('context_type', 'GLOBAL')
      .eq('is_active', true);

    if (roleError) throw new PartyRoleError(`Failed to fetch party roles: ${roleError.message}`);

    const rolePartyIds = new Set((partyRoles ?? []).map(r => r.party_id));

    const { data: entities, error: entityError } = await this.supabase
      .from('md_entities')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (entityError) throw new PartyRoleError(`Failed to fetch entities: ${entityError.message}`);

    return (entities ?? [])
      .map(e => e.id)
      .filter(id => !rolePartyIds.has(id));
  }
}
