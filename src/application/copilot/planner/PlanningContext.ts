import { ResolvedBusinessContext } from '../ResolvedBusinessContext';

export interface PlanningContext {
  businessContext: ResolvedBusinessContext;
  
  // Dynamic state loaded during planning (e.g. read-only checks)
  // Maps entity ID to its domain state relevant for planning
  stateCache: Record<string, any>; 
}
