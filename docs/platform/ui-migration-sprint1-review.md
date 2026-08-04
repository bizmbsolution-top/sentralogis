# Phase 3B.1.5 Sprint 1 Architecture Review

This document audits the UI Migration Sprint 1 execution against the Phase 3A architectural governance rules. 

## 1. Compliance Checklist

| Rule | Status | Remarks |
|------|--------|---------|
| **1. No UI Component Mutations** | **PASS** | `EditAssignmentModal.tsx` and `RejectReassignModal.tsx` now delegate entirely via `fetch` API calls. Direct Supabase RPCs and mutations have been removed from the UI. |
| **2. API Routes Free of Business Logic** | **PASS** | API routes strictly parse request payloads and delegate execution to `JobOrderService`. |
| **3. Business Rules in Domain/Service** | **PASS** | `JobOrderService` and `JobOrder` aggregate continue to encapsulate all rule execution. |
| **4. PermissionEngine Executes First** | **PASS** | Evaluated successfully within the `JobOrderService` before any aggregate modification. |
| **5. Repositories as Persistence Boundary** | **PASS** | The domain state is correctly persisted exclusively through `IJobOrderRepository`. |
| **7. IRequestContext Integrity** | **PASS** | `tenantId`, `userId`, and `role` are strictly extracted server-side using `supabase.auth.getUser()`, ensuring zero trust in client payloads. |
| **8. Result Propagation Validated** | **PASS** | APIs appropriately check `result.isFailure` and propagate cleanly to HTTP 400 responses. |
| **9. No Supabase Bypasses (Except Legacy)** | **PASS** | Bypasses exist, but they are strictly isolated for the legacy adapter pattern. |

## 2. Legacy Adapter Findings & Architecture Violations

### 🚨 Architecture Violation Identified
In Sprint 1, the legacy backward-compatibility patches (e.g., updating `transporter_id`, `purchase_price`, `notes`) were placed directly inside the Next.js API Routes (`assign/route.ts` and `cancel/route.ts`). 

**Evaluation against Responsibility Matrix:**
- [ ] Repository responsibility
- [x] Infrastructure Adapter responsibility
- [x] **API responsibility (VIOLATION)**

**Finding**: The API Route is currently acting as a data access layer by importing the Supabase client and executing `.update()` directly on `job_orders`. This violates the Clean Architecture dependency rule which states that the UI/API delivery mechanism should not contain direct infrastructure orchestration.

## 3. Technical Debt Introduced
- Leaking infrastructure dependencies (Supabase SQL) into the HTTP delivery layer (Next.js API).
- Fractured consistency: If the domain aggregate saves successfully but the API route legacy patch fails, the system is left in a partially updated state.

## 4. Refactoring Recommendations
To resolve this violation and align with Phase 3A governance:
1. **Infrastructure Isolation**: Move the legacy mapping logic directly into `SupabaseJobOrderRepository.ts`. 
2. **Translation Layer**: When `SupabaseJobOrderRepository.save()` receives the domain aggregate, it should translate the domain state into the database schema, AND safely merge any legacy fields it holds, keeping the Next.js API entirely ignorant of Supabase queries.

## 5. Risk Assessment
- **Current State**: High risk of leaky abstractions. API routes containing SQL queries will make future transitions away from Supabase extremely difficult.
- **Refactoring Risk**: Low. Moving the update logic down to the infrastructure layer consolidates the persistence boundary exactly as intended.

## 6. Approval Recommendation

**FIX REQUIRED BEFORE SPRINT 2**

The legacy compatibility patches currently residing in the Next.js API routes must be refactored into the Infrastructure Layer (`SupabaseJobOrderRepository.ts`) before continuing to Sprint 2.
