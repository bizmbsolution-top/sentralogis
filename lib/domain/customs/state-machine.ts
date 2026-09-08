/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/state-machine.ts
 * Description: Canonical Customs Declaration Lifecycle State Machine
 */

import { CustomsDeclarationStatus } from './types';
import { InvalidDeclarationStateError } from './errors';

export class CustomsStateMachine {
  private static readonly TRANSITION_GRAPH: Record<CustomsDeclarationStatus, CustomsDeclarationStatus[]> = {
    DRAFT: ['DOCUMENTS_PENDING', 'READY_FOR_CLASSIFICATION', 'CLASSIFIED', 'CANCELLED'],
    DOCUMENTS_PENDING: ['READY_FOR_CLASSIFICATION', 'CLASSIFIED', 'ON_HOLD', 'CANCELLED'],
    READY_FOR_CLASSIFICATION: ['CLASSIFIED', 'ON_HOLD', 'CANCELLED'],
    CLASSIFIED: ['READY_FOR_SUBMISSION', 'SUBMITTED', 'ON_HOLD', 'CANCELLED'],
    READY_FOR_SUBMISSION: ['SUBMITTED', 'ON_HOLD', 'CANCELLED'],
    SUBMITTED: ['ACCEPTED', 'REJECTED', 'CHANNEL_ASSIGNED', 'ON_HOLD'],
    ACCEPTED: [
      'CHANNEL_ASSIGNED',
      'INSPECTION_REQUIRED',
      'DOCUMENT_REVIEW',
      'APPROVED',
      'ON_HOLD'
    ],
    CHANNEL_ASSIGNED: [
      'INSPECTION_REQUIRED',
      'DOCUMENT_REVIEW',
      'APPROVED',
      'REJECTED',
      'ON_HOLD'
    ],
    INSPECTION_REQUIRED: ['APPROVED', 'REJECTED', 'ON_HOLD'],
    DOCUMENT_REVIEW: ['APPROVED', 'REJECTED', 'ON_HOLD'],
    APPROVED: ['SPPB_PENDING', 'RELEASED', 'ON_HOLD'],
    SPPB_PENDING: ['RELEASED', 'ON_HOLD'],
    RELEASED: ['COMPLETED'],
    ON_HOLD: [
      'DRAFT',
      'DOCUMENTS_PENDING',
      'READY_FOR_CLASSIFICATION',
      'CLASSIFIED',
      'READY_FOR_SUBMISSION',
      'SUBMITTED',
      'ACCEPTED',
      'CHANNEL_ASSIGNED',
      'INSPECTION_REQUIRED',
      'DOCUMENT_REVIEW',
      'APPROVED',
      'SPPB_PENDING',
      'CANCELLED'
    ],
    REJECTED: ['DRAFT', 'CANCELLED'],
    COMPLETED: [], // Terminal State
    CANCELLED: []  // Terminal State
  };

  /**
   * Checks if transition is valid
   */
  public static canTransition(
    currentStatus: CustomsDeclarationStatus,
    targetStatus: CustomsDeclarationStatus
  ): boolean {
    if (currentStatus === targetStatus) return true;
    const allowed = this.TRANSITION_GRAPH[currentStatus] || [];
    return allowed.includes(targetStatus);
  }

  /**
   * Asserts valid transition or throws InvalidDeclarationStateError
   */
  public static assertTransition(
    currentStatus: CustomsDeclarationStatus,
    targetStatus: CustomsDeclarationStatus
  ): void {
    if (currentStatus === targetStatus) return;
    const allowed = this.TRANSITION_GRAPH[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new InvalidDeclarationStateError(currentStatus, targetStatus, allowed);
    }
  }

  /**
   * Returns allowed next statuses
   */
  public static getAllowedNextStatuses(status: CustomsDeclarationStatus): CustomsDeclarationStatus[] {
    return this.TRANSITION_GRAPH[status] || [];
  }
}
