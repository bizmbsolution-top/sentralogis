# 46. SentraBot Experience Runtime

## Purpose
The Experience Runtime ensures that SentraBot's visual presence, emotional state, and physical behaviors are always synchronized and fully decoupled from React's rendering lifecycle.

## Core Component
`SentraBotRuntime.ts` is the single source of truth. It subscribes to operational events (via `RuntimeEventBus`) and derives:
1. `AnimationState`
2. `Emotion`
3. `PresenceMode`
4. `SpeechState`
5. `OperationalContext`

React components use `bot.getSnapshot()` to render their current frame, ensuring no business or state logic bleeds into the UI.
