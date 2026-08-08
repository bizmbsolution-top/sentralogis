import { EntityCandidate } from '../EntityCandidate';
import { BaseSupabaseProvider } from './BaseSupabaseProvider';

export class JobOrderLookupProvider extends BaseSupabaseProvider {
  supports(entityType: string): boolean {
    return entityType === 'JOB_ORDER';
  }

  protected get tableName(): string { return 'job_orders'; }
  protected get entityType(): string { return 'JOB_ORDER'; }
  protected get searchColumns(): string[] { return ['id', 'jo_number', 'tracking_token', 'driver_link_token', 'wa_token']; }

  protected mapToCandidate(row: any, searchTerm: string): EntityCandidate {
    const display = row.jo_number || row.id;
    let confidenceScore = 0.5;
    let reason = 'fuzzy_match';

    const normalizedSearch = searchTerm.toLowerCase();

    if (row.id === searchTerm) {
      confidenceScore = 1.0;
      reason = 'exact_match_id';
    } else if (row.jo_number?.toLowerCase() === normalizedSearch) {
      confidenceScore = 1.0;
      reason = 'exact_match_jo_number';
    } else if (
      row.tracking_token === searchTerm ||
      row.driver_link_token === searchTerm ||
      row.wa_token === searchTerm
    ) {
      confidenceScore = 1.0;
      reason = 'exact_match_token';
    } else if (row.jo_number?.toLowerCase().includes(normalizedSearch)) {
      confidenceScore = 0.8;
      reason = 'partial_match_jo_number';
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
