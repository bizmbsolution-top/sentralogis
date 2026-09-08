/**
 * Sentralogis — Phase 4B-2 / U-04
 * lib/application/commercial-work-orders/index.ts
 *
 * Barrel export for the Commercial Work Order application boundary.
 */

export type {
  CreateWorkOrderCommand,
  CreateWorkOrderResult,
  ListWorkOrdersFilters,
  ListWorkOrdersResult,
  WorkOrderView,
  WorkOrderErrorCode,
} from './types';
export { PROTECTED_COMMAND_FIELDS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, WorkOrderError } from './types';

export { parseCreateCommand, parseListFilters } from './validation';
export type { WorkOrderRepository, WorkOrderRow } from './repository';
export { supabaseWorkOrderRepository, _setWorkOrderRepository } from './repository';
export { createWorkOrder, getWorkOrder, listWorkOrders } from './service';
export { toErrorResponse } from './http';
