export interface PolicyCondition {
  situationId: string;
  reason: string;
  evidence: string[];
}

export interface DecisionPolicy {
  actionIntent: string;
  blockedSituations: PolicyCondition[];
  warningSituations: PolicyCondition[];
  alternativeActions: string[];
  expectedBenefits: string[];
  possibleConsequences: string[];
}

export interface DecisionPolicyResult {
  status: 'ALLOWED' | 'WARNING' | 'REJECTED';
  reason?: string;
  evidence?: string[];
}
