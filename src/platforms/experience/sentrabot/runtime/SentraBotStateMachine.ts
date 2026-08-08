import { AnimationState } from '../SentraBotState';

export class SentraBotStateMachine {
  
  private static readonly transitions: Record<AnimationState, AnimationState[]> = {
    [AnimationState.IDLE]: [AnimationState.LISTENING, AnimationState.OFFLINE],
    [AnimationState.LISTENING]: [AnimationState.UNDERSTANDING, AnimationState.IDLE],
    [AnimationState.UNDERSTANDING]: [AnimationState.SEARCHING, AnimationState.VALIDATING, AnimationState.PLANNING, AnimationState.ERROR],
    [AnimationState.SEARCHING]: [AnimationState.VALIDATING, AnimationState.PLANNING, AnimationState.ERROR],
    [AnimationState.VALIDATING]: [AnimationState.PLANNING, AnimationState.ERROR],
    [AnimationState.PLANNING]: [AnimationState.WAITING_CONFIRMATION, AnimationState.EXECUTING, AnimationState.ERROR],
    [AnimationState.WAITING_CONFIRMATION]: [AnimationState.EXECUTING, AnimationState.IDLE, AnimationState.ERROR],
    [AnimationState.EXECUTING]: [AnimationState.SUCCESS, AnimationState.ERROR],
    [AnimationState.SUCCESS]: [AnimationState.IDLE],
    [AnimationState.WARNING]: [AnimationState.IDLE, AnimationState.WAITING_CONFIRMATION],
    [AnimationState.ERROR]: [AnimationState.IDLE],
    [AnimationState.OFFLINE]: [AnimationState.IDLE]
  };

  static canTransition(from: AnimationState, to: AnimationState): boolean {
    if (from === to) return true;
    const allowed = this.transitions[from];
    return allowed ? allowed.includes(to) : false;
  }
}
