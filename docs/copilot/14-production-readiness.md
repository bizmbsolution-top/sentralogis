# Sentralogis Copilot MVP - Production Readiness Checklist

To be certified ready for production, the MVP must pass the following checks:

## 1. Domain Integrity Verification
- [ ] No database insertions or updates bypass `JobOrderService` or `WorkOrderService`.
- [ ] OCR extractions map precisely to database schemas without truncation or invalid character casting.
- [ ] The `tenant_id` context is never lost during LLM orchestration.

## 2. LLM Provider Reliability
- [ ] The intent parser uses strict JSON mode (e.g., Gemini `responseMimeType: "application/json"` or OpenAI `response_format: { type: "json_object" }`).
- [ ] PII data (Customer Names, Phone Numbers) is handled according to enterprise policy when sent to external LLMs.
- [ ] A fallback mechanism exists if the LLM provider rate-limits the application.

## 3. UI/UX Verification
- [ ] The user can cleanly cancel an AI-proposed action without side effects.
- [ ] The chat history gracefully handles long responses.
- [ ] Uploaded photos compress locally before transmission to save bandwidth.

## 4. Telemetry & Monitoring
- [ ] Log every parsed Intent mapped against its execution result (Success/Fail) to measure AI accuracy.
- [ ] Alert on high frequency of `Result.fail()` returned from `JobOrderService`, indicating the AI is hallucinating impossible actions.
