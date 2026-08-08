# 140. Owner Dashboard Metrics

The raw JSON events collected by the `TelemetryProvider` are computationally aggregated by the `CopilotOperationalMetrics` engine into high-level dashboard models.

## Tracked Models
- **`IntentAccuracyMetrics`**: Tracks LLM resolution success vs unknown rates, and tracks the average confidence score across all resolutions.
- **`PipelinePerformanceMetrics`**: Tracks the average latency of the full pipeline, breaking out Gemini's time and Validation time, while monitoring the total % of requests that triggered a safety fallback.
- **`IntentFrequency`**: Identifies the most commonly used intents to prioritize future Copilot automation capabilities.
