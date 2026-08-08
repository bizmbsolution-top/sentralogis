import { EntityResolutionResult } from '../intelligence/entities/models';
import { OperationalContext } from '../context/OperationalContext';

export interface ExecutionResult {
  status: 'SUCCESS' | 'FAILED';
  message: string;
  durationMs: number;
  timelineUpdates: string[];
}

export class ExecutionEngine {
  /**
   * MOCK IMPLEMENTATION
   * Calls the underlying Application Service for the specified intent.
   * NEVER bypasses the Application Service.
   */
  static async executePlan(
    intent: string,
    resolvedEntities: EntityResolutionResult,
    context: OperationalContext
  ): Promise<ExecutionResult> {
    
    const startTime = Date.now();

    // Mock invoking the JobOrderService
    if (intent === 'ASSIGN_DRIVER') {
      const driver = resolvedEntities.resolve('Driver')?.displayName || 'Unknown Driver';
      const jobOrder = resolvedEntities.resolve('JobOrder')?.displayName || 'Unknown Job Order';
      
      return {
        status: 'SUCCESS',
        message: `Successfully assigned ${driver} to ${jobOrder}.`,
        durationMs: Date.now() - startTime + 312, // mock latency
        timelineUpdates: [
          `Updated Job Order ${jobOrder} state`,
          `Dispatched PWA notification to Driver`,
          `Active Context refreshed`
        ]
      };
    }

    return {
      status: 'FAILED',
      message: `No application service mapped for intent: ${intent}`,
      durationMs: Date.now() - startTime,
      timelineUpdates: []
    };
  }
}
