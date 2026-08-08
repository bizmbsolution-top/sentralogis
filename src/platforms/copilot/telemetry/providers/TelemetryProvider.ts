import { TelemetryEvent } from '../TelemetryModels';

export interface TelemetryProvider {
  record(event: TelemetryEvent): void;
  getEvents(): TelemetryEvent[];
  clear(): void;
}
