import { Clock, IClock } from './Clock';

export class DateProvider {
  private static clock: IClock = new Clock();

  public static setClock(clock: IClock): void {
    DateProvider.clock = clock;
  }

  public static now(): Date {
    return DateProvider.clock.now();
  }
}
