# SENTRALOGIS — DATA-4E-R
# ZERO-CONSUMER DEFINITION

**Date:** 2026-09-02  
**Phase:** DATA-4E-R  

---

## Definition

| Category | Description | Must Reach Zero? |
|----------|-------------|------------------|
| A. Executable runtime consumers | Production code that reads/writes fw_locations | YES |
| B. Schema references (FKs) | Foreign key constraints referencing fw_locations | YES |
| C. Historical/audit references | Historical records with fw_locations IDs | NO (if classified safe) |
| D. Documentation references | Architecture docs, comments | NO |

## Current State

| Category | Count |
|----------|-------|
| A. Executable runtime consumers | 0 (direct) |
| B. Schema references (FKs) | 4 (2 on fw_order_headers, 2 on fw_legs) |
| C. Historical/audit references | Unknown (requires runtime data inspection) |
| D. Documentation references | Multiple |

## Target State

| Category | Target |
|----------|--------|
| A. Executable runtime consumers | 0 |
| B. Schema references (FKs) | 0 |
| C. Historical/audit references | Preserved |
| D. Documentation references | Updated |

---

**END OF ZERO-CONSUMER DEFINITION**
