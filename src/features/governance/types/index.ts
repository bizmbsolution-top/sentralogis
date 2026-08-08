/**
 * Canonical Governance Data Contract
 * Single Source of Truth for Engineering Governance Platform.
 */

export interface GovernanceMetadata {
  schemaVersion: string;
  generatorVersion: string;
  timestamp: string;
}

export interface RepositoryContext {
  repositoryName: string;
  branch: string;
  commit: string;
  files: number;
  directories: number;
  linesOfCode: number;
  languages: string[];
  framework: string;
  packageManager: string;
}

export interface ArchitectureMetric {
  score: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  summary: string;
  recommendations: string[];
}

export interface ArchitectureContext {
  dddCompliance: ArchitectureMetric;
  layerSeparation: ArchitectureMetric;
  dependencyInversion: ArchitectureMetric;
  moduleBoundaries: ArchitectureMetric;
  circularDependencies: ArchitectureMetric;
  sharedKernelHealth: ArchitectureMetric;
}

export interface TechnicalDebtContext {
  todoCount: number;
  fixmeCount: number;
  hackCount: number;
  deprecatedApiCount: number;
  largeFilesCount: number;
  longMethodsCount: number;
  deepNestingCount: number;
  duplicatedCodeCount: number;
  complexModulesCount: number;
  score: number;
  trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
}

export interface TypeScriptDiagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  category: string;
  priority: number;
  errorCode: string;
  message: string;
  suggestedAction?: string;
}

export interface TypeScriptContext {
  score: number;
  diagnostics: TypeScriptDiagnostic[];
}

export interface BuildContext {
  status: 'PASS' | 'FAIL';
  typescriptStatus: 'PASS' | 'FAIL';
  nextjsStatus: 'PASS' | 'FAIL';
  eslintStatus: 'PASS' | 'FAIL';
  bundleWarningsCount: number;
  executionDurationMs: number;
}

export interface TestContext {
  framework: string;
  coveragePercent: number;
  passingCount: number;
  failingCount: number;
  skippedCount: number;
  missingSuitesCount: number;
}

export interface DependencyContext {
  score: number;
  installedPackagesCount: number;
  unusedPackagesCount: number;
  deprecatedPackagesCount: number;
  peerDependencyIssuesCount: number;
  majorUpdatesAvailableCount: number;
}

export interface SecurityContext {
  auditStatus: 'PASS' | 'FAIL';
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
  unsafeDependenciesCount: number;
}

export interface ProductionReadinessContext {
  overallScore: number;
  isReady: boolean;
  blockingIssues: string[];
  warnings: string[];
  recommendations: string[];
  estimatedEffortHours: number;
  deploymentStatus: 'READY' | 'BLOCKED' | 'UNKNOWN';
}

export interface GovernanceSnapshot {
  metadata: GovernanceMetadata;
  repository: RepositoryContext;
  architecture: ArchitectureContext;
  technicalDebt: TechnicalDebtContext;
  typescript: TypeScriptContext;
  build: BuildContext;
  tests: TestContext;
  dependencies: DependencyContext;
  security: SecurityContext;
  productionReadiness: ProductionReadinessContext;
}

export interface GovernanceTrendSnapshot {
  timestamp: string;
  overallScore: number;
  architectureScore: number;
  technicalDebtScore: number;
  typescriptScore: number;
  securityScore: number;
  errorCount: number;
  isReady: boolean;
}
