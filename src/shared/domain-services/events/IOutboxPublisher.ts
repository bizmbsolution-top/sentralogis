export interface IOutboxPublisher {
  publishPendingEvents(): Promise<void>;
}
