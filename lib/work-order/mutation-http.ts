/**
 * Sentralogis — Phase 3 / Unit 2
 * lib/work-order/mutation-http.ts
 *
 * HTTP layer for canonical WO mutations.
 * Maps HTTP requests to mutation commands and returns structured responses.
 *
 * Security invariants:
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - All mutations include tenant_id = context.tenantId.
 * - PK is validated for UUID format before any mutation.
 * - Cross-tenant access is impossible (tenant filters on every mutation).
 * - Audit trail recorded for every mutation.
 * - Idempotency protected where required.
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import type { WorkOrder } from './types';
import { WorkOrderMutationService } from './mutation-service';
import type {
  WoMutationCommand,
  WoCreateInput,
  WoUpdateInput,
  WoTransitionInput,
  WoCancelInput,
  WoCommitmentUpdateInput,
  WoItemUpsertInput,
  JoCreateInput,
  WoMutationResult,
  WoMutationError,
  MutationOutcome,
  MutationStage,
  WoItemUpsertResultItem,
} from './mutation-types';

// ============================================================================
// HTTP REQUEST/RESPONSE TYPES
// ============================================================================

export interface WoMutationHttpRequest {
  command: WoMutationCommand;
  workOrderId?: string;
  input:
    | WoCreateInput
    | WoUpdateInput
    | WoTransitionInput
    | WoCancelInput
    | WoCommitmentUpdateInput
    | WoItemUpsertInput
    | JoCreateInput;
  idempotencyKey?: string;
  reason?: string;
  correlationId?: string;
}

export interface WoMutationHttpResponse {
  success: boolean;
  workOrder?: WorkOrder;
  auditId?: string;
  outcome?: MutationOutcome;
  stages?: MutationStage[];
  items?: WoItemUpsertResultItem[];
  error?: {
    code: string;
    message: string;
    statusCode: number;
  };
}

// ============================================================================
// MUTATION HTTP HANDLER
// ============================================================================

export class WorkOrderMutationHttp {
  /**
   * Handle a WO mutation request.
   */
  static async handleMutation(
    context: IdentityContext,
    request: WoMutationHttpRequest,
  ): Promise<WoMutationHttpResponse> {
    try {
      const result = await this.executeMutation(context, request);

      if (!result.success) {
        return this.mapError(result);
      }

      return {
        success: true,
        workOrder: result.workOrder,
        auditId: result.auditId,
        outcome: result.outcome,
        stages: result.stages,
        items: result.items,
      };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message ?? 'Internal server error.',
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Execute the mutation command.
   */
  private static async executeMutation(
    context: IdentityContext,
    request: WoMutationHttpRequest,
  ): Promise<WoMutationResult> {
    switch (request.command) {
      case 'WO_CREATE':
        return WorkOrderMutationService.create(
          context,
          request.input as WoCreateInput,
          {
            idempotencyKey: request.idempotencyKey,
            reason: request.reason,
            correlationId: request.correlationId,
          },
        );

      case 'WO_UPDATE':
        if (!request.workOrderId) {
          return { success: false, code: 'VALIDATION_FAILED', error: 'workOrderId is required for WO_UPDATE.' };
        }
        return WorkOrderMutationService.update(
          context,
          request.workOrderId,
          request.input as WoUpdateInput,
          {
            idempotencyKey: request.idempotencyKey,
            reason: request.reason,
            correlationId: request.correlationId,
          },
        );

      case 'WO_TRANSITION':
        if (!request.workOrderId) {
          return { success: false, code: 'VALIDATION_FAILED', error: 'workOrderId is required for WO_TRANSITION.' };
        }
        return WorkOrderMutationService.transition(
          context,
          request.workOrderId,
          request.input as WoTransitionInput,
          {
            idempotencyKey: request.idempotencyKey,
            reason: request.reason,
            correlationId: request.correlationId,
          },
        );

      case 'WO_CANCEL':
        if (!request.workOrderId) {
          return { success: false, code: 'VALIDATION_FAILED', error: 'workOrderId is required for WO_CANCEL.' };
        }
        return WorkOrderMutationService.cancel(
          context,
          request.workOrderId,
          request.input as WoCancelInput,
          {
            idempotencyKey: request.idempotencyKey,
            reason: request.reason,
            correlationId: request.correlationId,
          },
        );

      case 'WO_COMMITMENT_UPDATE':
        if (!request.workOrderId) {
          return { success: false, code: 'VALIDATION_FAILED', error: 'workOrderId is required for WO_COMMITMENT_UPDATE.' };
        }
        return WorkOrderMutationService.updateCommitment(
          context,
          request.workOrderId,
          request.input as WoCommitmentUpdateInput,
          {
            idempotencyKey: request.idempotencyKey,
            reason: request.reason,
            correlationId: request.correlationId,
          },
        );

      case 'WO_ITEM_UPSERT':
        return WorkOrderMutationService.woItemUpsert(
          context,
          request.input as WoItemUpsertInput,
          {
            idempotencyKey: request.idempotencyKey,
            reason: request.reason,
            correlationId: request.correlationId,
          },
        );

      case 'JO_CREATE':
        return WorkOrderMutationService.createJobOrder(
          context,
          request.input as JoCreateInput,
          {
            idempotencyKey: request.idempotencyKey,
            reason: request.reason,
            correlationId: request.correlationId,
          },
        );

      default:
        return { success: false, code: 'UNKNOWN_COMMAND', error: `Unknown command: ${request.command}` };
    }
  }

  /**
   * Map mutation error to HTTP response (preserves outcome/stage evidence).
   */
  private static mapError(result: WoMutationResult): WoMutationHttpResponse {
    const errorCode = result.code ?? 'INTERNAL_ERROR';
    const errorMessage = result.error ?? 'Internal error.';
    let statusCode = 400;
    if (errorCode === 'INTERNAL_ERROR' || errorCode === 'DATABASE_ERROR') {
      statusCode = 500;
    } else if (errorCode === 'IDEMPOTENCY_CONFLICT') {
      statusCode = 409;
    } else if (errorCode === 'OPERATION_IN_PROGRESS') {
      statusCode = 425;
    }

    return {
      success: false,
      outcome: result.outcome,
      stages: result.stages,
      items: result.items,
      auditId: result.auditId,
      error: {
        code: errorCode,
        message: errorMessage,
        statusCode,
      },
    };
  }
}