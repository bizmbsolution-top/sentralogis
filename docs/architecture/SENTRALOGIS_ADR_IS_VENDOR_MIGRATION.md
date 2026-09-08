# ADR-076 — is_vendor Consumer Migration

**Status:** RATIFIED — STRATEGY ONLY (DATA-4A Human Ratification, 2026-09-02)  
**Date:** 2026-09-02  
**Depends on:** ADR-070 (Party Role Architecture), DATA-3 (party_roles.VENDOR backfill)  

---

## 1. Context

is_vendor is a legacy boolean flag on md_entities. DATA-3 backfilled party_roles.VENDOR from is_vendor=true. Approximately 131 consumer references remain.

## 2. Problem

is_vendor is semantically equivalent to party_roles.VENDOR (GLOBAL) for most consumers. However, each consumer must be semantically classified before migration.

## 3. Decision

**is_vendor consumers SHALL be migrated to party_roles.VENDOR via semantic classification.**

Required lifecycle:
1. Backfill (DONE — migration 038)
2. Consumer-by-consumer semantic classification
3. Migration with regression proof
4. Zero-consumer proof
5. Legacy column removal

## 4. Consumer Classification

| Category | Description | Migration Approach |
|----------|-------------|-------------------|
| CANONICAL-EQUIVALENT | is_vendor = party_roles.VENDOR | Direct replacement |
| SEMANTICALLY-DIFFERENT | Different meaning | Custom migration |
| DOMAIN-SPECIFIC | Fleet/GPS context | Keep as domain field |
| DEAD | No runtime effect | Remove |
| TEST-ONLY | Test fixtures only | Update test |

## 5. Prohibited Actions

- **Blind global replacement** of is_vendor with party_roles.VENDOR
- **Premature column removal** before zero-consumer proof

## 6. Invariants

1. is_vendor = legacy representation of party_roles.VENDOR
2. All consumers must be semantically classified
3. Zero-consumer proof required before column removal

## 7. Special Cases

| Consumer | Classification |
|----------|----------------|
| assignment.ts | CANONICAL-EQUIVALENT |
| EasyGoSyncService | CANONICAL-EQUALENT |
| fleet-status | N/A (uses vendor_tenant_id) |
| cost-audit | N/A (uses vendor_type) |
| UI badges | CANONICAL-EQUIVALENT |

## 8. Consequences

- Canonical vendor authority: party_roles.VENDOR
- Legacy column eventually removed
- Migration complexity: HIGH (131 consumers)

---

**END OF ADR-076**
