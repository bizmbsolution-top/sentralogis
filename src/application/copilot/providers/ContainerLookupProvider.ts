import { EntityCandidate } from '../EntityCandidate';
import { BaseSupabaseProvider } from './BaseSupabaseProvider';

export class ContainerLookupProvider extends BaseSupabaseProvider {
  supports(entityType: string): boolean {
    return entityType === 'CONTAINER';
  }

  protected get tableName(): string { return 'job_orders'; } // Currently stored in job_orders
  protected get entityType(): string { return 'CONTAINER'; }
  protected get searchColumns(): string[] { return ['id', 'container_number']; }

  protected mapToCandidate(row: any, searchTerm: string): EntityCandidate {
    const display = row.container_number || row.id;
    let confidenceScore = 0.5;
    let reason = 'fuzzy_match';

    const normalizedSearch = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedContainer = (row.container_number || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    if (row.id === searchTerm) {
      confidenceScore = 1.0;
      reason = 'exact_match_id';
    } else if (normalizedContainer === normalizedSearch && normalizedSearch.length > 0) {
      confidenceScore = 0.95;
      reason = 'normalized_match_container';
    } else if (normalizedContainer.includes(normalizedSearch)) {
      confidenceScore = 0.8;
      reason = 'partial_match_container';
    }

    if (row.container_number?.toLowerCase() === searchTerm.toLowerCase()) {
      confidenceScore = 1.0;
      reason = 'exact_match_container';
    }

    return {
      id: row.id,
      display,
      type: this.entityType,
      confidenceScore,
      tenantId: row.tenant_id,
      metadata: { reason }
    };
  }
}
