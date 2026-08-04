import { AggregateRoot } from '../../../shared/kernel/AggregateRoot';
import { Result } from '../../../shared/kernel/Result';
import { StatusTransition } from './StatusTransition';
import { TransitionHistory } from './TransitionHistory';
import { IStateMachine } from './IStateMachine';

export interface StateMachineProps<TStatus extends string> extends Record<string, unknown> { readonly entityType: string; readonly currentState: TStatus; readonly transitions: ReadonlyArray<StatusTransition<TStatus>>; }
export class StateMachineEngine<TStatus extends string, TEntity> extends AggregateRoot<StateMachineProps<TStatus>> implements IStateMachine<TStatus, TEntity> {
  private constructor(props: StateMachineProps<TStatus>, id: string, tenantId: string) { super(props, id, tenantId); }
  public static create<TStatus extends string, TEntity>(props: StateMachineProps<TStatus>, id: string, tenantId: string): Result<StateMachineEngine<TStatus, TEntity>> { return Result.ok(new StateMachineEngine<TStatus, TEntity>(props, id, tenantId)); }
  public static restore<TStatus extends string, TEntity>(props: StateMachineProps<TStatus>, id: string, tenantId: string): StateMachineEngine<TStatus, TEntity> { return new StateMachineEngine<TStatus, TEntity>(props, id, tenantId); }
  public get currentState(): TStatus { return this.props.currentState; }
  public get availableTransitions(): ReadonlyArray<StatusTransition<TStatus>> { return this.props.transitions; }
  public transition(entity: Readonly<TEntity>, event: string): Result<TStatus> { return Result.ok<TStatus>(this.props.currentState); }
  public getHistory(entityId: string): ReadonlyArray<TransitionHistory<TStatus>> { return []; }
}
