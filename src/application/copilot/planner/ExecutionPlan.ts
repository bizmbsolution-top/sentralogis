import { ExecutionRisk } from './ExecutionRisk';
import { ExecutionStep } from './ExecutionStep';

export interface ExplainabilityMetadata {
  whyProposed: string;
  resolvedEntities: string[];
  permissionsRequired: string[];
  validationsSucceeded: string[];
  whyConfirmationRequired: string;
}

export interface ExecutionPlan {
  intent: string;
  targetEntity?: { type: string; id: string };
  relatedEntities: Record<string, { type: string; id: string }>;
  validationStatus: 'PENDING' | 'PASS' | 'FAIL';
  requiredPermissions: string[];
  riskLevel: ExecutionRisk;
  steps: ExecutionStep[];
  confirmationRequirements: string[];
  executionPayload: Record<string, any>;
  explainabilityMetadata: ExplainabilityMetadata;
  isReadyForExecution: boolean;
}

