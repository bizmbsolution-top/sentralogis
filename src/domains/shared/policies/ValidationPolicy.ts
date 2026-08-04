import { BusinessPolicy } from './BusinessPolicy';

export abstract class ValidationPolicy<TContext> implements BusinessPolicy<TContext> {
  abstract isApplicable(context: TContext): boolean;
  abstract evaluate(context: TContext): boolean;
  abstract getFailureMessage(): string;
}
