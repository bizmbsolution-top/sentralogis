# 50. Runtime State Machine

`SentraBotStateMachine.ts` prevents the AI from entering impossible visual states.

## Constraints
SentraBot cannot go from `IDLE` straight to `SUCCESS`. It must follow the logical flow:
`IDLE` -> `LISTENING` -> `UNDERSTANDING` -> `PLANNING` -> `WAITING_CONFIRMATION` -> `EXECUTING` -> `SUCCESS` -> `IDLE`

If a rogue component dispatches an illegal event (e.g. `UserIdle` while in the middle of `EXECUTING`), the state machine catches it, blocks the transition, and logs a warning. This ensures the visual avatar never stutters or displays contradictory information.
