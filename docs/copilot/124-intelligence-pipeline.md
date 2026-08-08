# 124. Intelligence Pipeline

The Sentralogis Copilot Intelligence Pipeline replaces the monolithic `CopilotEngine` with a fully deterministic, stage-based execution flow.

## Why a Pipeline?
Previously, the `CopilotEngine` manually orchestrated intent resolution, validation, and planning via a procedural script. While functional for a single interface (like the chat UI), it made it difficult to introduce entirely new frontends (like WhatsApp or OCR) without duplicating execution logic or risking skipped steps.

The Pipeline guarantees that *every* input, regardless of source, is subjected to the exact same sequence of validations, entity extractions, and explainability reporting.
