import { CompositeSpecification } from './CompositeSpecification';
import { ISpecification } from './ISpecification';

export class NotSpecification<T> extends CompositeSpecification<T> {
  constructor(private spec: ISpecification<T>) { super(); }
  
  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate);
  }
}
