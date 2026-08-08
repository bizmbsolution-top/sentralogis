# 33. Risk Analysis

The Planner assigns a deterministic **ExecutionRisk** to every generated plan. This is meant to control user-facing confirmation dialogues or trigger higher-tier authorization workflows in the future.

## Risk Levels
- **LOW**: Non-destructive operations (e.g., Assigning a Driver, Viewing a Shipment). Usually auto-approved or requiring a simple click.
- **MEDIUM**: Standard mutative operations (e.g., Updating a Booking, Modifying a Rate). 
- **HIGH**: Destructive but recoverable operations (e.g., Cancelling a Shipment, Rejecting a Vendor). **ALWAYS requires explicit human confirmation**.
- **CRITICAL**: Highly destructive, unrecoverable operations (e.g., Deleting an Invoice, Wiping a Company). **ALWAYS requires explicit human confirmation**, and may require admin escalation or MFA.
