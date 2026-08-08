import { OperationalSituation } from '../knowledge/OperationalSituation';

export interface OperationalInsight {
  situation: OperationalSituation;
  operationalSummary: string;
  businessImpact: string[];
  customerImpact: string[];
  slaRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  operationalHealth: 'HEALTHY' | 'ATTENTION' | 'DELAYED' | 'CRITICAL';
  recommendedAttention: string;
  recommendedActions: string[];
  confidence: number;
  generatedFrom: 'TIMELINE' | 'TRACKING' | 'MANUAL';
  supportingEvidence: string[];
}
