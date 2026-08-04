export interface BusinessPolicy<TContext> {
  isApplicable(context: TContext): boolean;
  evaluate(context: TContext): boolean;
  getFailureMessage(): string;
}
