export interface ValueObjectFactory<TValueObject, TProps> {
  create(props: TProps): TValueObject;
}
