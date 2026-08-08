import { TelemetryEvent } from '../TelemetryModels';
import { TelemetryProvider } from './TelemetryProvider';

export class MemoryTelemetryProvider implements TelemetryProvider {
  private events: TelemetryEvent[] = [];

  record(event: TelemetryEvent): void {
    this.events.push(event);
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
