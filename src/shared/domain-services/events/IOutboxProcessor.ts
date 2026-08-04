export interface IOutboxProcessor {
  processFailedEvents(): Promise<void>;
  cleanPublishedEvents(olderThanDays: number): Promise<void>;
}
