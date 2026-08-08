# 66. Job Health

The `JobHealthEngine.ts` calculates health deterministically.

## Health Levels
- **HEALTHY**: `NOMINAL` operations.
- **ATTENTION**: `MISSING_POD` (administrative lag).
- **DELAYED**: `WAITING_UNLOADING` (detention time accumulating).
- **CRITICAL**: `LATE_DEPARTURE` (immediate threat to overall schedule).

These drive the visual color coding of the SentraBot UI cards.
