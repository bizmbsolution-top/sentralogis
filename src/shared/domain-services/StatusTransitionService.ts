export interface TransitionContext {
  userId: string;
  tenantId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export abstract class StatusTransitionService<TState extends string> {
  abstract canTransition(currentState: TState, nextState: TState, context: TransitionContext): boolean;
  abstract validateTransition(currentState: TState, nextState: TState, context: TransitionContext): void;
  abstract getNextStates(currentState: TState, context: TransitionContext): TState[];
}
