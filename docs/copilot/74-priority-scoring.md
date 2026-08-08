# 74. Priority Scoring

The deterministic score within the `OperationalPriority` model ranges from 0-100.

## Logic Adjustments
The `OperationalPriorityEngine.ts` applies base points based on the situation, but adjusts based on SLA Risk. For instance, an administrative issue might have a base score, but if the SLA risk is evaluated as `LOW` by the Insight engine, the score is actively demoted, ensuring paperwork delays don't drown out active delivery delays.
