# Sentralogis Copilot MVP - Functional Requirements

## 1. Input Parsing & Modalities
- **FR-1.1 Text Input**: The system shall accept unstructured natural language text input via a chat interface.
- **FR-1.2 Image Upload**: The system shall allow users to upload images (JPEG, PNG).
- **FR-1.3 Document Upload**: The system shall allow users to upload PDF and Excel files.
- **FR-1.4 WhatsApp Paste**: The system shall handle multi-line pasted text typical of WhatsApp formats without breaking context.

## 2. Intent Recognition (Orchestration)
- **FR-2.1 Intent Detection**: The system shall route user inputs to an Intent Parser to classify the desired action (e.g., Query, Assign, Create, OCR).
- **FR-2.2 Entity Extraction**: The system shall extract business entities (Job ID, Driver Name, Locations) from natural language.
- **FR-2.3 OCR Extraction**: The system shall extract Container Numbers, Seal Numbers, and Document Types from images using an OCR service.

## 3. Action Suggestion & Confirmation
- **FR-3.1 Proposal Generation**: The system shall not execute mutations immediately. It must present a structured preview (Suggestion) to the user.
- **FR-3.2 Explicit Confirmation**: The system must require the user to click a confirmation button to execute a modifying command.
- **FR-3.3 Cancellation**: The system must allow users to cancel or reject a suggestion.

## 4. Execution via Domain Services
- **FR-4.1 Aggregate Mutability**: The system must execute all approved commands through existing Application Services (e.g., `JobOrderService`, `TrackingService`).
- **FR-4.2 Permission Enforcement**: The system must pass the user's `IRequestContext` to the Application Service to enforce `PermissionEngine` rules.
- **FR-4.3 Result Handling**: The system must interpret the `Result<T>` returned by the Application Service and display success or failure messages.

## 5. Domain-Specific Actions (MVP Scope)
- **FR-5.1 Work Order Creation**: Suggest generating a new Work Order from extracted Customer, Pickup, Destination, Schedule, Container, and Vehicle Type.
- **FR-5.2 Job Assignment**: Assign an existing Job Order to a specific Driver.
- **FR-5.3 Job Cancellation**: Cancel an existing Job Order.
- **FR-5.4 Data Update**: Update Container and Seal numbers on a Job Order.
- **FR-5.5 Operational Querying**: Query delayed jobs, idle drivers, missing PODs, or find a specific container.
