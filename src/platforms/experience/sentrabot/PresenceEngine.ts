import { PresenceMode, AnimationState } from './SentraBotState';

export class PresenceEngine {
  /**
   * Determines how the avatar should physically behave in the environment.
   */
  static determinePresence(state: AnimationState): PresenceMode {
    switch (state) {
      case AnimationState.OFFLINE:
      case AnimationState.ERROR:
        return PresenceMode.STATIC;
        
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
