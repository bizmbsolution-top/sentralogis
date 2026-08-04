import { IPolicyProvider } from '../contracts/IPolicyProvider';
import { UserRole, PermissionAction, PermissionResource } from '../../../../src/types/permission';

const ALL_ACTIONS = [
  PermissionAction.READ, PermissionAction.CREATE,
  PermissionAction.UPDATE, PermissionAction.DELETE,
  PermissionAction.APPROVE, PermissionAction.ASSIGN
];

export class DefaultPolicyProvider implements IPolicyProvider {
  private matrix: Record<string, Record<string, string[]>> = {
    [UserRole.ADMIN]: {
      [PermissionResource.WORK_ORDER]: ALL_ACTIONS,
      [PermissionResource.JOB_ORDER]: ALL_ACTIONS
    },
    [UserRole.DRIVER]: {
      [PermissionResource.JOB_ORDER]: [PermissionAction.READ, PermissionAction.UPDATE]
    }
  };

  getAllowedActions(role: string, resource: string): string[] {
    return this.matrix[role]?.[resource] || [];
  }
}
