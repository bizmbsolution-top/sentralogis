export interface DomainToDtoMapper<TDomain, Dto> {
  map(domain: TDomain): Dto;
}
