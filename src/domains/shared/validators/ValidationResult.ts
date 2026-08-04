export class ValidationResult {
  constructor(public isValid: boolean, public errors: string[]) {}
  
  static success(): ValidationResult {
    return new ValidationResult(true, []);
  }
  
  static fail(errors: string[]): ValidationResult {
    return new ValidationResult(false, errors);
  }
}
