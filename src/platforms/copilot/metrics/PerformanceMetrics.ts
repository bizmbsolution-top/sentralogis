export interface CopilotMetrics {
  intentResolutionMs: number;
  entityResolutionMs: number;
  validationMs: number;
  planningMs: number;
  totalResponseMs: number;
}

export class PerformanceMetrics {
  private startTime: number = 0;
  private metrics: Partial<CopilotMetrics> = {};

  start(): void {
    this.startTime = performance.now();
  }

  record(phase: keyof CopilotMetrics, duration: number): void {
    this.metrics[phase] = duration;
  }

  finish(): CopilotMetrics {
    this.metrics.totalResponseMs = performance.now() - this.startTime;
    
    // Log in development
    console.debug('[Copilot Metrics]', this.metrics);
    
    return this.metrics as CopilotMetrics;
  }
}
