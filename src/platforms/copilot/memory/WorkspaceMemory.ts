import { WorkspaceContext } from '../context/WorkspaceContext';
import { PinnedEntity } from '../context/PinnedEntity';

export class WorkspaceMemory {
  private constructor(private readonly _context: WorkspaceContext) {}

  static from(context: WorkspaceContext): WorkspaceMemory {
    return new WorkspaceMemory(context);
  }

  get activeJob(): string | null {
    return this._context.activeJob();
  }

  get activeDriver(): string | null {
    return this._context.activeDriver();
  }

  get activeVehicle(): string | null {
    return this._context.activeVehicle();
  }
  
  // A customer wasn't formally exported as a getter in WorkspaceContext, but we can query pinned
  get activeCustomer(): string | null {
    return this._context.resolvePinned('CUSTOMER');
  }

  getPinnedEntity(entityType: string): string | null {
    return this._context.resolvePinned(entityType);
  }
}
