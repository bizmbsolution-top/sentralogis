# ADR-053 — Customs SBU Handoff Adapter Semantics

**Status:** RATIFIED (U-17A architectural ratification, 2026-08-28)  
**Date:** 2026-08-28  
**Depends on:** ADR-019 (Customs Progressive Attachment), ADR-021 (Domain Attachment Engine), ADR-047 (Customs Sovereign Attachment), ADR-051 (Operational Handoff Contract)  

---

## 1. Context

Customs clearance is a sovereign statutory process governed by statutory declaration schemas (`cus_declarations`), 5-tier validation, CIF/KMK duty valuation, Permendag 36/2023 Lartas rules, CEISA 4.0 XML preparation, and SHA-256 tamper-evident audit continuity.

## 2. Decision

**`CustomsHandoffAdapter` is the translation boundary into sovereign Customs.**

$$\text{Customs Allocation} \xrightarrow{\quad\text{Operational Handoff}\quad} \text{CustomsHandoffAdapter} \longrightarrow \text{cus\_declarations} \xleftarrow{\text{attach}} \text{CustomsAttachmentService}$$

### 2.1 Customs Sovereignty
Customs remains sovereign over:
1. `cus_declarations` (Statutory declaration documents: PIB, PEB, BC 2.3, BC 1.6, PPFTZ).
2. Declaration identity: UUID PK, 26-digit statutory AJU number, and immutable statutory payload.
3. Cryptographic integrity: SHA-256 append-only event stream (`cus_declaration_audit_events`).
4. Customs clearance engine: CEISA EDI/XML formatting, duty calculation, Lartas permits.

### 2.2 Adapter Responsibilities:
1. **Validation:** Verifies customer importer/exporter credentials (NIB, NPWP, API-U/API-P).
2. **Command / Creation:**
   - Standalone customs: Initiates declaration preparation with `document_type` and line items.
   - Integrated customs: Invokes `CustomsAttachmentService` (`attachShipment`, `attachTrucking`) to attach declaration to Forwarding shipments or execution legs without modifying declaration identity.
3. **Reference Binding:** Binds `assigned_domain_reference` on `OperationalHandoff` (`reference_type = 'DECLARATION'`, `reference_id = cus_declarations.id`).
4. **Lifecycle Feedback:** Translates declaration milestones (`APPROVED`, `SPPB_PENDING`, `RELEASED`) into handoff status updates.

### 2.3 Boundary Constraints:
- **No Direct Mutation:** OperationalHandoff must not directly mutate `cus_declarations` internal tax, duty, or Lartas tables.
- **Audit Preservation:** Attachment and handoff operations must not compromise the SHA-256 audit hash chain.
