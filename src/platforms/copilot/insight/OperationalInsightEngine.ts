import { OperationalSituation } from '../knowledge/OperationalSituation';
import { OperationalInsight } from './OperationalInsight';
import { JobHealthEngine } from './JobHealthEngine';
import { SLARiskAnalyzer } from './SLARiskAnalyzer';
import { BusinessImpactGenerator } from './BusinessImpactGenerator';
import { CustomerImpactGenerator } from './CustomerImpactGenerator';
import { NextBestActionEngine } from './NextBestActionEngine';

export class OperationalInsightEngine {
  
  static generateInsight(
    situation: OperationalSituation,
    events: any[]
  ): OperationalInsight {
    
    return {
      situation,
      operationalSummary: `Detected ${situation.name}: ${situation.description}`,
      businessImpact: BusinessImpactGenerator.generate(situation),
      customerImpact: CustomerImpactGenerator.generate(situation),
      slaRisk: SLARiskAnalyzer.calculateRisk(situation),
      operationalHealth: JobHealthEngine.calculateHealth(situation),
      recommendedAttention: NextBestActionEngine.getRecommendedAttention(situation),
      recommendedActions: NextBestActionEngine.generate(situation),
      confidence: 0.95, // Deterministic based on engine parsing
      generatedFrom: 'TIMELINE',
      supportingEvidence: [
        `Analyzed ${events.length} timeline events.`,
        `Latest event matched against ${situation.id} rule thresholds.`
      ]
    };
  }
}
