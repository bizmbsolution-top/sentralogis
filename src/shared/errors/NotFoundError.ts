import { DomainError } from './DomainError';

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message, 'NOT_FOUND_ERROR');
  }
}
