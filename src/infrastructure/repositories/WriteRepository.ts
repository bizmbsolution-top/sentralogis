import { IWriteRepository } from '../../domains/shared/repositories/IWriteRepository';

export abstract class WriteRepository<T> implements IWriteRepository<T> {
  abstract save(entity: T): Promise<void>;
  abstract update(entity: T): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
