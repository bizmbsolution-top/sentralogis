# UI Migration Strategy

## Overview
This document defines the Strangler Fig migration strategy for replacing direct Supabase RPC/SQL calls in the UI with the domain-driven Application Layer (`JobOrderService`).

## 1. Migration Categories

### READY (Immediate Migration)
Components that execute isolated mutations on `job_orders` with no complex side-effects attached directly to the UI code.
- **Example**: `HandoverModal.tsx`
- **Action**: Replace direct `supabase.update()` with an API call to a Next.js API route that constructs the `IRequestContext` and invokes `JobOrderService`.

### PARTIAL (Requires Legacy Adapter)
Components that mix Trucking mutations with other domain mutations (e.g., Finance, Costing) or perform complex batch operations.
- **Example**: `assignments/page.tsx` (batch assigning).
- **Action**: Build a Legacy Adapter API route that orchestrates `JobOrderService` for the Trucking portion, and uses direct Supabase queries for the unmigrated portions (like `notifications` or `extra_costs`) to preserve backward compatibility.

### BLOCKED (Dependent on Legacy Workflows)
Components waiting on domains not yet migrated (e.g., Transporter/Vendor domains, Finance domains).
- **Example**: `add-cost/page.tsx`
- **Action**: Do not migrate mutations yet. Wait until Costing Domain is established.

## 2. API Route Abstraction
To keep the UI clean and prevent leaking database secrets or domain logic to the client, the UI will NOT import `JobOrderService` directly (as it requires backend repositories).
Instead:
1. UI calls `POST /api/trucking/job-orders/[id]/assign`
2. API Route builds `IRequestContext` from the authenticated user session.
3. API Route invokes `JobOrderService`.
4. API Route returns unified JSON response.

## 3. CQRS Rule for Reads
The Application Service (`JobOrderService`) is designed for **mutations**.
Read-only dashboards (`reporting/page.tsx`, `fleet-performance/page.tsx`) that use `supabase.from(...).select()` will remain untouched for now. This enforces a clean Command Query Responsibility Segregation (CQRS) pattern where queries bypass the rich domain model for performance, and commands go through the strict Domain Aggregates.
