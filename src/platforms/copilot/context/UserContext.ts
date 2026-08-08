export class UserContext {
  private constructor(
    private readonly _id: string,
    private readonly _displayName: string,
    private readonly _email: string,
    private readonly _roles: string[],
    private readonly _permissions: string[],
    private readonly _avatar: string,
    private readonly _department: string,
    private readonly _language: string
  ) {}

  static create(props: {
    id: string;
    displayName?: string;
    email?: string;
    roles?: string[];
    permissions?: string[];
    avatar?: string;
    department?: string;
    language?: string;
  }): UserContext {
    return new UserContext(
      props.id,
      props.displayName || 'System User',
      props.email || 'system@sentralogis.com',
      props.roles || [],
      props.permissions || [],
      props.avatar || '',
      props.department || 'OPERATIONS',
      props.language || 'id'
    );
  }

  getId(): string { return this._id; }
  getDisplayName(): string { return this._displayName; }
  hasRole(role: string): boolean { return this._roles.includes(role); }
  getPermissions(): string[] { return [...this._permissions]; } // Return copy
  
  summary(): string {
    return `User [${this._id}] (${this._displayName}) - ${this._department}`;
  }
}
