import { DomainError } from './DomainError';

export class PermissionError extends DomainError {
  constructor(message: string) {
    super(message, 'PERMISSION_ERROR');
  }
}
