import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ExternalReference,
  CreateExternalReferenceDTO,
  ExternalReferenceEntityType,
  ExternalReferenceSystem,
} from './types';
import {
  EXTERNAL_REFERENCE_ENTITY_TYPES,
  EXTERNAL_REFERENCE_SYSTEMS,
} from './types';

export class ExternalReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExternalReferenceError';
  }
}

export class ExternalReferenceService {
  constructor(private readonly supabase: SupabaseClient) {}

  async createReference(tenantId: string, dto: CreateExternalReferenceDTO): Promise<ExternalReference> {
    const errors: string[] = [];
    if (!dto.entity_type) errors.push('entity_type is required');
    if (!EXTERNAL_REFERENCE_ENTITY_TYPES.includes(dto.entity_type)) {
      errors.push(`entity_type must be one of: ${EXTERNAL_REFERENCE_ENTITY_TYPES.join(', ')}`);
    }
    if (!dto.entity_id) errors.push('entity_id is required');
    if (!dto.external_system) errors.push('external_system is required');
    if (!EXTERNAL_REFERENCE_SYSTEMS.includes(dto.external_system)) {
      errors.push(`external_system must be one of: ${EXTERNAL_REFERENCE_SYSTEMS.join(', ')}`);
    }
    if (!dto.external_id) errors.push('external_id is required');
    if (errors.length > 0) throw new ExternalReferenceError(errors.join('; '));

    const { data, error } = await this.supabase
      .from('external_references')
      .insert({
        tenant_id: tenantId,
        entity_type: dto.entity_type,
        entity_id: dto.entity_id,
        external_system: dto.external_system,
        external_id: dto.external_id,
        external_context: dto.external_context ?? {},
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ExternalReferenceError('External reference already exists for this entity and system');
      }
      throw new ExternalReferenceError(`Failed to create external reference: ${error.message}`);
    }
    return data as ExternalReference;
  }

  async getReferencesByEntity(
    tenantId: string,
    entityType: ExternalReferenceEntityType,
    entityId: string
  ): Promise<ExternalReference[]> {
    const { data, error } = await this.supabase
      .from('external_references')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('is_active', true);

    if (error) throw new ExternalReferenceError(`Failed to fetch external references: ${error.message}`);
    return (data ?? []) as ExternalReference[];
  }

  async findByExternalId(
    tenantId: string,
    externalSystem: ExternalReferenceSystem,
    externalId: string
  ): Promise<ExternalReference[]> {
    const { data, error } = await this.supabase
      .from('external_references')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('external_system', externalSystem)
      .eq('external_id', externalId)
      .eq('is_active', true);

    if (error) throw new ExternalReferenceError(`Failed to find external reference: ${error.message}`);
    return (data ?? []) as ExternalReference[];
  }
}
