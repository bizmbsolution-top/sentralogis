import { OperationalInsight } from '../insight/OperationalInsight';
import { OperationalPriority, PriorityLevel } from './OperationalPriority';
import { SituationCatalog } from '../knowledge/SituationCatalog';

export class OperationalPriorityEngine {
  
  /**
   * Deterministically scores an OperationalInsight to calculate Priority.
   */
  static calculatePriority(jobOrderId: string, insight: OperationalInsight): OperationalPriority {
    let score = 0;
    let reason = 'Nominal Operations';
    
    // 1. Scoring based on Operational Situation
    switch (insight.situation.id) {
      case SituationCatalog.LATE_DEPARTURE.id:
        score += 85;
        reason = 'Late Departure poses immediate risk to delivery schedule.';
        break;
      case SituationCatalog.WAITING_UNLOADING.id:
      case SituationCatalog.DRIVER_WAITING.id:
        score += 65;
        reason = 'Extended waiting time is accumulating demurrage/idle costs.';
        break;
      case SituationCatalog.MISSING_POD.id:
        score += 30;
        reason = 'Administrative requirement pending.';
        break;
      case SituationCatalog.NOMINAL.id:
      default:
        score += 0;
        break;
    }

    // 2. Adjustments based on SLA Risk
    if (insight.slaRisk === 'CRITICAL') score += 15;
    if (insight.slaRisk === 'HIGH') score += 10;
    if (insight.slaRisk === 'LOW') score -= 5; // Demote purely administrative issues if low risk

    // 3. Cap score at 100
    score = Math.max(0, Math.min(100, score));

    let priorityLevel: PriorityLevel = 'LOW';
    if (score >= 80) priorityLevel = 'URGENT';
    else if (score >= 60) priorityLevel = 'HIGH';
    else if (score >= 30) priorityLevel = 'NORMAL';

    return {
      jobOrderId,
      priorityLevel,
      priorityScore: score,
      operationalReason: reason,
      insight,
      requiresImmediateAttention: priorityLevel === 'URGENT' || priorityLevel === 'HIGH',
      generatedFrom: 'ENGINE'
    };
  }
}
