# 136. Copilot Telemetry

The Copilot Intelligence Pipeline replaces standard `console.log` statements with a structured, production-grade telemetry recorder: `CopilotTelemetry`.

It captures standard events including:
- `INTENT_RESOLVED`
- `INTENT_UNKNOWN`
- `GEMINI_TIMEOUT`
- `FALLBACK_TRIGGERED`
- `PIPELINE_EXECUTION`
- `VALIDATION_FAILED`

By emitting structured JSON payloads instead of raw strings, it guarantees standard metric reporting without polluting the output stream.
