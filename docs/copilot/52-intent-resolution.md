# 52. Intent Resolution

The `IntentResolver` bridges natural language to structured JSON.

## Determinism
The output is strictly typed:
```json
{
  "intent": "ASSIGN_DRIVER",
  "entities": {
    "Driver": "Budi Santoso"
  },
  "confidence": 0.95
}
```

If the LLM returns an unknown intent, or confidence is too low, the system falls back to `clarification` mode and asks the user to rephrase. It never guesses.
