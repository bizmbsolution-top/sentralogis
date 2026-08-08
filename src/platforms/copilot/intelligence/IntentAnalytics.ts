export class IntentAnalytics {
  private static stats: Record<string, { count: number, avgConfidence: number }> = {};

  static recordResolution(intentId: string, confidence: number) {
    if (!this.stats[intentId]) {
      this.stats[intentId] = { count: 0, avgConfidence: 0 };
    }
    
    const current = this.stats[intentId];
    current.avgConfidence = ((current.avgConfidence * current.count) + confidence) / (current.count + 1);
    current.count++;
  }

  static getStats() {
    return this.stats;
  }
}
