import { AnimationState, Emotion, PresenceMode } from './SentraBotState';
import { EmotionEngine } from './EmotionEngine';
import { PresenceEngine } from './PresenceEngine';

export interface AvatarContext {
  state: AnimationState;
  emotion: Emotion;
  presence: PresenceMode;
  color: string;
}

export class AvatarEngine {
  
  static getContext(
    state: AnimationState,
    confidence: number = 1.0,
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW'
  ): AvatarContext {
    
    const emotion = EmotionEngine.deriveEmotion(state, confidence, riskLevel);
    const presence = PresenceEngine.determinePresence(state);
    const color = this.deriveColor(emotion);

    return {
      state,
      emotion,
      presence,
      color
    };
  }

  private static deriveColor(emotion: Emotion): string {
    switch (emotion) {
      case Emotion.CONFIDENT: return '#4f46e5'; // Indigo-600
      case Emotion.SATISFIED: return '#10b981'; // Emerald-500
      case Emotion.CONCERNED: return '#f59e0b'; // Amber-500
      case Emotion.APOLOGETIC: return '#e11d48'; // Rose-600
      case Emotion.THOUGHTFUL: return '#06b6d4'; // Cyan-500
      case Emotion.NEUTRAL:
      default: return '#0f172a'; // Slate-900
    }
  }
}
