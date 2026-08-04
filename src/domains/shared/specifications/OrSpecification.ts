import { CompositeSpecification } from './CompositeSpecification';
import { ISpecification } from './ISpecification';

export class OrSpecification<T> extends CompositeSpecification<T> {
  constructor(private left: ISpecification<T>, private right: ISpecification<T>) { super(); }
  
  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}
