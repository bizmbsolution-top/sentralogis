import { EntityCandidate } from '../EntityCandidate';
import { BaseSupabaseProvider } from './BaseSupabaseProvider';

export class WorkOrderLookupProvider extends BaseSupabaseProvider {
  supports(entityType: string): boolean {
    return entityType === 'WORK_ORDER';
  }

  protected get tableName(): string { return 'work_orders'; }
  protected get entityType(): string { return 'WORK_ORDER'; }
  protected get searchColumns(): string[] { return ['id', 'wo_number']; }

  protected mapToCandidate(row: any, searchTerm: string): EntityCandidate {
    const display = row.wo_number || row.id;
    let confidenceScore = 0.5;
    let reason = 'fuzzy_match';

    const normalizedSearch = searchTerm.toLowerCase();

    if (row.id === searchTerm) {
      confidenceScore = 1.0;
      reason = 'exact_match_id';
    } else if (row.wo_number?.toLowerCase() === normalizedSearch) {
      confidenceScore = 1.0;
      reason = 'exact_match_wo_number';
    } else if (row.wo_number?.toLowerCase().includes(normalizedSearch)) {
      confidenceScore = 0.8;
      reason = 'partial_match_wo_number';
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
