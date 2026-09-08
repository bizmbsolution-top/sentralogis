/**
 * Sentralogis — Phase 4B-1a / U-01 + U-02
 * lib/application/identity/types.ts
 *
 * Canonical server-side identity context types.
 * IdentityContext belongs to the application/server boundary — never to UI models.
 *
 * U-01: Core identity context.
 * U-02: Expanded permission vocabulary + SBU type.
 */

/** SBU (Strategic Business Unit) type — matches tenant_sbus.sbu_type values. */
export type SbuType = 'trucking' | 'warehouse' | 'clearances' | 'forwarding';

/**
 * Permission vocabulary.
 * Format: `domain:action` — domain-neutral, survives legacy→canonical transition.
 * Complete set defined in authorization.ts; this type mirrors it for type-safety
 * on IdentityContext.permissions.
 */
export type IdentityPermission =
  | 'commercial:read'
  | 'commercial:manage'
  | 'work_order:read'
  | 'work_order:create'
  | 'work_order:update'
  | 'work_order:approve'
  | 'job_order:read'
  | 'job_order:create'
  | 'job_order:assign'
  | 'job_order:update'
  | 'job_order:complete'
  | 'shipment:read'
  | 'shipment:manage'
  | 'customs:read'
  | 'customs:manage'
  | 'warehouse:read'
  | 'warehouse:manage'
  | 'finance:read'
  | 'finance:manage'
  | 'fleet:read'
  | 'fleet:manage'
  | 'customer_visibility:read'
  | 'intelligence:read'
  | 'staff:manage'
  | 'tenant:manage'
  // Pricing override governance (ADR-063)
  | 'pricing:override'
  | 'pricing:approve'
  | 'pricing:read';

/**
 * Trusted server-side identity context.
 * `tenantId` is resolved from authenticated membership/ownership ONLY —
 * it must never originate from a request payload, header, or query parameter.
 */
export interface IdentityContext {
  /** Supabase auth user id. */
  userId: string;
  /** The tenant this identity is authorized to operate on (active tenant). */
  tenantId: string;
  /** Convenience mirror of tenants.tenant_code when available. */
  tenantCode?: string | null;
  /** tenant_users.id when resolved through the staff branch; null for owner branch. */
  membershipId: string | null;
  /** Canonical role code (legacy roles normalized before resolution). */
  role: string;
  /** True when resolved through the tenants.user_id owner branch. */
  isTenantOwner: boolean;
  /** Effective permission set derived from role via the centralized matrix. */
  permissions: IdentityPermission[];
  /** SBU scope for SBU-level roles; null for global/tenant-wide roles. */
  sbuScope: SbuType | null;
}

/** A staff membership row as understood by the resolver (mirrors live tenant_users). */
export interface StaffMembership {
  membershipId: string;
  tenantId: string;
  roleCode: string | null;
}

/** An owned-tenant row as understood by the resolver (mirrors live tenants.user_id link). */
export interface OwnedTenant {
  tenantId: string;
  tenantCode?: string | null;
}

/** All tenants an identity is authorized to operate, plus its active default. */
export interface AuthorizedTenancy {
  active: { tenantId: string; membershipId: string | null; role: string; isTenantOwner: boolean };
  authorizedTenantIds: string[];
}
