import { AnimationState } from '../SentraBotState';
import { SpeechState } from './SpeechState';

export class SpeechEngine {
  static deriveSpeechState(state: AnimationState, voiceEnabled: boolean): SpeechState {
    if (!voiceEnabled) return SpeechState.NOT_SPEAKING;

    switch (state) {
      case AnimationState.LISTENING:
        return SpeechState.LISTENING;
      case AnimationState.UNDERSTANDING:
      case AnimationState.SEARCHING:
      case AnimationState.PLANNING:
      case AnimationState.VALIDATING:
        return SpeechState.THINKING;
      case AnimationState.WAITING_CONFIRMATION:
      case AnimationState.EXECUTING:
      case AnimationState.SUCCESS:
      case AnimationState.WARNING:
      case AnimationState.ERROR:
        return SpeechState.RESPONDING;
      default:
        return SpeechState.NOT_SPEAKING;
    }
  }
}
