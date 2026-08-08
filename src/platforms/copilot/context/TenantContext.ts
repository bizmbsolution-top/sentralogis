export class TenantContext {
  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _timezone: string,
    private readonly _organizationType: string,
    private readonly _subscriptionPlan: string,
    private readonly _enabledFeatures: string[],
    private readonly _settings: Record<string, any>,
    private readonly _metadata: Record<string, any>
  ) {}

  static create(props: {
    id: string;
    name?: string;
    timezone?: string;
    organizationType?: string;
    subscriptionPlan?: string;
    enabledFeatures?: string[];
    settings?: Record<string, any>;
    metadata?: Record<string, any>;
  }): TenantContext {
    return new TenantContext(
      props.id,
      props.name || 'System Tenant',
      props.timezone || 'UTC',
      props.organizationType || 'LOGISTICS',
      props.subscriptionPlan || 'ENTERPRISE',
      props.enabledFeatures || [],
      props.settings || {},
      props.metadata || {}
    );
  }

  getId(): string { return this._id; }
  getName(): string { return this._name; }
  getTimezone(): string { return this._timezone; }
  hasFeature(feature: string): boolean { return this._enabledFeatures.includes(feature); }
  isEnterprise(): boolean { return this._subscriptionPlan === 'ENTERPRISE'; }
  isTrial(): boolean { return this._subscriptionPlan === 'TRIAL'; }
  
  summary(): string {
    return `Tenant [${this._id}] (${this._name}) - ${this._subscriptionPlan}`;
  }
}
