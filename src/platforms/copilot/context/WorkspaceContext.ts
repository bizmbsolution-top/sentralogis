import { PinnedEntity } from './PinnedEntity';

export class WorkspaceContext {
  private constructor(
    private readonly _activeJob: string | null,
    private readonly _activeDriver: string | null,
    private readonly _activeVehicle: string | null,
    private readonly _activeCustomer: string | null,
    private readonly _activeContainer: string | null,
    private readonly _activeTimeline: string | null,
    private readonly _recentExecutions: string[],
    private readonly _pinnedEntities: Record<string, PinnedEntity>,
    private readonly _notifications: any[]
  ) {}

  static create(props: {
    activeJob?: string | null;
    activeDriver?: string | null;
    activeVehicle?: string | null;
    activeCustomer?: string | null;
    activeContainer?: string | null;
    activeTimeline?: string | null;
    recentExecutions?: string[];
    pinnedEntities?: Record<string, PinnedEntity>;
    notifications?: any[];
  }): WorkspaceContext {
    return new WorkspaceContext(
      props.activeJob || null,
      props.activeDriver || null,
      props.activeVehicle || null,
      props.activeCustomer || null,
      props.activeContainer || null,
      props.activeTimeline || null,
      props.recentExecutions ? [...props.recentExecutions] : [],
      props.pinnedEntities ? { ...props.pinnedEntities } : {},
      props.notifications ? [...props.notifications] : []
    );
  }

  activeJob(): string | null { return this._activeJob || this.resolvePinned('JOBORDER'); }
  activeDriver(): string | null { return this._activeDriver || this.resolvePinned('DRIVER'); }
  activeVehicle(): string | null { return this._activeVehicle || this.resolvePinned('VEHICLE'); }

  resolvePinned(entityType: string): string | null {
    const pinned = this._pinnedEntities[entityType] || this._pinnedEntities[entityType.toUpperCase()];
    return pinned ? pinned.getId() : null;
  }

  hasPinnedEntities(): boolean {
    return Object.keys(this._pinnedEntities).length > 0;
  }

  hasFocus(entityType: string): boolean {
    return this.active(entityType) !== null;
  }

  activeEntity(entityType: string): string | null {
    return this.active(entityType);
  }

  active(entityType: string): string | null {
    const pinned = this.resolvePinned(entityType);
    switch(entityType.toUpperCase()) {
      case 'JOBORDER': return this._activeJob || pinned;
      case 'DRIVER': return this._activeDriver || pinned;
      case 'VEHICLE': return this._activeVehicle || pinned;
      case 'CUSTOMER': return this._activeCustomer || pinned;
      case 'CONTAINER': return this._activeContainer || pinned;
      case 'TIMELINE': return this._activeTimeline || pinned;
      default: return pinned;
    }
  }

  recentExecutions(): string[] { 
    return [...this._recentExecutions]; 
  }

  notifications(): any[] {
    return [...this._notifications];
  }

  // Returns a new immutable copy with the pin applied
  pin(entityType: string, id: string, displayName?: string): WorkspaceContext {
    const entity = PinnedEntity.create({
      id,
      entityType,
      displayName: displayName || id
    });
    return new WorkspaceContext(
      this._activeJob,
      this._activeDriver,
      this._activeVehicle,
      this._activeCustomer,
      this._activeContainer,
      this._activeTimeline,
      this._recentExecutions,
      { ...this._pinnedEntities, [entityType]: entity },
      this._notifications
    );
  }

  // Returns a new immutable copy with the pin removed
  unpin(entityType: string): WorkspaceContext {
    const pinned = { ...this._pinnedEntities };
    delete pinned[entityType];
    return new WorkspaceContext(
      this._activeJob,
      this._activeDriver,
      this._activeVehicle,
      this._activeCustomer,
      this._activeContainer,
      this._activeTimeline,
      this._recentExecutions,
      pinned,
      this._notifications
    );
  }

  focus(entityType: string, id: string): WorkspaceContext {
    return new WorkspaceContext(
      entityType === 'JOBORDER' ? id : this._activeJob,
      entityType === 'DRIVER' ? id : this._activeDriver,
      entityType === 'VEHICLE' ? id : this._activeVehicle,
      entityType === 'CUSTOMER' ? id : this._activeCustomer,
      entityType === 'CONTAINER' ? id : this._activeContainer,
      entityType === 'TIMELINE' ? id : this._activeTimeline,
      this._recentExecutions,
      this._pinnedEntities,
      this._notifications
    );
  }

  focusAll(props: {
    job?: string;
    driver?: string;
    vehicle?: string;
    customer?: string;
    container?: string;
    timeline?: string;
  }): WorkspaceContext {
    return new WorkspaceContext(
      props.job ?? this._activeJob,
      props.driver ?? this._activeDriver,
      props.vehicle ?? this._activeVehicle,
      props.customer ?? this._activeCustomer,
      props.container ?? this._activeContainer,
      props.timeline ?? this._activeTimeline,
      this._recentExecutions,
      this._pinnedEntities,
      this._notifications
    );
  }

  summary(): string {
    return `Workspace - Pinned: ${Object.keys(this._pinnedEntities).join(', ')}`;
  }
}
