import { IPermissionEngine } from '../contracts/IPermissionEngine';
import { IRequestContext } from '../contracts/IRequestContext';
import { IPolicyProvider } from '../contracts/IPolicyProvider';
import { ForbiddenException } from '../exceptions/ForbiddenException';

export class PermissionEngine implements IPermissionEngine {
  constructor(private policyProvider: IPolicyProvider) {}

  can(context: IRequestContext, action: string, resource: string, attributes?: Record<string, any>): boolean {
    const allowedActions = this.policyProvider.getAllowedActions(context.role, resource);
    return allowedActions.includes(action);
  }

  authorizeOrThrow(context: IRequestContext, action: string, resource: string, attributes?: Record<string, any>): void {
    if (!this.can(context, action, resource, attributes)) {
      throw new ForbiddenException(`User ${context.userId} is not authorized to ${action} ${resource}`);
    }
  }

  batchEvaluate(context: IRequestContext, requests: { action: string; resource: string }[]): boolean[] {
    return requests.map(req => this.can(context, req.action, req.resource));
  }
}
