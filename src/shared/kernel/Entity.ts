export abstract class Entity<T> {
  protected readonly _id: string;
  protected readonly _tenantId: string;
  public readonly props: T;

  constructor(props: T, id: string, tenantId: string) {
    this._id = id;
    this._tenantId = tenantId;
    this.props = props;
  }

  get id(): string {
    return this._id;
  }

  get tenantId(): string {
    return this._tenantId;
  }

  public equals(object?: Entity<T>): boolean {
    if (object == null || object == undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    if (!(object instanceof Entity)) {
      return false;
    }

    return this._id === object._id;
  }
}
