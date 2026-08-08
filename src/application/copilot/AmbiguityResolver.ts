import { EntityCandidate } from './EntityCandidate';
import { EntityResolutionResult, ResolutionStatus } from './EntityResolutionResult';

export class AmbiguityResolver {
  public resolve(
    candidates: EntityCandidate[],
    originalValue: string,
    entityType: string,
    tenantId: string
  ): EntityResolutionResult {
    if (!candidates || candidates.length === 0) {
      return {
        status: 'NOT_FOUND',
        candidates: [],
        originalValue,
        entityType
      };
    }

    // Filter by tenantId strictly
    const tenantCandidates = candidates.filter(c => c.tenantId === tenantId);

    if (tenantCandidates.length === 0) {
      // If there were candidates but none matched the tenant, it's a security/tenant mismatch
      return {
        status: 'PERMISSION_DENIED',
        candidates: [],
        originalValue,
        entityType
      };
    }

    if (tenantCandidates.length === 1) {
      return {
        status: 'RESOLVED',
        candidates: tenantCandidates,
        resolvedEntity: tenantCandidates[0],
        originalValue,
        entityType
      };
    }

    // Sort candidates by confidence score descending
    tenantCandidates.sort((a, b) => b.confidenceScore - a.confidenceScore);

    const highestScore = tenantCandidates[0].confidenceScore;
    const topCandidates = tenantCandidates.filter(c => c.confidenceScore === highestScore);

    if (topCandidates.length === 1) {
      return {
        status: 'RESOLVED',
        candidates: tenantCandidates,
        resolvedEntity: topCandidates[0],
        originalValue,
        entityType
      };
    }

    // Still ambiguous (multiple exact matches or multiple soft matches tied for top score)
    return {
      status: 'AMBIGUOUS',
      candidates: tenantCandidates,
      originalValue,
      entityType
    };
  }
}
