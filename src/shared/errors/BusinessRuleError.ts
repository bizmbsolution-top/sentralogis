import { DomainError } from './DomainError';

export class BusinessRuleError extends DomainError {
  constructor(message: string) {
    super(message, 'BUSINESS_RULE_ERROR');
  }
}
