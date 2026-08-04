import { Result } from '../../../shared/kernel/Result';
import { AuditEntry } from './AuditEntry';
export interface IAuditProvider<TEntity> {
  log(entry: Readonly<AuditEntry<TEntity>>): Result<void>;
}
