export type WorkflowDefinition = {
  name: string;
  version: string;
  description: string;
  trigger_on_wo_type: string;
  steps: WorkflowStep[];
};

export type WorkflowStep = {
  id: string;
  name: string;
  description?: string;
  action: string;
  jo_type?: string;
  target_org_type?: string;
  depends_on?: string[];
  conditions?: WorkflowCondition[];
  sla_minutes?: number;
  requires_approval?: boolean;
};

export type WorkflowCondition = {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: unknown;
};

export type WorkflowAction = {
  type: string;
  handler: string;
  config: Record<string, unknown>;
};

import stockTransferDef from './definitions/stock-transfer.json';

export const WORKFLOW_REGISTRY: Record<string, WorkflowDefinition> = {
  'STOCK_TRANSFER': stockTransferDef,
};

export function getWorkflowForWoType(woType: string): WorkflowDefinition | null {
  return WORKFLOW_REGISTRY[woType] || null;
}
