import { Variants } from 'framer-motion';
import { EmotionProfile } from './EmotionProfile';
import { PresenceMode } from '../SentraBotState';

export class AnimationResolver {
  
  static getPresenceVariants(profile: EmotionProfile, reducedMotion: boolean): Variants {
    if (reducedMotion) {
      return {
        STATIC: { y: 0, scale: 1 },
        BREATHING: { y: 0, scale: 1 },
        FLOATING: { y: 0, scale: 1 },
        PULSING: { y: 0, scale: 1 },
      };
    }

    return {
      STATIC: { y: 0, scale: 1 },
      BREATHING: { 
        scale: [1, 1.02 * profile.pulseSpeed, 1],
        transition: { repeat: Infinity, duration: profile.breathingSpeed, ease: "easeInOut" }
      },
      FLOATING: {
        y: [0, -6 * profile.pulseSpeed, 0],
        transition: { repeat: Infinity, duration: profile.breathingSpeed * 0.8, ease: "easeInOut" }
      },
      PULSING: {
        scale: [1, 1.1 * profile.pulseSpeed, 1],
        boxShadow: [
          `0px 0px 0px 0px ${profile.color}00`,
          `0px 0px 15px 5px ${profile.color}${Math.floor(profile.glowIntensity * 255).toString(16).padStart(2, '0')}`,
          `0px 0px 0px 0px ${profile.color}00`
        ],
        transition: { repeat: Infinity, duration: profile.breathingSpeed * 0.4, ease: "easeInOut" }
      }
    };
  }

  static getCoreAvatarVariants(): Variants {
    return {
      IDLE: { rotate: 0 },
      SEARCHING: { rotate: 360, transition: { repeat: Infinity, duration: 2, ease: "linear" } },
      VALIDATING: { scale: [1, 0.9, 1.1, 1], transition: { duration: 0.5 } },
      PLANNING: { rotate: -360, transition: { repeat: Infinity, duration: 2.5, ease: "linear" } },
      WAITING_CONFIRMATION: { rotate: 0, scale: 1.05, transition: { duration: 0.3 } },
      SUCCESS: { scale: [1, 1.2, 1], transition: { duration: 0.5, ease: "easeOut" } },
      ERROR: { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } },
      EXECUTING: { rotate: [0, 90, 180, 270, 360], transition: { repeat: Infinity, duration: 1, ease: "circInOut" } },
      WARNING: { rotate: [0, -10, 10, -10, 10, 0], transition: { duration: 0.5 } }
    };
  }
}
