import { BusinessPolicy } from './BusinessPolicy';

export abstract class AuthorizationPolicy<TContext> implements BusinessPolicy<TContext> {
  abstract isApplicable(context: TContext): boolean;
  abstract evaluate(context: TContext): boolean;
  abstract getFailureMessage(): string;
}
