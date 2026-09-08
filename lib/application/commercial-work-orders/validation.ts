/**
 * Sentralogis — Phase 4B-2 / U-04
 * lib/application/commercial-work-orders/validation.ts
 *
 * Pure request validation — rejects malformed/protected commands BEFORE any
 * database mutation or engagement resolution (mandate §28).
 */

import type { EngagementStatus } from '@/lib/application/engagement/types';
import {
  CreateWorkOrderCommand,
  ListWorkOrdersFilters,
  WorkOrderError,
  PROTECTED_COMMAND_FIELDS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from './types';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_RE = /^[A-Z]{3}$/;
const ALL_STATUSES: readonly string[] = [
  'DRAFT', 'SUBMITTED', 'CONFIRMED', 'IN_EXECUTION',
  'FULFILLED', 'BILLED', 'CLOSED', 'CANCELLED',
];

/**
 * Parse and validate a POST body into a CreateWorkOrderCommand.
 *
 * @throws {WorkOrderError} 400 VALIDATION_FAILED on protected fields,
 *         malformed identifiers, bad dates, bad currency, or unknown shape.
 */
export function parseCreateCommand(body: unknown): CreateWorkOrderCommand {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new WorkOrderError('VALIDATION_FAILED', 400, 'Request body must be a JSON object.');
  }

  const raw = body as Record<string, unknown>;

  // ---- Protected-field rejection (mandate §8/§10) ----
  const forbidden = PROTECTED_COMMAND_FIELDS.filter(k => k in raw);
  if (forbidden.length > 0) {
    throw new WorkOrderError(
      'VALIDATION_FAILED',
      400,
      `Protected fields are not client-writable: ${forbidden.join(', ')}.`,
      forbidden,
    );
  }

  const errors: string[] = [];

  // ---- customerId (required) ----
  const customerId = typeof raw.customerId === 'string' ? raw.customerId.trim() : '';
  if (!customerId) errors.push('customerId is required.');
  else if (!UUID_RE.test(customerId)) errors.push('customerId must be a valid UUID.');

  // ---- engagementId (optional explicit reference) ----
  let engagementId: string | undefined;
  if (raw.engagementId !== undefined && raw.engagementId !== null) {
    const v = typeof raw.engagementId === 'string' ? raw.engagementId.trim() : '';
    if (!v || !UUID_RE.test(v)) errors.push('engagementId must be a valid UUID when supplied.');
    else engagementId = v;
  }

  // ---- contractReference ----
  let contractReference: string | undefined;
  if (raw.contractReference !== undefined && raw.contractReference !== null) {
    if (typeof raw.contractReference !== 'string') errors.push('contractReference must be a string.');
    else {
      const v = raw.contractReference.trim();
      if (v.length > 128) errors.push('contractReference must be at most 128 characters.');
      else contractReference = v || undefined;
    }
  }

  // ---- targetFulfillmentDate ----
  let targetFulfillmentDate: string | undefined;
  if (raw.targetFulfillmentDate !== undefined && raw.targetFulfillmentDate !== null) {
    if (typeof raw.targetFulfillmentDate !== 'string' || !DATE_RE.test(raw.targetFulfillmentDate)) {
      errors.push('targetFulfillmentDate must be an ISO date (YYYY-MM-DD).');
    } else targetFulfillmentDate = raw.targetFulfillmentDate;
  }

  // ---- currency ----
  let currency: string | undefined;
  if (raw.currency !== undefined && raw.currency !== null) {
    if (typeof raw.currency !== 'string' || !CURRENCY_RE.test(raw.currency.trim())) {
      errors.push('currency must be a 3-letter ISO code (e.g. IDR).');
    } else currency = raw.currency.trim();
  }

  // ---- commercialNotes ----
  let commercialNotes: string | undefined;
  if (raw.commercialNotes !== undefined && raw.commercialNotes !== null) {
    if (typeof raw.commercialNotes !== 'string') errors.push('commercialNotes must be a string.');
    else {
      const v = raw.commercialNotes.trim();
      if (v.length > 2000) errors.push('commercialNotes must be at most 2000 characters.');
      else commercialNotes = v || undefined;
    }
  }

  if (errors.length > 0) {
    throw new WorkOrderError('VALIDATION_FAILED', 400, errors.join(' '), errors);
  }

  return { customerId, engagementId, contractReference, targetFulfillmentDate, currency, commercialNotes };
}

/**
 * Parse GET query parameters into validated list filters.
 *
 * @throws {WorkOrderError} 400 on invalid UUID/status/date/pagination values.
 */
export function parseListFilters(searchParams: URLSearchParams): ListWorkOrdersFilters {
  const errors: string[] = [];

  let customerId: string | undefined;
  const rawCustomer = searchParams.get('customerId');
  if (rawCustomer) {
    if (!UUID_RE.test(rawCustomer.trim())) errors.push('customerId must be a valid UUID.');
    else customerId = rawCustomer.trim();
  }

  let statuses: EngagementStatus[] | undefined;
  const rawStatuses = searchParams.getAll('status').flatMap(s => s.split(',')).map(s => s.trim()).filter(Boolean);
  if (rawStatuses.length > 0) {
    const invalid = rawStatuses.filter(s => !ALL_STATUSES.includes(s));
    if (invalid.length > 0) errors.push(`Unknown status value(s): ${invalid.join(', ')}.`);
    else statuses = rawStatuses as EngagementStatus[];
  }

  let dateFrom: string | undefined;
  const rawFrom = searchParams.get('dateFrom');
  if (rawFrom) {
    if (!DATE_RE.test(rawFrom.trim())) errors.push('dateFrom must be an ISO date (YYYY-MM-DD).');
    else dateFrom = rawFrom.trim();
  }

  let dateTo: string | undefined;
  const rawTo = searchParams.get('dateTo');
  if (rawTo) {
    if (!DATE_RE.test(rawTo.trim())) errors.push('dateTo must be an ISO date (YYYY-MM-DD).');
    else dateTo = rawTo.trim();
  }

  let limit = DEFAULT_PAGE_SIZE;
  const rawLimit = searchParams.get('limit');
  if (rawLimit !== null) {
    const n = Number(rawLimit);
    if (!Number.isInteger(n) || n < 1 || n > MAX_PAGE_SIZE) {
      errors.push(`limit must be an integer between 1 and ${MAX_PAGE_SIZE}.`);
    } else limit = n;
  }

  let offset = 0;
  const rawOffset = searchParams.get('offset');
  if (rawOffset !== null) {
    const n = Number(rawOffset);
    if (!Number.isInteger(n) || n < 0) errors.push('offset must be a non-negative integer.');
    else offset = n;
  }

  if (errors.length > 0) {
    throw new WorkOrderError('VALIDATION_FAILED', 400, errors.join(' '), errors);
  }

  return { customerId, statuses, dateFrom, dateTo, limit, offset };
}
