export interface IEventPublisher {
  publish(event: any): Promise<void>;
}
