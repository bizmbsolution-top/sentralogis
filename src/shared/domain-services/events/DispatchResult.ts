export interface DispatchResult {
  success: boolean;
  dispatcherName: string;
  latencyMs: number;
  retryCount: number;
  error?: string;
  publishedAt?: Date;
}
