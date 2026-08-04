import { ValidationResult } from './ValidationResult';
import { ValidationContext } from './ValidationContext';

export interface Validator<T> {
  validate(candidate: T, context?: ValidationContext): ValidationResult | Promise<ValidationResult>;
}
