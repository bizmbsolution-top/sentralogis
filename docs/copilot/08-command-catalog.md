# Sentralogis Copilot MVP - Command Catalog

Commands represent the bridge between the UI confirmation and the actual Domain execution.

## 1. ProposeWorkOrderDraftCommand
- **Action**: Opens a pre-filled Work Order creation UI modal.
- **Payload**: `{ customer_id?, pickup_location?, destination_location?, execution_date?, vehicle_type?, quantity? }`
- **Execution**: Does not mutate database directly. User completes the form and clicks Save, triggering `WorkOrderService.create()`.

## 2. ProposeJobAssignmentCommand
- **Action**: Suggests assignment to the user.
- **Payload**: `{ job_order_id, driver_id, vehicle_id }`
- **Execution**: Upon confirmation, calls `JobOrderService.assignDriver(ctx, cmd)`.

## 3. ProposeJobDataUpdateCommand
- **Action**: Suggests updating operational metadata (e.g. from OCR).
- **Payload**: `{ job_order_id, container_number, seal_number }`
- **Execution**: Upon confirmation, calls `JobOrderService.updateContainer(ctx, cmd)`.

## 4. ProposeJobCancellationCommand
- **Action**: Suggests cancelling a job.
- **Payload**: `{ job_order_id }`
- **Execution**: Upon confirmation, calls `JobOrderService.cancelJob(ctx, cmd)`.

## 5. ExecuteStatusQueryCommand
- **Action**: Executes a predefined query immediately (Read Model).
- **Payload**: `{ query_type }`
- **Execution**: Calls `DriverPortalQuery` or equivalent infrastructure query class (e.g., `JobOrderQueryService.getDelayedJobs(ctx)`).

## 6. ExecuteFindEntityQueryCommand
- **Action**: Searches for a specific entity ID.
- **Payload**: `{ entity_type, entity_value }`
- **Execution**: Calls respective read models to return the current status of the requested entity.
