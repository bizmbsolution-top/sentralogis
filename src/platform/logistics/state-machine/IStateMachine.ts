import { Result } from '../../../shared/kernel/Result';
import { StatusTransition } from './StatusTransition';
import { TransitionHistory } from './TransitionHistory';

export interface IStateMachine<TStatus extends string, TEntity> {
  transition(entity: Readonly<TEntity>, event: string): Result<TStatus>;
  getHistory(entityId: string): ReadonlyArray<TransitionHistory<TStatus>>;
  readonly currentState: TStatus;
  readonly availableTransitions: ReadonlyArray<StatusTransition<TStatus>>;
}
