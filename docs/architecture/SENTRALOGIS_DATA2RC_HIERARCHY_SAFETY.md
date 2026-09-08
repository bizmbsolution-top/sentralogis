# SENTRALOGIS — DATA-2R-C
# HIERARCHY SAFETY PROOF

**Date:** 2026-09-02  
**Phase:** DATA-2R-C  
**Nature:** FORENSIC SAFETY PROOF  
**Status:** PRODUCTION IMPLEMENTATION NOT AUTHORIZED  

---

## 1. PARTY HIERARCHY SAFETY

### 1.1 Current Implementation

**Source:** md_entities.parent_id (UUID, FK → md_entities.id, ON DELETE SET NULL)

**Index:** idx_md_entities_parent

**RLS:** tenant_id = get_my_tenant_id()

### 1.2 Cycle Scenarios

| Scenario | Current Protection | Risk |
|----------|-------------------|------|
| Self-reference (A → A) | NONE | LOW — Application validation |
| Direct cycle (A → B, B → A) | NONE | LOW — Application validation |
| Indirect cycle (A → B, B → C, C → A) | NONE | LOW — Application validation |
| Cross-tenant parent | RLS blocks different tenant | NONE |
| Deep hierarchy (>10 levels) | NONE | LOW — Application limit |

### 1.3 Is Application-Layer Cycle Prevention Sufficient?

**Verdict: YES, for v1.**

**Reasoning:**
- Hierarchy changes are infrequent admin operations
- Single-user operations (not concurrent)
- Application can validate before DB write
- DB trigger can be added later if needed
- Pattern is established (same as md_product_categories.parent_id)

### 1.4 Deletion Behavior

**Current:** ON DELETE SET NULL (child survives, parent cleared)

**Verdict:** Correct. Orphan children should not cascade-delete.

### 1.5 Reparenting

| From | To | Safe? |
|------|-----|-------|
| A → B | A → C | YES — if C is not descendant of A |
| A → B | C → B | YES — different parent, no cycle |

**Requirement:** Application must validate no cycle before reparenting.

---

## 2. LOCATION HIERARCHY SAFETY

### 2.1 Proposed Implementation

**Same pattern as party:** md_locations.parent_id (UUID, FK → md_locations.id, ON DELETE SET NULL)

### 2.2 Type Compatibility

**Challenge:** Should PORT → WAREHOUSE be allowed?

**Verdict: Application-level business rule, NOT DB invariant.**

**Rationale:**
- Hard type constraints in DB are brittle
- Business rules can evolve
- Application validates type compatibility

**Recommended Compatibility Matrix:**

| Parent Type | Valid Child Types |
|-------------|-------------------|
| PORT | TERMINAL, BERTH, YARD, CFS |
| TERMINAL | BERTH, YARD, CFS |
| AIRPORT | AIR_CARGO_TERMINAL |
| FACTORY | WAREHOUSE, OFFICE |
| WAREHOUSE | (none — leaf node) |
| DEPOT | (none — leaf node) |

### 2.3 Cycle Prevention

Same as party hierarchy — application-layer prevention sufficient.

---

## 3. CROSS-TENANT HIERARCHY

### 3.1 Party Hierarchy

**Risk:** Tenant A party references Tenant B parent.

**Protection:** RLS enforces tenant_id = get_my_tenant_id() for reads/writes.

**Gap:** Application must validate parent_id tenant matches child tenant.

### 3.2 Location Hierarchy

**Risk:** Tenant A location references Tenant B parent.

**Protection:** Same as party — RLS + application validation.

---

## 4. HISTORICAL INTEGRITY

### 4.1 Problem

If Party or Location hierarchy changes, historical transactions (shipments, orders) must not change meaning.

### 4.2 Solution

**Current references are by ID, not by hierarchy path.**

- Shipment references md_entities.id (immutable)
- Shipment references md_locations.id (immutable)
- Hierarchy changes do NOT affect existing references

**Verdict:** Historical integrity preserved. No snapshots needed.

---

## 5. VERDICT

### Condition C: Hierarchy Safety

**Status: CLOSED**

**Reasoning:**
1. Cycle prevention at application layer is sufficient for v1
2. ON DELETE SET NULL is correct for both hierarchies
3. Type compatibility is business rule, not DB invariant
4. Cross-tenant prevention via RLS + application validation
5. Historical integrity preserved by ID references

---

**END OF HIERARCHY SAFETY PROOF**
