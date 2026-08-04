export interface PersistenceToDomainMapper<TRow, TDomain> {
  map(row: TRow): TDomain;
}
