# Sentralogis Copilot MVP - Intent Catalog

Intents represent the classification of user input by the AI Parser. The parser translates natural language into these formal structures.

## 1. CreateWorkOrderIntent
- **Trigger**: User pastes WhatsApp text or types a request for a new transport job.
- **Extracted Entities**:
  - `CustomerName` (string, optional)
  - `PickupLocation` (string, optional)
  - `DestinationLocation` (string, optional)
  - `ExecutionDate` (date/time, optional)
  - `VehicleType` (string, optional)
  - `ContainerCount` (number, optional)
- **Target Command**: `ProposeWorkOrderDraftCommand`

## 2. ExtractOperationalDataIntent
- **Trigger**: User uploads a photo (image).
- **Extracted Entities** (via OCR):
  - `ContainerNumber` (string, regex: `^[A-Z]{4}\d{7}$`)
  - `SealNumber` (string)
  - `DocumentType` (enum: DO, SURAT_JALAN, POD, EIR)
- **Target Command**: `ProposeJobDataUpdateCommand`

## 3. AssignJobIntent
- **Trigger**: "Assign JO221 to Budi"
- **Extracted Entities**:
  - `JobOrderNumber` (string, e.g., "JO221")
  - `DriverName` (string, e.g., "Budi")
- **Target Command**: `ProposeJobAssignmentCommand`

## 4. CancelJobIntent
- **Trigger**: "Cancel JO233"
- **Extracted Entities**:
  - `JobOrderNumber` (string)
- **Target Command**: `ProposeJobCancellationCommand`

## 5. QueryOperationalStatusIntent
- **Trigger**: "Show delayed jobs", "Which drivers are idle?"
- **Extracted Entities**:
  - `QueryType` (enum: DELAYED_JOBS, IDLE_DRIVERS, MISSING_PODS)
- **Target Command**: `ExecuteStatusQueryCommand`

## 6. FindEntityIntent
- **Trigger**: "Find container MSKU1234567"
- **Extracted Entities**:
  - `EntityType` (enum: CONTAINER, JOB_ORDER, WORK_ORDER, DRIVER)
  - `EntityValue` (string)
- **Target Command**: `ExecuteFindEntityQueryCommand`
