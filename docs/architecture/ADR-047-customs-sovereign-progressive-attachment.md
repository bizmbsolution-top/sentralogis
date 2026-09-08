# ADR-047 — Customs Sovereign Progressive Attachment

**Status:** RATIFIED (U-16A architectural ratification, 2026-08-28)  
**Date:** 2026-08-28  
**Depends on:** ADR-019 (Progressive Attachment), ADR-020 (Capability Binding), ADR-021 (Customs Attachment Engine), ADR-039 (Fulfillment Composition-not-Engine), ADR-045 (Handoff Boundary)  

---

## 1. Context

Customs clearance (PPJK) operates in a highly regulated, statutory environment (CEISA 4.0, Bea Cukai, Permendag 36/2023 Lartas, CIF/KMK valuation, AJU numbering, SPPB release). In Phase 4A, ADR-019 and ADR-021 established progressive cross-domain attachment where customs declarations attach to shipments, execution legs, and trucking jobs via nullable reference columns without losing declaration sovereignty or breaking SHA-256 audit continuity. We must ratify how Customs integrates into the Fulfillment composition hierarchy.

---

## 2. Decision

**Customs clearance is a sovereign domain; Fulfillment composes customs requirements while CustomsAttachmentService governs operational attachment.**

1. **Customs Sovereignty:**
   - `cus_declarations` is the authoritative aggregate root for statutory customs declarations (PIB, PEB, BC 2.3, BC 1.6, PPFTZ).
   - Customs owns classification lines (`cus_classification_lines`), duty/tax calculations, supporting documents (`cus_supporting_documents`), valuation logs, Lartas permits, CEISA 4.0 XML generation, SHA-256 immutable audit chains (`cus_declaration_audit_events`), and statutory decisions (`cus_customs_decisions`).
   - Fulfillment MUST NOT become a customs declaration, classification, valuation, or CEISA transmission engine.

2. **Progressive Attachment Integration:**
   - Standalone customs operations are scoped via `fulfillment_allocations` with `capability_type = 'CUSTOMS'`.
   - Integrated customs operations attach progressively to logistics movements via `CustomsAttachmentService` (`attachShipment`, `attachTrucking`).
   - Attachment sets nullable references on `cus_declarations` (`shipment_id`, `execution_leg_id`, `job_order_id`) with `ON DELETE SET NULL` semantics.
   - Attaching or detaching a declaration preserves the declaration's primary key, 26-digit statutory AJU declaration number, and cryptographic audit hash chain.

3. **Event Notification:**
   - When Bea Cukai grants release (SPPB), Customs domain publishes `customs.sppb.issued` and `customs.declaration.released` to `event_outbox`.
   - Downstream domains (Forwarding, Warehouse, Fulfillment) consume these events to advance execution and record delivered quantities.

---

## 3. Invariants & Rules

1. **Customs Sovereignty:** CEISA preparation, statutory validation, and tax calculations reside exclusively in the Customs domain.
2. **Audit Hash Continuity:** Attachment actions MUST NOT break the SHA-256 tamper-evident audit event stream.
3. **No Direct Declaration Mutations:** Fulfillment domain code MUST NOT directly insert, update, or mutate `cus_declarations` or `cus_classification_lines`.
4. **Tenant Isolation:** Cross-tenant attachment commands are strictly forbidden and return `FORBIDDEN` / `404-class`.

---

## 4. Forbidden Patterns

- **FORBIDDEN:** Fulfillment generating CEISA XML/EDI payloads or computing HS code import duties.
- **FORBIDDEN:** Mutating or replacing declaration identity upon attachment to a shipment or trucking leg.
- **FORBIDDEN:** Bypassing `CustomsAttachmentService` to execute unsafe direct SQL updates on `cus_declarations`.

---

## 5. Consequences & Implementation Scope

- **Consequences:** Customs clearance remains completely sovereign, compliant with Indonesian Bea Cukai statutory regulations, and cleanly attachable to multi-modal logistics journeys.
- **Scope Note:** **This ADR does NOT authorize implementation during U-16A.** Progressive attachment mechanics are already verified (Phase 4A); integration adapters are deferred to the next authorized implementation phase (U-17).
