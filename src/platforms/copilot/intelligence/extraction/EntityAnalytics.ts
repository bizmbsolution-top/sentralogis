import { EntityResolution } from '../entities/models';

export class EntityAnalytics {
  private static stats: Record<string, { count: number, avgConfidence: number, ambiguousCount: number, unknownCount: number }> = {};

  static recordExtraction(entityType: string, resolution: EntityResolution) {
    if (!this.stats[entityType]) {
      this.stats[entityType] = { count: 0, avgConfidence: 0, ambiguousCount: 0, unknownCount: 0 };
    }
    
    const current = this.stats[entityType];
    
    if (resolution.status === 'RESOLVED') {
      current.avgConfidence = ((current.avgConfidence * current.count) + resolution.entity.confidence) / (current.count + 1);
      current.count++;
    } else if (resolution.status === 'AMBIGUOUS') {
      current.ambiguousCount++;
    } else {
      current.unknownCount++;
    }
  }

  static getStats() {
    return this.stats;
  }
}
