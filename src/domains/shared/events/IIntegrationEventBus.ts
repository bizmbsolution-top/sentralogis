export interface IIntegrationEventBus {
  publish(topic: string, event: any): Promise<void>;
  subscribe(topic: string, handler: (event: any) => Promise<void>): void;
}
