# Sentralogis Copilot Observability

## 1. Logging Strategy
Given the non-deterministic nature of LLMs, robust observability is critical to diagnose hallucination or parsing failures. 

**What must be logged:**
- **Original Prompt**: The exact text/image sent by the user.
- **Parsed Intent**: The raw JSON returned by the LLM.
- **Confidence Score**: The LLM's certainty of the intent.
- **Validation Outcome**: Success/Fail from the Intent Validator (e.g., "Failed because JO999 not found").
- **Execution Outcome**: Success/Fail from the Application Service.
- **Duration**: Latency of the LLM call vs the Validation vs Execution.

## 2. Security Filtering
- **Never log secrets**: JWT tokens, passwords, or PII (e.g., Customer billing details) must be redacted before the prompt is logged.
- The payload sent to external LLMs must be stripped of any sensitive tenant-level configuration data.

## 3. Monitoring Metrics
- **Intent Accuracy Rate**: Ratio of parsed intents that successfully pass the Intent Validator.
- **Action Confirmation Rate**: Ratio of proposed actions that the user actually clicks "Confirm" on, versus those abandoned or cancelled. (High abandonment indicates poor LLM reasoning).
