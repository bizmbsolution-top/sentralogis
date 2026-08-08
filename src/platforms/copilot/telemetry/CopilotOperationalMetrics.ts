import { TelemetryEvent } from './TelemetryModels';
import { IntentAccuracyMetrics, PipelinePerformanceMetrics } from './DashboardModels';

export class CopilotOperationalMetrics {
  
  static calculateAccuracy(events: TelemetryEvent[]): IntentAccuracyMetrics {
    const resolvedEvents = events.filter(e => e.eventType === 'INTENT_RESOLVED');
    const unknownEvents = events.filter(e => e.eventType === 'INTENT_UNKNOWN');
    
    const total = resolvedEvents.length + unknownEvents.length;
    if (total === 0) {
      return { totalResolutions: 0, successfulMatches: 0, unknownRate: 0, averageConfidence: 0 };
    }

    const successfulMatches = resolvedEvents.length;
    const unknownRate = (unknownEvents.length / total) * 100;

    let totalConfidence = 0;
    for (const e of resolvedEvents) {
      totalConfidence += e.payload.confidence || 0;
    }
    const averageConfidence = successfulMatches > 0 ? totalConfidence / successfulMatches : 0;

    return {
      totalResolutions: total,
      successfulMatches,
      unknownRate,
      averageConfidence
    };
  }

  static calculatePerformance(events: TelemetryEvent[]): PipelinePerformanceMetrics {
    const pipelineEvents = events.filter(e => e.eventType === 'PIPELINE_EXECUTION');
    const fallbackEvents = events.filter(e => e.eventType === 'FALLBACK_TRIGGERED');
    
    const totalPipelines = pipelineEvents.length;
    let fallbackPercentage = 0;
    
    if (totalPipelines > 0) {
      fallbackPercentage = (fallbackEvents.length / totalPipelines) * 100;
    }
    
    let totalTime = 0;
    for (const e of pipelineEvents) {
      totalTime += e.payload.totalDurationMs || 0;
    }
    const averageTotalTimeMs = totalPipelines > 0 ? totalTime / totalPipelines : 0;

    return {
      averageTotalTimeMs,
      averageGeminiTimeMs: 0, // Placeholder
      averageValidationTimeMs: 0, // Placeholder
      fallbackPercentage
    };
  }
}
