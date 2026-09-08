# SENTRALOGIS — DATA-4E-R3
# DECISION LOG

**Date:** 2026-09-02  
**Phase:** DATA-4E-R3  

---

## 1. Decisions Confirmed

| Decision | Rationale |
|----------|-----------|
| Use fw_locations.tenant_id directly | Proven by DATA-4E-R2 |
| Direct FK convergence | No parallel columns needed |
| ON CONFLICT DO NOTHING | Idempotent migration |
| Pre-flight assertions | Fail-fast on data issues |
| No DROP fw_locations | Separate retirement gate |
| fw_order_headers included for FK convergence | Historical-only, schema-only migration |

## 2. Rejected Alternatives

| Alternative | Rejected Because |
|-------------|------------------|
| Parallel FK columns | Creates dual authority |
| tenant inference via md_fleets | Nondeterministic |
| LIMIT 1 for tenant mapping | Nondeterministic |
| Silent NULL for unknown types | Data integrity risk |

## 3. Known Limitations

| Limitation | Impact |
|------------|--------|
| fw_locations DEFAULT tenant_id | May need manual cleanup if default used |
| Historical references preserved | Acceptable per zero-consumer definition |

## 4. Verdict

**GREEN — Artifact complete and statically reviewed.**

---

**END OF DECISION LOG**
