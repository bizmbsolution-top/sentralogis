import { Sort } from './Sort';

export interface PageRequest {
  page: number;
  size: number;
  sort?: Sort[];
}
