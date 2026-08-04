export interface IDtoMapper<TDomain, Dto> {
  toDto(domain: TDomain): Dto;
  toDomain(dto: Dto): TDomain;
}
