import { TelemetryEvent, TelemetryPayload } from './TelemetryModels';
import { TelemetryProvider } from './providers/TelemetryProvider';
import { MemoryTelemetryProvider } from './providers/MemoryTelemetryProvider';
import { PipelineContext } from '../pipeline/PipelineModels';

export class CopilotTelemetry {
  private static provider: TelemetryProvider = new MemoryTelemetryProvider();

  static setProvider(provider: TelemetryProvider) {
    this.provider = provider;
  }

  static record(context: PipelineContext, payload: TelemetryPayload) {
    const event: TelemetryEvent = {
      eventId: `evt-${Math.random().toString(36).substring(2, 9)}`,
      pipelineId: context.pipelineId,
      sessionId: context.context.conversation.getConversationId(),
      tenantId: context.context.tenant.id,
      userId: context.context.user.id,
      correlationId: context.correlationId,
      timestamp: Date.now(),
      ...payload
    };
    
    this.provider.record(event);
  }

  static getEvents(): TelemetryEvent[] {
    return this.provider.getEvents();
  }

  static clear() {
    this.provider.clear();
  }
}
