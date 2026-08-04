import { SecurityException } from './SecurityException';

export class ForbiddenException extends SecurityException {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN');
    this.name = 'ForbiddenException';
  }
}
