import { SupabaseClient } from '@supabase/supabase-js';
import { EntityCandidate } from '../EntityCandidate';
import { IEntityLookupProvider } from './IEntityLookupProvider';

export abstract class BaseSupabaseProvider implements IEntityLookupProvider {
  constructor(protected readonly supabase: SupabaseClient) {}

  abstract supports(entityType: string): boolean;
  
  protected abstract get tableName(): string;
  protected abstract get entityType(): string;
  protected abstract get searchColumns(): string[];

  public async lookup(searchTerm: string, tenantId: string): Promise<EntityCandidate[]> {
    if (!searchTerm || searchTerm.trim() === '') return [];

    const isUuid = searchTerm.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    let query = this.supabase.from(this.tableName).select('*, tenant_id').eq('tenant_id', tenantId);

    if (isUuid) {
      query = query.eq('id', searchTerm);
    } else {
      const orConditions = this.searchColumns
        .filter(col => col !== 'id' && col !== 'tenant_id')
        .map(col => `${col}.ilike.%${searchTerm}%`)
        .join(',');
      
      if (orConditions) {
        query = query.or(orConditions);
      }
    }

    try {
      const { data, error } = await query.limit(10);
      if (error) {
        console.error(`[${this.constructor.name}] Error searching ${this.tableName}:`, error);
        return [];
      }
      if (!data) return [];
      
      return data.map(row => this.mapToCandidate(row, searchTerm));
    } catch (e) {
      console.error(`[${this.constructor.name}] Lookup exception:`, e);
      return [];
    }
  }

  protected abstract mapToCandidate(row: any, searchTerm: string): EntityCandidate;
}
