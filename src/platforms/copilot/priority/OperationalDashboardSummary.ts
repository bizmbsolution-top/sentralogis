import { OperationalPriority } from './OperationalPriority';
import { SituationCatalog } from '../knowledge/SituationCatalog';

export interface DashboardSummary {
  totalActiveJobs: number;
  delayedJobs: number;
  criticalJobs: number;
  missingPod: number;
  jobsAwaitingAttention: number;
}

export class OperationalDashboardSummary {
  
  static generateSummary(priorities: OperationalPriority[]): DashboardSummary {
    const totalActiveJobs = priorities.length;
    let delayedJobs = 0;
    let criticalJobs = 0;
    let missingPod = 0;
    let jobsAwaitingAttention = 0;

    priorities.forEach(p => {
      if (p.priorityLevel === 'URGENT') criticalJobs++;
      if (p.priorityLevel === 'HIGH') delayedJobs++;
      if (p.requiresImmediateAttention) jobsAwaitingAttention++;
      if (p.insight.situation.id === SituationCatalog.MISSING_POD.id) missingPod++;
    });

    return {
      totalActiveJobs,
      delayedJobs,
      criticalJobs,
      missingPod,
      jobsAwaitingAttention
    };
  }
}
