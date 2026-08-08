import { EntityCandidate } from '../EntityCandidate';
import { BaseSupabaseProvider } from './BaseSupabaseProvider';

export class VehicleLookupProvider extends BaseSupabaseProvider {
  supports(entityType: string): boolean {
    return entityType === 'VEHICLE';
  }

  protected get tableName(): string { return 'md_fleets'; }
  protected get entityType(): string { return 'VEHICLE'; }
  protected get searchColumns(): string[] { return ['id', 'plate_number']; }

  protected mapToCandidate(row: any, searchTerm: string): EntityCandidate {
    const display = row.plate_number || row.id;
    let confidenceScore = 0.5;
    let reason = 'fuzzy_match';

    const normalizedSearch = searchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedPlate = (row.plate_number || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    if (row.id === searchTerm) {
      confidenceScore = 1.0;
      reason = 'exact_match_id';
    } else if (normalizedPlate === normalizedSearch && normalizedSearch.length > 0) {
      confidenceScore = 0.95; // 0.95 for normalized match (e.g. B-1234-XYZ matching B1234XYZ)
      reason = 'normalized_match_plate';
    } else if (normalizedPlate.includes(normalizedSearch)) {
      confidenceScore = 0.8;
      reason = 'partial_match_plate';
    }

    // Exact string match check
    if (row.plate_number?.toLowerCase() === searchTerm.toLowerCase()) {
      confidenceScore = 1.0;
      reason = 'exact_match_plate';
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
