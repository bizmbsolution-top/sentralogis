import { AnimationState } from './SentraBotState';

export class ConversationState {
  
  static mapLifecycleToState(
    isProcessing: boolean, 
    hasError: boolean, 
    isWaitingConfirmation: boolean, 
    isExecuting: boolean
  ): AnimationState {
    
    if (hasError) return AnimationState.ERROR;
    if (isExecuting) return AnimationState.EXECUTING;
    if (isWaitingConfirmation) return AnimationState.WAITING_CONFIRMATION;
    if (isProcessing) return AnimationState.PLANNING; // Simplified for now
    
    return AnimationState.IDLE;
  }
}
