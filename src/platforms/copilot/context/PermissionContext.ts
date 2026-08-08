export class PermissionContext {
  private constructor(private readonly _permissions: Set<string>) {}

  static create(permissions: string[]): PermissionContext {
    return new PermissionContext(new Set(permissions));
  }

  has(permission: string): boolean {
    return this._permissions.has(permission);
  }

  hasAll(permissions: string[]): boolean {
    return permissions.every(p => this.has(p));
  }

  hasAny(permissions: string[]): boolean {
    return permissions.some(p => this.has(p));
  }

  missing(permissions: string[]): string[] {
    return permissions.filter(p => !this.has(p));
  }

  explain(permission: string): string {
    return this.has(permission) 
      ? `Permission '${permission}' is GRANTED.`
      : `Permission '${permission}' is DENIED.`;
  }

  summary(): string {
    return `Granted ${this._permissions.size} permissions`;
  }
}
