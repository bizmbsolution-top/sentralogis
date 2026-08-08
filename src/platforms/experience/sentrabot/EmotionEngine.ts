import { Emotion, AnimationState } from './SentraBotState';

export class EmotionEngine {
  /**
   * Derives the appropriate Emotion based on operational risk, confidence, and current state.
   */
  static deriveEmotion(
    state: AnimationState, 
    confidence: number = 1.0, 
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
  ): Emotion {
    
    if (state === AnimationState.ERROR) {
      return Emotion.APOLOGETIC;
    }
    
    if (state === AnimationState.SUCCESS) {
      return Emotion.SATISFIED;
    }
    
    if (state === AnimationState.WARNING || riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      return Emotion.CONCERNED;
    }
    
    if (state === AnimationState.UNDERSTANDING || state === AnimationState.PLANNING) {
      if (confidence < 0.7) {
        return Emotion.THOUGHTFUL;
      }
      return Emotion.CONFIDENT;
    }

    if (state === AnimationState.EXECUTING) {
      return Emotion.CONFIDENT;
    }
    
    return Emotion.NEUTRAL;
  }
}
