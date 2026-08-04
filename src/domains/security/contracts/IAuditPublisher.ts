export interface IAuditPublisher {
  publish(event: any): Promise<void>;
}
