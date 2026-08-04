import { IRepository } from '../../domains/shared/repositories/IRepository';

export abstract class AbstractRepository<T> implements IRepository<T> {
  abstract findById(id: string): Promise<T | null>;
  abstract save(entity: T): Promise<void>;
  abstract update(entity: T): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
