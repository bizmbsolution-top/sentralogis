import { Variants } from 'framer-motion';

export class AnimationController {
  
  static getPresenceVariants(reducedMotion: boolean): Variants {
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
        scale: [1, 1.02, 1],
        transition: { repeat: Infinity, duration: 4, ease: "easeInOut" }
      },
      FLOATING: {
        y: [0, -6, 0],
        transition: { repeat: Infinity, duration: 3, ease: "easeInOut" }
      },
      PULSING: {
        scale: [1, 1.1, 1],
        boxShadow: [
          "0px 0px 0px 0px rgba(0,0,0,0.2)",
          "0px 0px 15px 5px rgba(0,0,0,0.1)",
          "0px 0px 0px 0px rgba(0,0,0,0.2)"
        ],
        transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
      }
    };
  }

  static getCoreAvatarVariants(): Variants {
    return {
      IDLE: { rotate: 0 },
      SEARCHING: { rotate: 360, transition: { repeat: Infinity, duration: 2, ease: "linear" } },
      VALIDATING: { scale: [1, 0.9, 1.1, 1], transition: { duration: 0.5 } },
      SUCCESS: { scale: [1, 1.2, 1], transition: { duration: 0.5, ease: "easeOut" } },
      ERROR: { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } },
      EXECUTING: { rotate: [0, 90, 180, 270, 360], transition: { repeat: Infinity, duration: 1, ease: "circInOut" } }
    };
  }
}
