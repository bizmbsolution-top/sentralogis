export interface IReadRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  exists(id: string): Promise<boolean>;
}
