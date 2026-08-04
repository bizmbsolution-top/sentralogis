import { ISpecification } from '../specifications/ISpecification';

export interface SpecificationBuilder<T> {
  build(): ISpecification<T>;
}
