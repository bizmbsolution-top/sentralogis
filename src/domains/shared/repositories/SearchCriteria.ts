import { Filter } from './Filter';
import { PageRequest } from './PageRequest';

export interface SearchCriteria {
  filters: Filter[];
  pageRequest?: PageRequest;
}
