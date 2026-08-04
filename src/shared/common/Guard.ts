export class Guard {
  public static againstNullOrUndefined(argument: any, argumentName: string): { succeeded: boolean, message?: string } {
    if (argument === null || argument === undefined) {
      return { succeeded: false, message: `${argumentName} is null or undefined` };
    }
    return { succeeded: true };
  }

  public static againstEmptyString(argument: string, argumentName: string): { succeeded: boolean, message?: string } {
    if (argument === null || argument === undefined || argument.trim() === '') {
      return { succeeded: false, message: `${argumentName} cannot be empty` };
    }
    return { succeeded: true };
  }
}
