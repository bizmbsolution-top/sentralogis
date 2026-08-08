# 51. Operational Memory

The Copilot is not a stateless chatbot. It acts like a dispatcher who remembers the context of the current shift.

## Memory Scoping
Operational Memory is strictly scoped per authenticated `userId`.
There is no cross-tenant memory leakage.

## Inference
If a user says "Mark departed" after previously interacting with `JO-991`, the `ContextResolver` automatically injects `JO-991` into the intent before validation. The user is NOT required to repeat the Job Order number.
