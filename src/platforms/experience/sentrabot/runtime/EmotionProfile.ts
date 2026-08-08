import { Emotion } from '../SentraBotState';

export interface EmotionProfile {
  emotion: Emotion;
  color: string;
  eyeIntensity: number; // For future voice/eye integration
  glowIntensity: number; // Opacity of the box-shadow
  pulseSpeed: number; // Multiplier for animation speed
  blinkInterval: number; // ms
  breathingSpeed: number; // seconds per cycle
  speechSpeed: number; // multiplier for audio/lip-sync
  transitionDuration: number; // seconds
}

export const EmotionProfiles: Record<Emotion, EmotionProfile> = {
  [Emotion.NEUTRAL]: {
    emotion: Emotion.NEUTRAL,
    color: '#0f172a',
    eyeIntensity: 0.5,
    glowIntensity: 0.1,
    pulseSpeed: 1.0,
    blinkInterval: 4000,
    breathingSpeed: 4.0,
    speechSpeed: 1.0,
    transitionDuration: 0.8
  },
  [Emotion.THOUGHTFUL]: {
    emotion: Emotion.THOUGHTFUL,
    color: '#06b6d4',
    eyeIntensity: 0.7,
    glowIntensity: 0.3,
    pulseSpeed: 1.2,
    blinkInterval: 6000, // Less blinking when thinking
    breathingSpeed: 3.5,
    speechSpeed: 0.9,
    transitionDuration: 1.0
  },
  [Emotion.CONFIDENT]: {
    emotion: Emotion.CONFIDENT,
    color: '#4f46e5',
    eyeIntensity: 0.9,
    glowIntensity: 0.4,
    pulseSpeed: 1.5,
    blinkInterval: 3000,
    breathingSpeed: 3.0,
    speechSpeed: 1.1,
    transitionDuration: 0.5
  },
  [Emotion.CONCERNED]: {
    emotion: Emotion.CONCERNED,
    color: '#f59e0b',
    eyeIntensity: 0.8,
    glowIntensity: 0.5,
    pulseSpeed: 1.1,
    blinkInterval: 2000,
    breathingSpeed: 2.5,
    speechSpeed: 0.95,
    transitionDuration: 0.6
  },
  [Emotion.SATISFIED]: {
    emotion: Emotion.SATISFIED,
    color: '#10b981',
    eyeIntensity: 0.6,
    glowIntensity: 0.3,
    pulseSpeed: 1.0,
    blinkInterval: 3500,
    breathingSpeed: 4.5,
    speechSpeed: 1.0,
    transitionDuration: 1.2
  },
  [Emotion.APOLOGETIC]: {
    emotion: Emotion.APOLOGETIC,
    color: '#e11d48',
    eyeIntensity: 0.4,
    glowIntensity: 0.2,
    pulseSpeed: 0.8,
    blinkInterval: 5000,
    breathingSpeed: 5.0,
    speechSpeed: 0.85,
    transitionDuration: 1.5
  }
};
