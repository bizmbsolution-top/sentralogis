import * as fs from 'fs';
import { TypeScriptDiagnostic } from '../../src/features/governance/types';

const ERROR_REGEX = /^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.*)$/;
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

export class TsParser {
  public parse(filePath: string): TypeScriptDiagnostic[] {
    if (!fs.existsSync(filePath)) {
      console.warn(`[TsParser] Log file not found at ${filePath}, returning empty array.`);
      return [];
    }

    const data = fs.readFileSync(filePath, 'utf8').replace(ANSI_REGEX, '');
    const lines = data.split('\n');

    const errors: TypeScriptDiagnostic[] = [];
    let currentError: TypeScriptDiagnostic | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const match = trimmed.match(ERROR_REGEX);
      if (match) {
        if (currentError) errors.push(currentError);
        
        currentError = {
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
          errorCode: match[4],
          message: match[5],
          severity: 'error',
          category: 'Uncategorized',
          priority: 4,
        };
      } else if (currentError) {
        currentError.message += ' ' + trimmed;
      }
    }
    
    if (currentError) errors.push(currentError);
    return this.categorize(errors);
  }

  private categorize(errors: TypeScriptDiagnostic[]): TypeScriptDiagnostic[] {
    for (const err of errors) {
      const { errorCode, message: msg } = err;
      
      if (errorCode === 'TS2307' || errorCode === 'TS2724' || msg.includes('Cannot find module')) {
        err.category = 'Missing imports';
        err.priority = 1;
        err.suggestedAction = 'Check import paths or npm install missing modules.';
      } else if (errorCode.startsWith('TS5')) {
        err.category = 'Build configuration';
        err.priority = 1;
        err.suggestedAction = 'Fix tsconfig.json options.';
      } else if (errorCode === 'TS17004' || errorCode === 'TS2607' || errorCode === 'TS2786') {
        err.category = 'React JSX';
        err.priority = 1;
      } else if (errorCode === 'TS2531' || errorCode === 'TS2532' || (errorCode === 'TS2339' && msg.includes('null'))) {
        err.category = 'Nullability';
        err.priority = 2;
        err.suggestedAction = 'Add optional chaining (?) or strict null checks.';
      } else if (errorCode === 'TS2304' || errorCode === 'TS2503' || (errorCode === 'TS2582' && !msg.includes('jest') && !msg.includes('describe') && !msg.includes('it'))) {
        err.category = 'Missing global types';
        err.priority = 2;
      } else if (errorCode === 'TS2344') {
        err.category = 'Generic constraints';
        err.priority = 3;
      } else if (['TS2322', 'TS2345', 'TS2353', 'TS2339', 'TS2769', 'TS7006', 'TS2367', 'TS2698'].includes(errorCode)) {
        err.category = msg.includes("does not exist on type 'never'") ? 'Inference' : 'Type mismatches';
        err.priority = 3;
      } else if (errorCode === 'TS2582' && (msg.includes('describe') || msg.includes('it') || msg.includes('jest'))) {
        err.category = 'Jest';
        err.priority = 4;
        err.suggestedAction = 'npm i --save-dev @types/jest';
      } else if (errorCode === 'TS6133') {
        err.category = 'Unused variables';
        err.priority = 4;
        err.severity = 'warning';
      } else {
        err.category = `Other (${errorCode})`;
        err.priority = 4;
      }
    }
    return errors;
  }
}
