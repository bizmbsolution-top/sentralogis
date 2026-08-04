# Sentralogis Copilot MVP - User Journeys

## Journey 1: WhatsApp Order Intake (Customer Service)
**Context**: A customer sends an unstructured WhatsApp message requesting a new transport order.
1. **Input**: User pastes the raw text into Copilot: *"Tolong ambil 2 container besok pagi di depo mutiara kirim ke gudang cikarang pake wingbox."*
2. **AI Action**: Copilot parses the intent as `CreateWorkOrderIntent`. It extracts `Customer`, `Pickup` (Depo Mutiara), `Destination` (Gudang Cikarang), `Schedule` (Tomorrow morning), `Vehicle Type` (Wingbox), and `Container Count` (2).
3. **Suggestion**: Copilot displays a structured draft of the Work Order UI card for review.
4. **Execution**: User clicks "Create Work Order". Copilot orchestrates via `WorkOrderService`.

## Journey 2: Operational Photo OCR Update (Ground Staff)
**Context**: A checker takes a photo of a container seal at the depot.
1. **Input**: User uploads the photo to the Copilot UI.
2. **AI Action**: Copilot parses the intent as `ExtractOperationalDataIntent` and runs OCR. It detects `Container Number` (MSKU1234567) and `Seal Number` (S12345).
3. **Suggestion**: Copilot cross-references active jobs, finds the matching Job Order, and proposes: *"Update JO221 with Container: MSKU1234567, Seal: S12345?"*
4. **Execution**: User clicks "Confirm Update". Copilot delegates to `JobOrderService.updateContainer()`.

## Journey 3: Quick Dispatch Command (Dispatcher)
**Context**: A dispatcher needs to assign a job quickly without opening the full planning board.
1. **Input**: User types: *"Assign JO221 to Budi"*
2. **AI Action**: Copilot parses `AssignJobIntent`. It identifies `job_id` corresponding to JO221 and `driver_id` for Budi via read models.
3. **Suggestion**: Copilot displays: *"Assigning JO221 to Driver: Budi. Confirm?"*
4. **Execution**: User confirms. Copilot delegates to `JobOrderService.assignDriver()`.

## Journey 4: Fleet Overview Query (Manager)
**Context**: An operations manager wants to know operational bottlenecks.
1. **Input**: User asks: *"Which jobs are delayed today?"*
2. **AI Action**: Copilot parses `QueryDelayedJobsIntent`.
3. **Suggestion/Execution**: Copilot invokes `JobOrderQueryService` or `DriverPortalQuery`, filtering by `Timeline` status or SLA thresholds, and returns a formatted list of delayed JOs directly in the chat interface.
