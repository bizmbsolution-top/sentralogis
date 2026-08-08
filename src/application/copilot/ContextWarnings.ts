export interface ContextWarning {
  code: string;
  message: string;
  entityType?: string;
  entityValue?: string;
}

export class ContextWarnings {
  private warnings: ContextWarning[] = [];

  public add(warning: ContextWarning): void {
    this.warnings.push(warning);
  }

  public getAll(): ContextWarning[] {
    return [...this.warnings];
  }

  public hasWarnings(): boolean {
    return this.warnings.length > 0;
  }
}
