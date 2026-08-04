import { IRequestContext } from './IRequestContext';

export interface IPermissionEngine {
  can(context: IRequestContext, action: string, resource: string, attributes?: Record<string, any>): boolean;
  authorizeOrThrow(context: IRequestContext, action: string, resource: string, attributes?: Record<string, any>): void;
  batchEvaluate(context: IRequestContext, requests: { action: string, resource: string }[]): boolean[];
}
