export interface IIntegrationEventPublisher {
  publish(topic: string, payload: any): Promise<void>;
}
