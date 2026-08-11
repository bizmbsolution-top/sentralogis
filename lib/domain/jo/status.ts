/**
 * Centralized job-order status categories used across tracking, assignment, and finance UIs.
 */

export const JO_DONE_STATUSES = [
  'COMPLETED',
  'PEKERJAAN SELESAI',
  'VERIFIED',
  'READY_FOR_BILLING',
  'AWAITING_AUDIT',
  'DONE',
  'INVOICED',
  'PAID',
  'SELESAI', // From legacy
] as const;

export const JO_REJECTED_STATUSES = [
  'REJECTED',
  'HANDOVER_REJECTED',
  'CANCELLED',
] as const;

export const JO_ACTIVE_STATUSES = [
  'IN_PROGRESS',
  'DALAM PERJALANAN',
  'ON_ROAD',
  'ON JOURNEY',
  'ON ROAD',
  'ORDER DITERIMA',
  'ACCEPTED',
  'TIBA DI ASAL',
  'MENUJU ASAL',
  'PICKING_UP',
  'DELIVERING',
  'START JOURNEY',
  'MENUNGGU BERANGKAT',
  'STARTED',
  'LOADING',
  'UNLOADING',
  'DITERIMA',
  'TIBA DI LOKASI MUAT',
  'TIBA DI LOKASI BONGKAR',
  'BERANGKAT DARI LOKASI MUAT',
  'SELESAI BONGKAR',
  'SELESAI' // SELESAI is in HQ ACTIVE array, but also in DONE. We will prioritize DONE in logic
] as const;

export const JO_PENDING_ASSIGNMENT_STATUSES = ['PENDING', 'NEED_ASSIGNMENT', 'NEED_ASSIGN'] as const;

export type JoStatusCategory = 'done' | 'rejected' | 'active' | 'draft' | 'pending' | 'other';

function normalizeStatus(status: string | null | undefined): string {
  return (status || '').toUpperCase().trim();
}

export function categorizeJoStatus(status: string | null | undefined): JoStatusCategory {
  const s = normalizeStatus(status);
  if (!s || s === 'DRAFT') return 'draft';
  if ((JO_REJECTED_STATUSES as readonly string[]).includes(s)) return 'rejected';
  if ((JO_DONE_STATUSES as readonly string[]).includes(s)) return 'done';
  if ((JO_PENDING_ASSIGNMENT_STATUSES as readonly string[]).includes(s)) return 'pending';
  if (
    (JO_ACTIVE_STATUSES as readonly string[]).includes(s) ||
    s.startsWith('TIBA DI') ||
    s.startsWith('MENUJU')
  ) {
    return 'active';
  }
  return 'other';
}

/**
 * Advanced categorization logic used in operational dashboards (HQ & SBU) to distinguish
 * between 'assigned', 'active', 'awaiting', 'completed', and 'rejected'.
 */
export function getAdvancedJobCategory(jo: {
  status?: string;
  driver_response?: string;
  driver_id?: string;
  fleet_id?: string;
  transporter_id?: string;
  vendor_id?: string;
  driver_phone?: string;
}): 'rejected' | 'completed' | 'active' | 'assigned' | 'awaiting' {
  const s = (jo.status || '').toUpperCase();

  // Rejected must come first so they aren't masked by assigned logic
  if ((JO_REJECTED_STATUSES as readonly string[]).includes(s)) return 'rejected';
  if ((JO_DONE_STATUSES as readonly string[]).includes(s)) return 'completed';
  
  // [FIX] Active status ONLY counts if the JO has an actual asset assigned (driver or fleet or transporter)
  // Prevents orphaned JOs (null driver/fleet) from appearing as "On Journey"
  const hasAsset = jo.driver_id || jo.fleet_id || jo.transporter_id || jo.vendor_id || jo.driver_phone;
  // [FIX] driver_response is written at JO creation by saveAssignments (draft AND
  // confirm), so 'accepted' alone must NOT imply an active/on-journey job — a
  // pending/assigned JO with driver_response='accepted' is still waiting to start.
  // "On Journey" is determined by the actual transit status only (JO_ACTIVE_STATUSES
  // / TIBA DI … / MENUJU …), matching the status-based logic on the SBU work-orders page.
  if (hasAsset && ((JO_ACTIVE_STATUSES as readonly string[]).includes(s) || s.startsWith('TIBA DI') || s.startsWith('MENUJU'))) return 'active';
  
  if ((jo.driver_id || jo.fleet_id || jo.transporter_id || jo.vendor_id || jo.driver_phone || s === 'ASSIGNED') && !(JO_DONE_STATUSES as readonly string[]).includes(s) && !(JO_ACTIVE_STATUSES as readonly string[]).includes(s) && !s.startsWith('TIBA DI') && !s.startsWith('MENUJU')) return 'assigned';
  
  return 'awaiting';
}

export function isJoDone(status: string | null | undefined): boolean {
  return categorizeJoStatus(status) === 'done';
}

export function isJoRejected(status: string | null | undefined): boolean {
  return categorizeJoStatus(status) === 'rejected';
}

export function isJoActive(status: string | null | undefined): boolean {
  return categorizeJoStatus(status) === 'active';
}

/**
 * Statuses that are considered terminal (done/rejected/draft) — used to narrow
 * SQL queries before filtering in JS with `isJoTrackableStatus`.
 */
export const JO_TERMINAL_STATUSES = [
  ...JO_DONE_STATUSES,
  ...JO_REJECTED_STATUSES,
  'DRAFT',
] as const;

/**
 * Case-insensitive check for statuses where a fleet's GPS should keep flowing
 * into `job_tracking` (JO-level radar / customer track / GPS report).
 * Covers 'assigned', 'in_progress', and every active variant (MENUJU …,
 * TIBA DI …, DALAM PERJALANAN, ORDER DITERIMA, etc.).
 */
export function isJoTrackableStatus(status: string | null | undefined): boolean {
  const s = normalizeStatus(status);
  if (!s || s === 'DRAFT') return false;
  if ((JO_DONE_STATUSES as readonly string[]).includes(s)) return false;
  if ((JO_REJECTED_STATUSES as readonly string[]).includes(s)) return false;
  if (s === 'ASSIGNED' || s === 'IN_PROGRESS' || s === 'DISPATCHED') return true;
  return categorizeJoStatus(status) === 'active';
}

/** JOs that still occupy fleet/driver on this WO item (not terminal states). */
export function isJoBlockingAsset(status: string | null | undefined): boolean {
  const s = normalizeStatus(status);
  if (!s) return false;
  return !isJoDone(s) && !isJoRejected(s);
}

export function filterActiveJobOrders<T extends { status?: string | null; driver_id?: string | null; fleet_id?: string | null }>(
  rows: T[]
): T[] {
  return rows.filter((jo) => {
    if (!jo.driver_id || !jo.fleet_id) return false;
    const s = normalizeStatus(jo.status);
    if (isJoDone(s) || isJoRejected(s) || s === 'DRAFT') return false;
    return (
      (JO_ACTIVE_STATUSES as readonly string[]).includes(s) ||
      s.startsWith('TIBA DI') ||
      s.startsWith('MENUJU')
    );
  });
}
