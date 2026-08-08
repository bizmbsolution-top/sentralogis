# 42. Avatar State Machine

The SentraBot Avatar operates on a deterministic state machine managed by `AvatarEngine.ts`.

## States
- `IDLE`: Resting state.
- `SEARCHING` / `PLANNING`: The Copilot is querying databases or forming an `ExecutionPlan`. The avatar spins/pulses rapidly.
- `WAITING_CONFIRMATION`: The Copilot has rendered an `ActionProposalCard`. It stops pulsing and gently floats, waiting for the human.
- `EXECUTING`: The user clicked confirm. The avatar spins aggressively as the Application Service is invoked.
- `SUCCESS` / `ERROR`: The post-execution result.

## Implementation
Controlled via `AnimationController.ts` which provides declarative variants to `framer-motion`.
