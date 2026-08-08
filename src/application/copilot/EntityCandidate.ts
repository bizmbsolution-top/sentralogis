export interface EntityCandidate {
  id: string; // The resolved UUID from the database
  display: string; // The human-readable name, e.g., "Budi Santoso"
  type: string; // Generic entity type, e.g., "DRIVER"
  confidenceScore: number; // 0.0 to 1.0
  tenantId: string; // Essential for tenant safety validation
  metadata?: Record<string, any>; // Explainability details (e.g. { reason: 'exact_match' })
}
