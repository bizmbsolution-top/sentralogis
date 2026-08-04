export interface IEventRegistry {
  register(eventName: string, version: number, schema: unknown): void;
  getSchema(eventName: string, version: number): unknown;
}
