# 117. PinnedEntity Runtime Model

The `PinnedEntity` class prevents raw strings (like `"budi-123"`) from leaking throughout the UI and Copilot engine.

## Properties
- **id**: The primary key from the execution system.
- **entityType**: The semantic type (e.g. `DRIVER`).
- **displayName**: Used heavily by Explainability and UI.
- **confidence**: Always `1.0` for manual pins, but supports future inference.
- **source**: Traceable origin of why it was pinned.
- **timestamp**: For TTL / cache invalidation.

## Explainability
`PinnedEntity` directly supports `.toExplainability()` to ensure that when it falls back as a missing entity in `EntityResolutionResult`, it describes itself correctly in logs.
