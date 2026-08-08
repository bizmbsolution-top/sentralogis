import { TelemetryEvent } from '../TelemetryModels';
import { TelemetryProvider } from './TelemetryProvider';

export class SupabaseTelemetryProvider implements TelemetryProvider {
  record(event: TelemetryEvent): void {
    // In production, this would use the Supabase client to insert into a 'copilot_telemetry' table.
    // e.g. supabase.from('copilot_telemetry').insert([event]);
  }

  getEvents(): TelemetryEvent[] {
    return [];
  }

  clear(): void {}
}
