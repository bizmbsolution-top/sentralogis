import { AggregateRoot } from '../kernel/AggregateRoot';

export interface IRepository<T extends AggregateRoot<any>> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
  update(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
}
