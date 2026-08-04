export interface IPolicyProvider {
  getAllowedActions(role: string, resource: string): string[];
}
