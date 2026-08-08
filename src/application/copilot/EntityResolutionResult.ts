import { EntityCandidate } from './EntityCandidate';

export type ResolutionStatus = 'RESOLVED' | 'AMBIGUOUS' | 'NOT_FOUND' | 'PERMISSION_DENIED' | 'LOOKUP_FAILURE';

export interface EntityResolutionResult {
  status: ResolutionStatus;
  candidates: EntityCandidate[];
  resolvedEntity?: EntityCandidate; // Only populated if status === 'RESOLVED'
  originalValue: string;
  entityType: string;
}
