# 44. Presence Engine

The `PresenceEngine` ensures SentraBot does not feel like a static JPEG.

## Modes
1. **`STATIC`**: Used only when Offline or when the user prefers Reduced Motion.
2. **`BREATHING`**: A very slow (4s) 1.02x scale pulse during `IDLE` or `LISTENING`.
3. **`FLOATING`**: A gentle Y-axis translation during `WAITING_CONFIRMATION` (representing hovering, waiting for input).
4. **`PULSING`**: A rapid scale and `boxShadow` burst during `EXECUTING` or `SEARCHING`.

## Accessibility
The `SentraBotConfig` supports a `reducedMotion: boolean` flag which instantly forces all `PresenceEngine` outputs to return `STATIC`.
