export class ConfidenceEngine {
  
  static parseConfidence(rawConfidence: number | undefined): number {
    if (rawConfidence === undefined || rawConfidence === null) {
      return 1.0;
    }
    
    // Ensure bounds
    if (rawConfidence < 0) return 0;
    if (rawConfidence > 1) return 1.0;
    
    return rawConfidence;
  }
}
