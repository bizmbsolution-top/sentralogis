# 27 - Entity Resolution

## Overview
Entity Resolution is the process of mapping a natural language reference (e.g., "Budi", "L-1234-AF") to a strongly typed UUID in the system.

## Supported Entities
The `EntityLookupService` currently resolves:
- `DRIVER` (md_drivers)
- `JOB_ORDER` (job_orders)
- `VEHICLE` (md_fleets)
- `CONTAINER` (job_orders/fw_containers)
- `CUSTOMER` (md_entities)
- `WORK_ORDER` (work_orders)

## Search Strategy
1. **Exact UUID Match**: If the user provides a valid UUID, the engine looks it up directly.
2. **Fuzzy Text Match**: If the input is text, the engine generates an `ilike %...%` query across all relevant searchable columns (e.g., `name`, `phone`, `jo_number`, `plate_number`).
3. **Limit**: Queries are strictly limited to 10 candidates to maintain performance (<300ms) and avoid large payloads.

## Scoring & Explainability
Each `EntityCandidate` is assigned a `confidenceScore` (0.0 to 1.0) and an explainability `metadata` object:
- `1.00`: Exact matches (e.g., UUID, exact name, exact phone number). Metadata: `{ reason: 'exact_match_id' }`.
- `0.95`: Normalized matches (e.g., formatting stripped, like "B-1234-XYZ" matching "B1234XYZ"). Metadata: `{ reason: 'normalized_match_plate' }`.
- `0.80`: Partial/Fuzzy matches (e.g., "Budi" matching "Budi Santoso"). Metadata: `{ reason: 'partial_match_name' }`.

This structured metadata (`metadata.reason`) ensures full explainability for debugging, audit logging, and future AI explanation rendering, without mutating the execution logic itself.
