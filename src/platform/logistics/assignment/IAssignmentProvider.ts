import { Result } from '../../../shared/kernel/Result';
import { AssignmentAggregate } from './AssignmentAggregate';
export interface IAssignmentProvider<TEntity> {
  assign(resourceId: string, target: Readonly<TEntity>): Result<AssignmentAggregate<TEntity>>;
}
