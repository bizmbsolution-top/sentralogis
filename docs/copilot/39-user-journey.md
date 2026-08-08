# 39. User Journey

## Scenario: Dispatching and Monitoring

**1. Arrival at Workspace**
Dispatcher logs in. The `OperationalContextPanel` shows their `PinnedJobs` and 2 `Unread Alerts` (one for a delayed driver).

**2. Handling the Delay**
Dispatcher clicks the alert. The Copilot automatically queries the timeline for that specific Job Order.
- *UI Update*: The `ActiveContextCard` updates to the delayed Job Order (JO-991). The `ConversationWorkspace` renders a `TimelineCard` showing the driver has been stopped for 4 hours.

**3. Action Formulation**
Dispatcher types: "Replace driver with Budi."
- *UI Update*: Because JO-991 is the Active Context, the Copilot generates an `ExecutionPlan` to Assign Budi to JO-991. It renders an `ActionProposalCard`.

**4. Human Validation**
Dispatcher reviews the `ActionProposalCard`. They read the `GuardrailPanel` which warns: "Budi is currently 20km away from origin." Dispatcher decides this is acceptable and clicks **Confirm**.

**5. Execution**
- *UI Update*: `ExecutionResultCard` shows success. The `RecentExecutionCard` in the right panel logs "Replaced driver on JO-991". The `ActiveContextCard` refreshes to show Budi as the active driver.
