export interface IEventSubscriber {
  subscribe(eventType: string, handler: (event: any) => Promise<void>): void;
}
