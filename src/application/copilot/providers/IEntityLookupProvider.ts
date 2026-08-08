import { EntityCandidate } from '../EntityCandidate';

export interface IEntityLookupProvider {
  /**
   * Returns true if this provider knows how to lookup this entity type.
   */
  supports(entityType: string): boolean;

  /**
   * Looks up the entity matching the search term within the tenant's boundaries.
   * May return fuzzy matches. Must return valid Confidence Scores.
   */
  lookup(searchTerm: string, tenantId: string): Promise<EntityCandidate[]>;
}
