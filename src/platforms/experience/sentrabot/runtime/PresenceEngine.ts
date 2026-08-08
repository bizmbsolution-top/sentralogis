import { PresenceMode, AnimationState } from '../SentraBotState';
import { OperationalMood } from './OperationalMood';

export class PresenceEngine {
  static determinePresence(state: AnimationState, mood: OperationalMood): PresenceMode {
    
    // If system is offline or errored, it remains static
    if (state === AnimationState.OFFLINE || state === AnimationState.ERROR) {
      return PresenceMode.STATIC;
    }
    
    // Mood overrides
    if (mood === OperationalMood.CRITICAL && state === AnimationState.IDLE) {
      return PresenceMode.PULSING; // Alert state requires attention even if idle
    }

    switch (state) {
      case AnimationState.EXECUTING:
      case AnimationState.SEARCHING:
      case AnimationState.VALIDATING:
      case AnimationState.PLANNING:
        return PresenceMode.PULSING;
        
      case AnimationState.WAITING_CONFIRMATION:
      case AnimationState.SUCCESS:
      case AnimationState.WARNING:
        return PresenceMode.FLOATING;
        
      case AnimationState.IDLE:
      case AnimationState.LISTENING:
      case AnimationState.UNDERSTANDING:
      default:
        return PresenceMode.BREATHING;
    }
  }
}
