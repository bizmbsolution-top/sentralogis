import { OperationalSituation } from '../knowledge/OperationalSituation';
import { OperationalRecommendation } from '../context/OperationalRecommendationEngine';
import { OperationalContextEngine } from '../context/OperationalContextEngine';
import { OperationalRecommendationEngine } from '../context/OperationalRecommendationEngine';
import { OperationalInsightEngine } from '../insight/OperationalInsightEngine';
import { OperationalInsight } from '../insight/OperationalInsight';

export interface EnrichedOperationalContext {
  situation: OperationalSituation;
  recommendation: OperationalRecommendation;
  insight: OperationalInsight;
  contextLoaded: boolean;
}

export class ContextEnricher {
  /**
   * Mock data retrieval. In production this queries TimelineQueryService.
   */
  static async enrichFromDatabase(jobOrderId?: string): Promise<EnrichedOperationalContext> {
    
    if (!jobOrderId) {
      const situation = OperationalContextEngine.evaluateSituation([]);
      return {
        situation,
        recommendation: OperationalRecommendationEngine.generateRecommendations(situation),
        insight: OperationalInsightEngine.generateInsight(situation, []),
        contextLoaded: false
      };
    }

    // MOCK TIMELINE: Arrived 4 hours ago, no POD
    const mockEvents = [
      { status: 'ARRIVED', timestamp: Date.now() - (4.5 * 60 * 60 * 1000), hasPod: false }
    ];

    const situation = OperationalContextEngine.evaluateSituation(mockEvents);
    const recommendation = OperationalRecommendationEngine.generateRecommendations(situation);
    const insight = OperationalInsightEngine.generateInsight(situation, mockEvents);

    return {
      situation,
      recommendation,
      insight,
      contextLoaded: true
    };
  }
}
