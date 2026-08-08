import { OperationalPriority } from './OperationalPriority';

export class FocusQueueEngine {
  
  /**
   * Generates a sorted array of priorities.
   * Highest score (most urgent) appears at index 0.
   */
  static generateQueue(priorities: OperationalPriority[]): OperationalPriority[] {
    return priorities.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  static getTopAttentionJobs(priorities: OperationalPriority[], limit: number = 5): OperationalPriority[] {
    return this.generateQueue(priorities)
      .filter(p => p.requiresImmediateAttention)
      .slice(0, limit);
  }
}
