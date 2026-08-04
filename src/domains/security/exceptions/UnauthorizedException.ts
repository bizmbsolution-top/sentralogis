import { SecurityException } from './SecurityException';

export class UnauthorizedException extends SecurityException {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedException';
  }
}
