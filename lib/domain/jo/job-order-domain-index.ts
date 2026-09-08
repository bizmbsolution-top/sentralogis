/**
 * Sentralogis — ADR-091
 * lib/domain/job/index.ts
 *
 * Canonical Job Order domain mutation exports.
 */

export {
  _setJobOrderDbClient,
  type JobOrderDbClient,
  type JobOrder,
  type AssignDriverInput,
  type BatchAssignInput,
  type ReplaceDriverInput,
  type CancelJobOrderInput,
  type JobOrderResult,
  type JobOrderErrorCode,
  JobOrderError,
  JobOrderAssignmentService,
  DriverReplacementService,
  JobOrderCancellationService,
  JobOrderDomainService,
  jobOrderDomainService,
} from './service';
