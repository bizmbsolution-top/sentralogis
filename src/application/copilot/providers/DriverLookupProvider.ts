import { EntityCandidate } from '../EntityCandidate';
import { BaseSupabaseProvider } from './BaseSupabaseProvider';

export class DriverLookupProvider extends BaseSupabaseProvider {
  supports(entityType: string): boolean {
    return entityType === 'DRIVER';
  }

  protected get tableName(): string { return 'md_drivers'; }
  protected get entityType(): string { return 'DRIVER'; }
  protected get searchColumns(): string[] { return ['id', 'name', 'phone']; }

  protected mapToCandidate(row: any, searchTerm: string): EntityCandidate {
    const display = row.name || row.phone || row.id;
    let confidenceScore = 0.5;
    let reason = 'fuzzy_match';

    const normalizedSearch = searchTerm.toLowerCase();

    if (row.id === searchTerm) {
      confidenceScore = 1.0;
      reason = 'exact_match_id';
    } else if (row.name?.toLowerCase() === normalizedSearch) {
      confidenceScore = 1.0;
      reason = 'exact_match_name';
    } else if (row.phone === searchTerm) {
      confidenceScore = 1.0;
      reason = 'exact_match_phone';
    } else if (row.name?.toLowerCase().includes(normalizedSearch)) {
      confidenceScore = 0.8;
      reason = 'partial_match_name';
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
