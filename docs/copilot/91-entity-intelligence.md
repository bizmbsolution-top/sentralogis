# 91. Entity Intelligence Framework

The `Entity Intelligence Framework` manages the extraction and validation of operational entities from natural language text.

## Core Principles
- **Read-Only**: Extractors read from text and query repositories, but never mutate data.
- **Explainability**: Every extracted entity explicitly defines its confidence score, source, and match method.
- **Configuration-Driven**: Extractor logic is modularized by entity type (Driver, Vehicle, JobOrder, etc.) and orchestrated centrally by the `EntityExtractionEngine`.

By wrapping each extraction attempt in an `EntityResolutionResult`, the Copilot naturally supports disambiguation and unknown entity handling natively.
