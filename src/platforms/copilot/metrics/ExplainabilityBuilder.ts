import { ExplainabilityData } from './ExplainabilityData';
import { OperationalInsight } from '../insight/OperationalInsight';
import { DecisionAdvisoryOutput } from '../policy/DecisionAdvisoryEngine';

export class ExplainabilityBuilder {
  private _whyProposed: string = '';
  private _operationallyWhy: string = 'No anomalous operational context detected.';
  private _resolvedEntities: string[] = [];
  private _whatWasChecked: string[] = [];
  private _validationsSucceeded: string[] = [];
  private _whyConfirmationRequired: string = '';
  private _warnings: string[] = [];
  private _blockingErrors: string[] = [];
  private _insight?: OperationalInsight;
  private _advisory?: DecisionAdvisoryOutput;

  static create(): ExplainabilityBuilder {
    return new ExplainabilityBuilder();
  }

  setProposedReason(reason: string): this {
    this._whyProposed = reason;
    return this;
  }

  setOperationalReason(reason: string): this {
    this._operationallyWhy = reason;
    return this;
  }

  setConfirmationReason(reason: string): this {
    this._whyConfirmationRequired = reason;
    return this;
  }

  setResolvedEntities(entities: readonly string[]): this {
    this._resolvedEntities = [...entities];
    return this;
  }

  setWhatWasChecked(checks: readonly string[]): this {
    this._whatWasChecked = [...checks];
    return this;
  }

  setValidationsSucceeded(succeeded: readonly string[]): this {
    this._validationsSucceeded = [...succeeded];
    return this;
  }

  addWarning(warning: string): this {
    this._warnings.push(warning);
    return this;
  }

  addWarnings(warnings: readonly string[]): this {
    this._warnings.push(...warnings);
    return this;
  }

  addBlockingErrors(errors: readonly string[]): this {
    this._blockingErrors.push(...errors);
    return this;
  }

  setInsight(insight?: OperationalInsight): this {
    this._insight = insight;
    return this;
  }

  setAdvisory(advisory?: DecisionAdvisoryOutput): this {
    this._advisory = advisory;
    return this;
  }

  build(): ExplainabilityData {
    return Object.freeze({
      whyProposed: this._whyProposed,
      operationallyWhy: this._operationallyWhy,
      resolvedEntities: Object.freeze([...this._resolvedEntities]),
      whatWasChecked: Object.freeze([...this._whatWasChecked]),
      validationsSucceeded: Object.freeze([...this._validationsSucceeded]),
      whyConfirmationRequired: this._whyConfirmationRequired,
      warnings: Object.freeze([...this._warnings]),
      blockingErrors: Object.freeze([...this._blockingErrors]),
      insight: this._insight,
      advisory: this._advisory
    });
  }
}
