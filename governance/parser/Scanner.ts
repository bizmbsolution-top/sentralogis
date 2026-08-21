import * as fs from 'fs';
import * as path from 'path';

export interface RawScannerMetrics {
  totalFiles: number;
  totalLines: number;
  todoCount: number;
  fixmeCount: number;
  hackCount: number;
  deprecatedApiCount: number;
  deepNestingCount: number;
  longFunctionsCount: number;
  largeFilesCount: number;
  circularDependencies: number;
  layerViolations: number;
  anyUsage: number;
  nullAssertions: number;
  duplicatedCodeCount: number;
  complexModulesCount: number;
}

export type CodeMetrics = RawScannerMetrics;

export class CodeScanner {
  private metrics: RawScannerMetrics = {
    totalFiles: 0,
    totalLines: 0,
    todoCount: 0,
    fixmeCount: 0,
    hackCount: 0,
    deprecatedApiCount: 0,
    deepNestingCount: 0,
    longFunctionsCount: 0,
    largeFilesCount: 0,
    circularDependencies: 0,
    layerViolations: 0,
    anyUsage: 0,
    nullAssertions: 0,
    duplicatedCodeCount: 0,
    complexModulesCount: 0,
  };

  public async scanRepository(rootDir: string): Promise<RawScannerMetrics> {
    this.walkDir(rootDir);
    return this.metrics;
  }

  private walkDir(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (['node_modules', '.git', '.next', 'dist', 'governance'].includes(file)) continue;
      
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        this.walkDir(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        this.scanFile(fullPath);
      }
    }
  }

  private scanFile(filePath: string) {
    this.metrics.totalFiles++;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    this.metrics.totalLines += lines.length;

    if (lines.length > 500) this.metrics.largeFilesCount++;

    let functionLength = 0;
    
    for (const line of lines) {
      if (line.includes('TODO')) this.metrics.todoCount++;
      if (line.includes('FIXME')) this.metrics.fixmeCount++;
      if (line.includes('HACK')) this.metrics.hackCount++;
      if (line.includes('@deprecated')) this.metrics.deprecatedApiCount++;
      
      if (line.includes(': any') || line.includes('<any>')) this.metrics.anyUsage++;
      if (line.includes('!.') || line.match(/\w+!/)) this.metrics.nullAssertions++;

      // Deep nesting heuristic (> 4 tabs/spaces)
      if (line.match(/^ {16,}\S/) || line.match(/^\t{4,}\S/)) {
        this.metrics.deepNestingCount++;
      }

      // Long function heuristic
      if (line.includes('function ') || line.includes('=> {')) {
        functionLength = 1;
      } else if (functionLength > 0) {
        functionLength++;
        if (functionLength > 100) {
          this.metrics.longFunctionsCount++;
          functionLength = 0;
        }
      }
      if (line.trim() === '}') functionLength = 0;

      // Architecture Violation heuristic
      if (filePath.includes('domain') && line.includes('import ') && (line.includes('components') || line.includes('ui'))) {
        this.metrics.layerViolations++;
      }
    }
  }
}
