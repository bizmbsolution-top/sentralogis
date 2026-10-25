/**
 * Sentralogis — Phase 3 / Unit 2
 * components/work-order/mutation/
 *
 * Canonical UI mutation controls for Phase 3 Unit 2.
 *
 * Security invariants:
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - All mutations include tenant_id = context.tenantId.
 * - PK is validated for UUID format before any mutation.
 * - Cross-tenant access is impossible (tenant filters on every mutation).
 * - Audit trail recorded for every mutation.
 * - Idempotency protected where required.
 * - UI mutation boundary: extend existing canonical operational workspace.
 * - No direct DB mutations from UI.
 * - No shadow tables.
 * - No second operational engines.
 * - No direct SO/FL/OH → JO writes.
 * - No driver/GPS/inventory/CEISA mutations.
 * - No client business-number generators.
 * - 100% server-derived tenant isolation.
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { WoMutationCommand, WoCreateInput, WoUpdateInput, WoTransitionInput, WoCancelInput, WoCommitmentUpdateInput } from '@/lib/work-order/mutation-types';

// ============================================================================
// TYPES
// ============================================================================

interface MutationControlsProps {
  workOrderId?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
}

interface MutationState {
  loading: boolean;
  error: string | null;
  lastResult: any;
}

// ============================================================================
// HOOK: useWorkOrderMutation
// ============================================================================

export function useWorkOrderMutation() {
  const [state, setState] = useState<MutationState>({
    loading: false,
    error: null,
    lastResult: null,
  });

  const mutate = useCallback(async (
    command: WoMutationCommand,
    input: WoCreateInput | WoUpdateInput | WoTransitionInput | WoCancelInput | WoCommitmentUpdateInput,
    options?: { idempotencyKey?: string; reason?: string; correlationId?: string },
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const body: any = { command, input };
      if (options?.idempotencyKey) body.idempotencyKey = options.idempotencyKey;
      if (options?.reason) body.reason = options.reason;
      if (options?.correlationId) body.correlationId = options.correlationId;

      const response = await fetch('/api/v1/operational/work-orders/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        setState({ loading: false, error: result.error?.message ?? 'Mutation failed.', lastResult: null });
        return result;
      }

      setState({ loading: false, error: null, lastResult: result });
      return result;
    } catch (err: any) {
      setState({ loading: false, error: err.message ?? 'Internal error.', lastResult: null });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: err.message ?? 'Internal error.', statusCode: 500 } };
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, lastResult: null });
  }, []);

  return { ...state, mutate, reset };
}

// ============================================================================
// COMPONENT: WorkOrderMutationControls
// ============================================================================

export function WorkOrderMutationControls({ workOrderId, onSuccess, onError }: MutationControlsProps) {
  const { mutate, loading, error, lastResult, reset } = useWorkOrderMutation();
  const router = useRouter();

  const handleCreate = useCallback(async (input: WoCreateInput) => {
    // SO-Mandatory Slice 1 (L3-1/L3-2): stable caller-supplied idempotency key,
    // derived from the logical command identity so retries reuse the SAME key.
    const result = await mutate('WO_CREATE', input, {
      idempotencyKey: `wo-create-${input.woNumber}`,
    });
    if (result.success) {
      onSuccess?.(result);
      router.refresh();
    } else {
      onError?.(result.error);
    }
  }, [mutate, onSuccess, onError, router]);

  const handleUpdate = useCallback(async (input: WoUpdateInput) => {
    if (!workOrderId) return;
    const result = await mutate('WO_UPDATE', input);
    if (result.success) {
      onSuccess?.(result);
      router.refresh();
    } else {
      onError?.(result.error);
    }
  }, [mutate, onSuccess, onError, router, workOrderId]);

  const handleTransition = useCallback(async (input: WoTransitionInput) => {
    if (!workOrderId) return;
    const result = await mutate('WO_TRANSITION', input);
    if (result.success) {
      onSuccess?.(result);
      router.refresh();
    } else {
      onError?.(result.error);
    }
  }, [mutate, onSuccess, onError, router, workOrderId]);

  const handleCancel = useCallback(async (input: WoCancelInput) => {
    if (!workOrderId) return;
    const result = await mutate('WO_CANCEL', input);
    if (result.success) {
      onSuccess?.(result);
      router.refresh();
    } else {
      onError?.(result.error);
    }
  }, [mutate, onSuccess, onError, router, workOrderId]);

  const handleCommitmentUpdate = useCallback(async (input: WoCommitmentUpdateInput) => {
    if (!workOrderId) return;
    const result = await mutate('WO_COMMITMENT_UPDATE', input);
    if (result.success) {
      onSuccess?.(result);
      router.refresh();
    } else {
      onError?.(result.error);
    }
  }, [mutate, onSuccess, onError, router, workOrderId]);

  return {
    loading,
    error,
    lastResult,
    reset,
    handleCreate,
    handleUpdate,
    handleTransition,
    handleCancel,
    handleCommitmentUpdate,
  };
}