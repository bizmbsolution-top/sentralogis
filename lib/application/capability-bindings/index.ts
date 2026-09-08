/**
 * Sentralogis — Phase 4B-4 / U-06
 * lib/application/capability-bindings/index.ts
 */

export type {
  CapabilityBindingStatusPatch,
  CapabilityBindingView,
  TransitionResult,
  BindingLifecycleErrorCode,
} from './types';
export {
  BINDING_STATUSES,
  EVENT_NAME_BY_STATUS,
  FORBIDDEN_PATCH_FIELDS,
  BindingLifecycleError,
} from './types';

export type {
  BindingRow,
  BindingLifecycleRepository,
  TransitionAtomicParams,
  TransitionAtomicResult,
} from './repository';
export {
  supabaseBindingLifecycleRepository,
  _setBindingLifecycleRepository,
} from './repository';

export { transitionBinding, parseLifecyclePatch } from './service';
export { toLifecycleErrorResponse } from './http';
