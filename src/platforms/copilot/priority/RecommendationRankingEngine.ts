export class RecommendationRankingEngine {
  
  /**
   * Sorts actionable steps by logical execution order or operational urgency.
   * For the MVP, this just ensures critical contact steps bubble to the top.
   */
  static rankRecommendations(actions: string[]): string[] {
    return actions.sort((a, b) => {
      // Prioritize immediate contact over monitoring
      if (a.toLowerCase().includes('immediately') || a.toLowerCase().includes('escalate')) return -1;
      if (b.toLowerCase().includes('immediately') || b.toLowerCase().includes('escalate')) return 1;
      
      if (a.toLowerCase().includes('contact') || a.toLowerCase().includes('call')) return -1;
      if (b.toLowerCase().includes('contact') || b.toLowerCase().includes('call')) return 1;

      return 0;
    });
  }
}
