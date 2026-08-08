# 127. Pipeline Runtime Execution

The Pipeline Runtime guarantees graceful degradation and standard metric reporting.

## Halt Conditions
A pipeline will cease execution early if a stage returns a status other than `CONTINUE`:

- **`REQUIRES_CLARIFICATION`**: Intent or context is ambiguous.
- **`BLOCKED`**: Hard business rule violation (e.g. missing permissions, invalid entities).
- **`TERMINATED`**: Internal catastrophic logic failure.

If a stage halts execution, it must populate `context.finalResponse` before exiting, ensuring the user always receives a deterministically constructed message.
