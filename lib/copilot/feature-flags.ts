/**
 * Sentralogis — AI Copilot Feature Flags
 * lib/copilot/feature-flags.ts
 *
 * Incremental rollout flags for Copilot EXECUTE → canonical domain wiring.
 * All flags default to false (disabled) per ADR-092.
 *
 * Environment variables:
 * - COPILOT_EXECUTE_ASSIGN_DRIVER=true/false
 * - COPILOT_EXECUTE_REPLACE_DRIVER=true/false
 * - COPILOT_EXECUTE_CANCEL_JOB=true/false
 */

type FeatureFlag = {
  key: string;
  envVar: string;
  description: string;
};

export const COPILOT_FEATURE_FLAGS: Record<string, FeatureFlag> = {
  ASSIGN_DRIVER: {
    key: 'ASSIGN_DRIVER',
    envVar: 'COPILOT_EXECUTE_ASSIGN_DRIVER',
    description: 'Wire ASSIGN_DRIVER to JobOrderAssignmentService',
  },
  REPLACE_DRIVER: {
    key: 'REPLACE_DRIVER',
    envVar: 'COPILOT_EXECUTE_REPLACE_DRIVER',
    description: 'Wire REPLACE_DRIVER to DriverReplacementService',
  },
  CANCEL_JOB: {
    key: 'CANCEL_JOB',
    envVar: 'COPILOT_EXECUTE_CANCEL_JOB',
    description: 'Wire CANCEL_JOB to JobOrderCancellationService',
  },
};

function isFeatureEnabled(envVar: string): boolean {
  const value = process.env[envVar];
  return value === 'true' || value === '1' || value === 'yes';
}

export function isCopilotActionEnabled(action: keyof typeof COPILOT_FEATURE_FLAGS): boolean {
  const flag = COPILOT_FEATURE_FLAGS[action];
  if (!flag) return false;
  return isFeatureEnabled(flag.envVar);
}
