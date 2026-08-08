import { OperationalTerm } from './OperationalVocabulary';

export interface OperationalSituation {
  id: string;
  name: string;
  description: string;
  possibleCauses: string[];
  recommendedActions: string[];
  relatedTerms: OperationalTerm[];
}
