export interface TenantHierarchy {
  tenantId: string;
  organizationId?: string;
  businessUnitId?: string;
  departmentId?: string;
  branchId?: string;
  projectId?: string;
  workspaceId?: string;
}

export abstract class TenantIsolationService {
  abstract validateCrossTenantAccess(requesterTenantId: string, targetTenantId: string): void;
  abstract validateEntityTenant<TEntity>(entity: TEntity, expectedTenantId: string): void;
  
  abstract validateOrganization(organizationId: string): void;
  abstract validateBusinessUnit(businessUnitId: string): void;
  abstract validateDepartment(departmentId: string): void;
  abstract validateBranch(branchId: string): void;
  abstract validateProject(projectId: string): void;
  abstract validateWorkspace(workspaceId: string): void;

  abstract getCurrentTenant(): TenantHierarchy | null;
  abstract enforceIsolation<TEntity>(entity: TEntity, context: TenantHierarchy): void;
}
