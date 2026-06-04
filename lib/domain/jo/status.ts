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
}): 'rejected' | 'completed' | 'active' | 'assigned' | 'awaiting' {
  const s = (jo.status || '').toUpperCase();
  const dr = (jo.driver_response || '').toLowerCase();

  // Rejected must come first so they aren't masked by assigned logic
  if ((JO_REJECTED_STATUSES as readonly string[]).includes(s)) return 'rejected';
  if ((JO_DONE_STATUSES as readonly string[]).includes(s)) return 'completed';
  
  if ((JO_ACTIVE_STATUSES as readonly string[]).includes(s) || dr === 'accepted' || s.startsWith('TIBA DI') || s.startsWith('MENUJU')) return 'active';
  
  if (jo.driver_id && jo.fleet_id && !(JO_DONE_STATUSES as readonly string[]).includes(s) && !(JO_ACTIVE_STATUSES as readonly string[]).includes(s) && !s.startsWith('TIBA DI') && !s.startsWith('MENUJU')) return 'assigned';
  
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
