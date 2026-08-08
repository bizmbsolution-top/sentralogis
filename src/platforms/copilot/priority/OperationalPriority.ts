import { OperationalInsight } from '../insight/OperationalInsight';

export type PriorityLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface OperationalPriority {
  jobOrderId: string;
  priorityLevel: PriorityLevel;
  priorityScore: number; // 0-100 deterministic scoring
  operationalReason: string;
  insight: OperationalInsight;
  requiresImmediateAttention: boolean;
  generatedFrom: 'ENGINE' | 'MANUAL_ESCALATION';
}
