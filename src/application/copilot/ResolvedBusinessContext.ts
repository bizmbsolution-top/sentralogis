import { CopilotIntent } from './CopilotIntent';
import { EntityCandidate } from './EntityCandidate';
import { ContextWarning } from './ContextWarnings';

export interface ResolvedBusinessContext {
  intent: CopilotIntent;
  confidence: number;
  tenantId: string;
  userId: string;
  resolvedEntities: Record<string, EntityCandidate>; // e.g., { "DRIVER:Budi": EntityCandidate }
  warnings: ContextWarning[];
  requiresConfirmation: boolean;
  executionPayload: Record<string, any>; // The strictly typed payload ready for the Application Service
}
