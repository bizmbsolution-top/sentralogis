export interface IRetryPolicy {
  shouldRetry(retryCount: number, error: Error): boolean;
  getNextDelayMs(retryCount: number): number;
}
