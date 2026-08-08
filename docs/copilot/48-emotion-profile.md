# 48. Emotion Profile

`EmotionProfile.ts` defines the specific visual parameters for a given state.

## Configuration
Rather than hardcoding colors into React components, the `EmotionEngine` maps the current state and confidence to an `EmotionProfile` which contains:
- `color`: The HEX color of the glow.
- `glowIntensity`: How bright the AI core burns.
- `pulseSpeed`: A multiplier applied to Framer Motion to speed up or slow down breathing.
- `blinkInterval`: Prepared for future eye-tracking/blinking.
- `speechSpeed`: Prepared for future audio lip-sync.
