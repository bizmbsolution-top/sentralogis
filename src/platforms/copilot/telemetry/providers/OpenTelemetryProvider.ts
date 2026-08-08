import { TelemetryEvent } from '../TelemetryModels';
import { TelemetryProvider } from './TelemetryProvider';

export class OpenTelemetryProvider implements TelemetryProvider {
  record(event: TelemetryEvent): void {
    // In production, this would format the event to OTLP and send to DataDog, NewRelic, etc.
  }

  getEvents(): TelemetryEvent[] {
    return [];
  }

  clear(): void {}
}
