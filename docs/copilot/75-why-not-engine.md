# 75. Why Not Engine

The `WhyNotEngine.ts` adds a crucial layer of decision support: stopping operators from making bad decisions and explaining *why*.

## Negative Recommendations
If a user tries to issue a "Replace Driver" command for a job that is already `WAITING_UNLOADING` at the destination, the engine deterministically intercepts this. It returns a structured `WhyNotExplanation` noting that replacing the driver will not speed up the consignee's unloading speed, supported by evidence that the destination geofence has already been breached.
