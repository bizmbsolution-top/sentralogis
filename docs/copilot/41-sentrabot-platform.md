# 41. SentraBot Experience Platform

## Objective
SentraBot is the visual and emotional representation of the Sentralogis Copilot intelligence. It is designed to foster operator trust by being transparent about its internal state (Thinking, Searching, Waiting, Executing).

## Core Principles
1. **Never Humanoid**: SentraBot is a digital logistics assistant. It is represented by a stylized, animated Sentralogis "S" enveloped in a glowing sphere.
2. **Professionalism**: It does not use informal chat syntax ("I guess"). It uses declarative, operational syntax ("I verified", "I found").
3. **Ambient Presence**: It uses subtle `framer-motion` animations to always appear alive (breathing, pulsing) without distracting the user.

## Architecture
The platform lives in `src/platforms/experience/sentrabot/`.
It contains no business logic. It relies entirely on reacting to the Copilot's `ExecutionPlan` and state variables passed from the orchestration layer.
