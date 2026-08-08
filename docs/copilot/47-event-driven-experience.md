# 47. Event-Driven Experience

SentraBot does not expose setters. You cannot tell it to "look thoughtful". You must tell it what is happening operationally, and it decides how to react.

## Event Bus
`ExperienceEvents.ts` defines the immutable events SentraBot can listen to, for example:
- `IntentCaptured`
- `ValidationStarted`
- `ExecutionSucceeded`

React components (like `CopilotPage`) dispatch these events via `bot.dispatch({ type: 'ValidationStarted' })`. The runtime intercepts this, checks the `SentraBotStateMachine`, and transitions to `VALIDATING` if legal.
