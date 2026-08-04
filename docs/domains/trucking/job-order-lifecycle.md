# Job Order Lifecycle (Trucking Domain)

## State: PENDING
- **Allowed Actor**: Operations / Dispatcher
- **Permission Requirement**: `trucking.ops.create`
- **Validation Rule**: Must have valid Route (Origin, Destination). Driver/Vehicle assignments are optional at creation but required before moving to ASSIGNED.
- **Side Effects**: Emits `JobOrderCreatedEvent`.

## State: ASSIGNED
- **Allowed Actor**: Operations / Dispatcher
- **Permission Requirement**: `trucking.ops.assign`
- **Validation Rule**: Must have a valid `driverId` and `vehicleId` assigned. Driver must be available. Vehicle must be available.
- **Side Effects**: Emits `JobOrderAssignedEvent`. Pushes notification to Driver PWA.

## State: IN_PROGRESS (MENUNGGU SELESAI)
- **Allowed Actor**: Driver / System (Auto-start Cron)
- **Permission Requirement**: `trucking.driver.start`
- **Validation Rule**: Actor must be the assigned `driverId`.
- **Side Effects**: Emits `JobOrderStartedEvent`. Initializes active GPS telemetry tracking.

## State: COMPLETED
- **Allowed Actor**: Driver / Operations / System (Auto-complete Cron)
- **Permission Requirement**: `trucking.driver.complete` or `trucking.ops.override`
- **Validation Rule**: Driver must have uploaded all mandatory Proof of Delivery (POD) attachments.
- **Side Effects**: Emits `JobOrderCompletedEvent`. Triggers Driver Wallet Token deduction/reward (NOT VERIFIED). Triggers invoice generation pipeline (NOT VERIFIED).

## State: CANCELLED
- **Allowed Actor**: Operations
- **Permission Requirement**: `trucking.ops.cancel`
- **Validation Rule**: Cannot cancel a Job Order that is already IN_PROGRESS or COMPLETED.
- **Side Effects**: Emits `JobOrderCancelledEvent`. Frees Driver and Vehicle assignments.
