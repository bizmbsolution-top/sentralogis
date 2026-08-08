export interface ExecutionStep {
  id: string;
  name: string;
  description: string;
  requiredInputs: Record<string, string>; // e.g., { "driverId": "uuid" }
  dependencies: string[]; // step IDs this step depends on
  validationStatus: 'PENDING' | 'PASS' | 'FAIL';
  readyState: 'READY' | 'BLOCKED';
}
