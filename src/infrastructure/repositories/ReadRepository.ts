import { IReadRepository } from '../../domains/shared/repositories/IReadRepository';

export abstract class ReadRepository<T> implements IReadRepository<T> {
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract exists(id: string): Promise<boolean>;
}
