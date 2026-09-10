import { OperationalSituation } from '../knowledge/OperationalSituation';
import { OperationalRecommendation } from '../context/OperationalRecommendationEngine';
import { OperationalContextEngine } from '../context/OperationalContextEngine';
import { OperationalRecommendationEngine } from '../context/OperationalRecommendationEngine';
import { OperationalInsightEngine } from '../insight/OperationalInsightEngine';
import { OperationalInsight } from '../insight/OperationalInsight';
import { createFoundationContext } from '@/lib/copilot/foundation/integration';
import { TimelineQueryProvider } from '@/lib/copilot/read/timeline-provider';
import type { IdentityContext } from '@/lib/application/identity/types';

export interface EnrichedOperationalContext {
  situation: OperationalSituation;
  recommendation: OperationalRecommendation;
  insight: OperationalInsight;
  contextLoaded: boolean;
}

export class ContextEnricher {
  /**
   * Enrich context from canonical timeline data.
   * Replaces mock timeline with canonical TimelineQueryService.
   */
  static async enrichFromDatabase(
    jobOrderId?: string,
    identity?: IdentityContext,
  ): Promise<EnrichedOperationalContext> {
    if (!jobOrderId || !identity) {
      const situation = OperationalContextEngine.evaluateSituation([]);
      return {
        situation,
        recommendation: OperationalRecommendationEngine.generateRecommendations(situation),
        insight: OperationalInsightEngine.generateInsight(situation, []),
        contextLoaded: false,
      };
    }

    const foundationContext = createFoundationContext(identity);

    try {
      const result = await TimelineQueryProvider.getTimeline(foundationContext, {
        entityIds: [jobOrderId],
        limit: 50,
      });

      const events = result.events.map((e) => ({
        status: e.status,
        timestamp: new Date(e.timestamp).getTime(),
        hasPod: e.category === 'milestone' && e.status?.toLowerCase().includes('pod'),
      }));

      const situation = OperationalContextEngine.evaluateSituation(events);
      const recommendation = OperationalRecommendationEngine.generateRecommendations(situation);
      const insight = OperationalInsightEngine.generateInsight(situation, events);

      return {
        situation,
        recommendation,
        insight,
        contextLoaded: true,
      };
    } catch (error) {
      console.error('[ContextEnricher] Timeline query failed:', error);
      const situation = OperationalContextEngine.evaluateSituation([]);
      return {
        situation,
        recommendation: OperationalRecommendationEngine.generateRecommendations(situation),
        insight: OperationalInsightEngine.generateInsight(situation, []),
        contextLoaded: false,
      };
    }
  }
}
