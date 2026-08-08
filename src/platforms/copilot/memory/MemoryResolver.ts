import { OperationalContext } from '../context/OperationalContext';
import { WorkspaceMemory } from './WorkspaceMemory';
import { SessionMemory } from './SessionMemory';
import { OperationalMemory } from './OperationalMemory';

export class MemoryResolver {
  /**
   * Resolves contextual pronouns in the user input into explicit entities.
   * Runs before Intent Resolution to give the LLM explicit context.
   */
  static resolveReferences(userInput: string, context: OperationalContext): string {
    let resolvedInput = userInput;
    const lowerInput = userInput.toLowerCase();
    
    const workspaceMemory = WorkspaceMemory.from(context.workspace);
    const sessionMemory = SessionMemory.from(context.conversation);

    // 1. "that job", "the job"
    if (lowerInput.includes('that job') || lowerInput.includes('the job') || lowerInput.includes('this job')) {
      const activeJob = workspaceMemory.activeJob;
      if (activeJob) {
        resolvedInput = resolvedInput.replace(/that job|the job|this job/gi, activeJob);
      }
    }

    // 2. "him", "her", "that driver", "the driver"
    if (lowerInput.includes('him') || lowerInput.includes('her') || lowerInput.includes('that driver') || lowerInput.includes('the driver')) {
      const activeDriver = workspaceMemory.activeDriver;
      if (activeDriver) {
        resolvedInput = resolvedInput.replace(/\b(him|her|that driver|the driver)\b/gi, activeDriver);
      }
    }

    // 3. "the delayed one", "delayed jobs"
    if (lowerInput.includes('the delayed one') || lowerInput.includes('delayed job')) {
      const delayedJobs = OperationalMemory.getDelayedJobs();
      if (delayedJobs.length > 0) {
        resolvedInput = resolvedInput.replace(/the delayed one|delayed jobs|delayed job/gi, delayedJobs[0]);
      }
    }

    return resolvedInput;
  }
}
