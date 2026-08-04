export interface DomainToPersistenceMapper<TDomain, TRow> {
  map(domain: TDomain): TRow;
}
