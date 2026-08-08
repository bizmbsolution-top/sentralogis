# 138. Telemetry Provider Architecture

The Copilot Intelligence Pipeline abstracts all event logging behind the `TelemetryProvider` interface.

This allows us to seamlessly swap where our structured JSON metrics are sent without altering the core pipeline logic.

## Available Providers:
1. **`MemoryTelemetryProvider`**: Stores events in-memory. Ideal for unit tests and local development.
2. **`SupabaseTelemetryProvider`**: Shell implementation for persisting telemetry directly into our Supabase operational database (`copilot_telemetry` table).
3. **`OpenTelemetryProvider`**: Shell implementation for forwarding standard OTLP metrics to external observability platforms like DataDog or NewRelic.

To switch providers at runtime:
```typescript
CopilotTelemetry.setProvider(new SupabaseTelemetryProvider());
```
