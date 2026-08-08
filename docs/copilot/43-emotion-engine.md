# 43. Emotion Engine

The `EmotionEngine` maps cold business risk into a visual language the operator immediately understands.

## Mapping
- **`CONFIDENT` (Indigo)**: Normal operation, high certainty.
- **`THOUGHTFUL` (Cyan)**: Processing complex context, or lower certainty in parsing entities.
- **`CONCERNED` (Amber)**: The planner generated Guardrail warnings, or the proposed action is HIGH risk.
- **`SATISFIED` (Emerald)**: Successful execution.
- **`APOLOGETIC` (Rose)**: Execution failure or validation block.

## Visual Effect
This emotion derives a HEX color, which is passed down to `SentraBotEmotion.tsx` to color the SVG stroke and the ambient `boxShadow` glow.
