export interface StructuralValidationResult {
  valid: boolean;
  confidenceScore: number;
  blockingErrors: string[];
  warnings: string[];
  succeededValidations: string[];
  explainability: {
    whatWasChecked: string[];
  };
}
