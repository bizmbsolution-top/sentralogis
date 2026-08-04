import { TruckingJobOrder } from '../aggregates/TruckingJobOrder';
import { TripTelemetry } from '../aggregates/TripTelemetry';

export interface ITruckingJobRepository {
  findById(id: string): Promise<TruckingJobOrder | null>;
  save(jobOrder: TruckingJobOrder): Promise<void>;
  
  findTelemetryByJobId(jobOrderId: string): Promise<TripTelemetry | null>;
  saveTelemetry(telemetry: TripTelemetry): Promise<void>;
}
