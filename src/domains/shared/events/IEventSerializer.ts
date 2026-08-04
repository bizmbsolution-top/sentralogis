export interface IEventSerializer {
  serialize(event: any): string;
  deserialize(payload: string): any;
}
