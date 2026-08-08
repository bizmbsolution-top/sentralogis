import { OperationalInsight } from '../insight/OperationalInsight';
import { DecisionAdvisoryOutput } from '../policy/DecisionAdvisoryEngine';

export interface ExplainabilityData {
  readonly whyProposed: string;
  readonly operationallyWhy: string;
  readonly resolvedEntities: readonly string[];
  readonly whatWasChecked: readonly string[];
  readonly validationsSucceeded: readonly string[];
  readonly whyConfirmationRequired: string;
  readonly warnings: readonly string[];
  readonly blockingErrors: readonly string[];
  readonly insight?: OperationalInsight;
  readonly advisory?: DecisionAdvisoryOutput;
}
