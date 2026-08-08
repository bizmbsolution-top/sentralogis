export interface IntentAccuracyMetrics {
  totalResolutions: number;
  successfulMatches: number;
  unknownRate: number;
  averageConfidence: number;
}

export interface PipelinePerformanceMetrics {
  averageTotalTimeMs: number;
  averageGeminiTimeMs: number;
  averageValidationTimeMs: number;
  fallbackPercentage: number;
}

export interface IntentFrequency {
  intentId: string;
  count: number;
}

export interface AIObservabilityDashboard {
  intentAccuracy: IntentAccuracyMetrics;
  performance: PipelinePerformanceMetrics;
  topIntents: IntentFrequency[];
  recentValidationFailures: number;
}
