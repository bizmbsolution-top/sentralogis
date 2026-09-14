/**
 * Sentralogis — AI Copilot CONFIRM Stage 3
 * lib/copilot/confirm/confirm-service.ts
 *
 * Canonical CONFIRM boundary.
 *
 * CONFIRM = authorized human actor explicitly approves an existing
 * proposal for later execution.
 *
 * CONFIRM ≠ EXECUTE.
 *
 * This service:
 * 1. Validates server-derived identity (U-01)
 * 2. Asserts authorization (U-02)
 * 3. Delegates lifecycle transition to the canonical ProposalAuthorityService
 * 4. Returns the authoritative proposal in its post-confirmation state
 *
 * It does NOT:
 * - execute any operational mutation
 * - claim execution ownership
 * - burn tokens
 * - call ExecutionService or any domain mutation service
 *
 * Canonical flow:
 *   PROPOSED
 *   → CONFIRM
 *   → CONFIRMED / EXECUTABLE (per canonical lifecycle)
 *   → (later stage) EXECUTE
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import {
  ProposalAuthorityService,
  type AuthoritativeProposal,
} from '@/lib/copilot/propose/proposal-authority-service';

export interface ConfirmRequest {
  proposalNumber: string;
  confirmationNote?: string | null;
}

export interface ConfirmResult {
  proposal: AuthoritativeProposal;
  confirmed: boolean;
  message: string;
}

export class ConfirmService {
  /**
   * Confirm an existing proposal for later execution.
   *
   * Authorization is server-derived from IdentityContext. Tenant
   * isolation is enforced by ProposalAuthorityService (it filters on
   * tenant_id), so a cross-tenant proposal number resolves to a
   * not-found error rather than a successful cross-tenant confirmation.
   */
  static async confirm(
    identity: IdentityContext,
    request: ConfirmRequest,
  ): Promise<ConfirmResult> {
    assertPermission(identity, 'commercial:manage');

    if (!request.proposalNumber) {
      throw new Error('Confirmation denied: proposalNumber is required.');
    }

    const proposal = await ProposalAuthorityService.confirmProposal(
      identity,
      request.proposalNumber,
      request.confirmationNote ?? undefined,
    );

    return {
      proposal,
      confirmed: true,
      message: `Proposal ${proposal.proposal_number} confirmed by ${identity.userId}.`,
    };
  }
}