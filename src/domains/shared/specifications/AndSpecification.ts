import { CompositeSpecification } from './CompositeSpecification';
import { ISpecification } from './ISpecification';

export class AndSpecification<T> extends CompositeSpecification<T> {
  constructor(private left: ISpecification<T>, private right: ISpecification<T>) { super(); }
  
  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}
