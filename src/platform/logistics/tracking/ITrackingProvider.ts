import { Result } from '../../../shared/kernel/Result';
import { Telemetry } from './Telemetry';
export interface ITrackingProvider<TEntity> {
  recordTelemetry(entityId: string, telemetry: Readonly<Telemetry>): Result<void>;
  getHistory(entityId: string): Result<ReadonlyArray<Telemetry>>;
}
