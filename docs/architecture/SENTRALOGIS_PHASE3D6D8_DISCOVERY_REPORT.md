# SENTRALOGIS — PHASE 3D-6D-8 DISCOVERY & ARCHITECTURE REPORT

## CEISA 4.0 XML & EDI PREPARATION WORKSPACE
**Domain:** SBU Customs Clearance & PPJK Operations  
**Date:** 2026-08-26  
**Status:** DISCOVERY & ARCHITECTURE DESIGN COMPLETE  
**Previous Validated Baseline:** 415 / 415 tests PASS (100% Green)  

---

## 1. EXECUTIVE DISCOVERY SUMMARY

### 1.1 Objective & Boundary
The objective of Phase 3D-6D-8 is to establish a deterministic **CEISA 4.0 Preparation & Compliance Gateway**.
Under no circumstances will this phase perform live network transmissions or credentialed API handshakes to Directorate General of Customs and Excise (DJBC) CEISA 4.0 servers.

The system enforces a clean **External System Boundary**:
```text
Customs Declaration Aggregate
            ↓
Supporting Documents (Vault + Line Linkage)
            ↓
Valuation (FOB, Freight, Insurance, CIF, Kurs KMK)
            ↓
Lartas / Regulatory Matrix (Permendag 36/2023 & BTKI 2026)
            ↓
Validation Engine (Tiers 1-5)
            ↓
Exception Registry & Resolution
            ↓
Readiness Gate (CUSTOMS READY)
            ↓
CEISA Preparation Adapter Layer
      ├── Canonical Customs Model
      ├── CEISA 4.0 Field Mapping Engine
      ├── 3-Layer Validation (Domain → Schema → Business Rules)
      ├── Deterministic XML / EDI Serializer
      └── Immutable Artifact Builder (SHA-256 Checksummed)
            ↓
Pre-Submission Specialist Review (Human-in-the-Loop)
            ↓
READY TO TRANSMIT (Stopped prior to physical transport)
```

---

## 2. REPOSITORY ASSETS & GAPS AUDIT

| Component Area | Existing State in Codebase | Discovery Finding & Architectural Requirement |
| :--- | :--- | :--- |
| **CEISA Preparation Service** | Basic `lib/domain/customs/ceisa-preparation-service.ts` generating JSON dataset. | Must be modularized into a dedicated `lib/domain/customs/ceisa/` namespace with separation between Canonical Model, Mapping Engine, Schema Validator, and Serializer. |
| **XML Serialization** | None. | Must implement a deterministic XML Serializer producing DJBC PIB (BC 2.0) compliant XML documents with stable element order, UTF-8 encoding, XML escaping, decimal precision, and SHA-256 checksums. |
| **EDI Serialization** | None. | Must provide an EDI serializer abstraction with standard fallback `CEISA_EDI_SPEC_REQUIRED` when DJBC EDIFACT segment specification is required. |
| **Controlled Code Sets** | Scattered across UI and enums. | Must consolidate into a versioned `codesets.ts` covering Document Types, KPPBC Offices, ISO Country Codes, Currency Codes, Package Types, Transport Modes, and fallback `SOURCE_REQUIRED`. |
| **Preparation Persistence** | None (only in-memory preview). | Must create `cus_ceisa_preparations` and `cus_ceisa_validation_results` tables with immutable versioning, tenant isolation (RLS), and audit logs. |
| **Field Mapping Inspector** | None. | Must implement an explainable Canonical $\to$ CEISA field transformation inspector in the UI (`tab=ceisa`). |

---

## 3. REGULATORY SOURCE & CODE SET SAFETY

In strict adherence to Sentralogis Regulatory Invariants:
1. **No Invented XML Tags / Business Codes**:
   Every XML element and code must map to documented DJBC BC 2.0 / CEISA 4.0 specifications.
2. **`SOURCE_REQUIRED` Fallback**:
   If an authoritative technical specification is missing or unverified:
   - XML Schema Missing $\implies$ `CEISA_XML_SCHEMA_REQUIRED`
   - EDI Specification Missing $\implies$ `CEISA_EDI_SPEC_REQUIRED`
   - Code Set Uncertain $\implies$ `CEISA_CODESET_REQUIRED`
   - Business Rule Uncertain $\implies$ `CEISA_BUSINESS_RULE_SOURCE_REQUIRED`

---

## 4. CEISA PREPARATION AGGREGATE & LIFECYCLE

### 4.1 Preparation Lifecycle States
```text
[DRAFT]
   │ (Trigger prepare / refresh)
   ▼
[VALIDATING]
   │
   ├── Schema / Business Errors Detected ──► [INVALID]
   │                                            │ (Fix data)
   │                                            └──► [VALIDATING]
   │
   └── 3 Validation Layers PASS
            │
            ▼
   [READY_FOR_REVIEW]
            │ (Specialist review & approve)
            ▼
   [READY_TO_TRANSMIT]
            │ (Subsequent declaration edit)
            ▼
       [SUPERSEDED]
```

### 4.2 Immutability & Versioning
When a declaration aggregate changes, previous generated CEISA preparation runs are marked `SUPERSEDED`.
Every preparation run stores an immutable artifact snapshot with its SHA-256 cryptographic digest, schema version, line count, and byte size.

---

## 5. DATABASE DESIGN (`20260826_011_customs_ceisa_preparations_schema.sql`)

### Table 1: `public.cus_ceisa_preparations`
- `id` (`UUID` PK)
- `tenant_id` (`UUID` NOT NULL)
- `declaration_id` (`UUID` NOT NULL REFERENCES `cus_declarations(id)`)
- `version_no` (`INT` NOT NULL DEFAULT 1)
- `message_type` (`TEXT` NOT NULL DEFAULT 'PIB_BC20')
- `schema_version` (`TEXT` NOT NULL DEFAULT 'CEISA-4.0-XML-v1.0')
- `status` (`TEXT` CHECK in `DRAFT`, `VALIDATING`, `INVALID`, `READY_FOR_REVIEW`, `READY_TO_TRANSMIT`, `SUPERSEDED`))
- `artifact_format` (`TEXT` CHECK in `XML`, `EDI`, `JSON`))
- `artifact_content` (`TEXT` NULLABLE)
- `artifact_checksum` (`TEXT` NULLABLE)
- `artifact_size_bytes` (`INT` NULLABLE)
- `item_count` (`INT` NOT NULL DEFAULT 0)
- `blocking_errors_count` (`INT` NOT NULL DEFAULT 0)
- `warnings_count` (`INT` NOT NULL DEFAULT 0)
- `metadata` (`JSONB` NOT NULL DEFAULT '{}'::jsonb)
- `created_by` (`UUID` NULLABLE)
- `created_at` (`TIMESTAMPTZ` NOT NULL DEFAULT now())
- `updated_at` (`TIMESTAMPTZ` NOT NULL DEFAULT now())

### Table 2: `public.cus_ceisa_validation_results`
- `id` (`UUID` PK)
- `tenant_id` (`UUID` NOT NULL)
- `preparation_id` (`UUID` NOT NULL REFERENCES `cus_ceisa_preparations(id) ON DELETE CASCADE`)
- `layer` (`TEXT` CHECK in `DOMAIN`, `SCHEMA`, `BUSINESS_RULE`))
- `rule_code` (`TEXT` NOT NULL)
- `severity` (`TEXT` CHECK in `BLOCKING`, `WARNING`, `INFO`))
- `field_path` (`TEXT` NOT NULL)
- `message` (`TEXT` NOT NULL)
- `expected_value` (`TEXT` NULLABLE)
- `actual_value` (`TEXT` NULLABLE)
- `resolution_hint` (`TEXT` NULLABLE)
- `created_at` (`TIMESTAMPTZ` NOT NULL DEFAULT now())

---

## 6. FIELD MAPPING & SERIALIZATION ARCHITECTURE

### 6.1 Canonical Model to CEISA 4.0 XML Mapping (BC 2.0)
```text
Root Element: <DokumenPabean>
  <Header>
    <nomorAju>           ← declaration.declaration_number (26 chars)
    <kodeDokumen>        ← '20' (BC 2.0 PIB)
    <kodeKantor>         ← declaration.customs_office_code (6 digits)
    <importer>
      <namaPerusahaan>   ← importer.legal_name
      <npwp>             ← importer.tax_id (15/16 digits)
      <alamat>           ← importer.registered_address
    </importer>
    <nilaiPabean>        ← valuation.total_nilai_pabean_idr
    <kursPajak>          ← valuation.kurs_kmk_idr
    <cifUsd>             ← valuation.total_cif_usd
    <pungutan>
      <beaMasuk>         ← taxes.total_bea_masuk_idr
      <ppn>              ← taxes.total_ppn_idr
      <pph>              ← taxes.total_pph22_idr
    </pungutan>
  </Header>
  <Barang>
    <Item serNo="1">
      <hsCode>           ← line.hs_code (8 digits clean)
      <uraian>           ← line.goods_description
      <jumlahSatuan>     ← line.item_quantity
      <kodeSatuan>       ← line.uom_code
      <hargaSatuan>      ← line.unit_price_usd
      <cif>              ← line.cif_value_usd
      <negaraAsal>       ← line.country_of_origin (ISO-2)
      <lartas>
        <flag>           ← true / false
        <nomorIzin>      ← permit_document.document_number
      </lartas>
    </Item>
  </Barang>
  <DokumenLampiran>
    <Dokumen serNo="1">
      <kodeDokumen>      ← doc.document_type
      <nomorDokumen>     ← doc.document_number
      <tanggalDokumen>   ← doc.issue_date
    </Dokumen>
  </DokumenLampiran>
</DokumenPabean>
```

---

## 7. NEXT STEP EXECUTION PLAN
1. Create Database Migration `20260826_011_customs_ceisa_preparations_schema.sql`.
2. Create `lib/domain/customs/ceisa/` module structure:
   - `types.ts`
   - `codesets.ts`
   - `mapping-engine.ts`
   - `ceisa-validator.ts`
   - `xml-serializer.ts`
   - `edi-serializer.ts`
   - `artifact-builder.ts`
   - `ceisa-preparation-service.ts`
3. Create REST API endpoints under `app/api/v1/customs/declarations/[id]/ceisa/`.
4. Create UI Workspace `components/workspaces/customs/CeisaWorkspace.tsx` (`tab=ceisa`).
5. Write and execute test suite `lib/domain/customs/__tests__/ppjk-ceisa-preparation.test.ts`.
6. Run static analysis, benchmark, and regression checks.
