/**
 * Cross-tenant display code helper (Opsi B — Per-Tenant Copy).
 *
 * Master rows (md_fleets / md_drivers / md_entities) keep their raw code in the DB
 * (e.g. `B123ABC`, `ANTONIO`). When a row owned by another tenant is shown inside the
 * current tenant's UI, append `_{tenant_code}` so codes never look ambiguous:
 *
 *   displayCode("B123ABC", ownerTenantId, currentTenantId, tenantCodeMap)
 *   → ownerTenantId === currentTenantId ? "B123ABC" : "B123ABC_ATM"
 */
export function displayCode(
  code: string | null | undefined,
  ownerTenantId: string | null | undefined,
  currentTenantId: string | null | undefined,
  tenantCodeMap: Record<string, string>,
): string {
  const raw = code || "-";
  if (!ownerTenantId || !currentTenantId || ownerTenantId === currentTenantId) {
    return raw;
  }
  const suffix = tenantCodeMap[ownerTenantId];
  if (!suffix) return raw;
  return `${raw}_${suffix}`;
}
