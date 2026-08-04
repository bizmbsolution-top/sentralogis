export interface IClock {
  now(): Date;
}

export class Clock implements IClock {
  now(): Date {
    return new Date();
  }
}
