import { describe, test, expect } from 'vitest';
import { evaluateThreshold, type ThresholdResult } from '../pricing/override-service';

// ============================================================================
// THRESHOLD GOVERNANCE TESTS
// ============================================================================

describe('Phase 5C-4 Threshold Governance', () => {
  test('LOW threshold: variance <= 5% auto-approves', () => {
    const result = evaluateThreshold(1000, 1050);
    expect(result.threshold).toBe('LOW');
    expect(result.autoApprove).toBe(true);
    expect(result.approvalRequired).toBe(false);
    expect(result.varianceAmount).toBe(50);
    expect(result.variancePercentage).toBe(5);
  });

  test('MEDIUM threshold: variance > 5% and <= 20% requires approval', () => {
    const result = evaluateThreshold(1000, 1150);
    expect(result.threshold).toBe('MEDIUM');
    expect(result.autoApprove).toBe(false);
    expect(result.approvalRequired).toBe(true);
    expect(result.varianceAmount).toBe(150);
    expect(result.variancePercentage).toBe(15);
  });

  test('HIGH threshold: variance > 20% requires approval', () => {
    const result = evaluateThreshold(1000, 1300);
    expect(result.threshold).toBe('HIGH');
    expect(result.autoApprove).toBe(false);
    expect(result.approvalRequired).toBe(true);
    expect(result.varianceAmount).toBe(300);
    expect(result.variancePercentage).toBe(30);
  });

  test('negative variance (discount) is handled correctly', () => {
    const result = evaluateThreshold(1000, 800);
    expect(result.varianceAmount).toBe(-200);
    expect(result.variancePercentage).toBe(20);
    expect(result.threshold).toBe('MEDIUM');
    expect(result.approvalRequired).toBe(true);
  });

  test('zero calculated price results in HIGH threshold', () => {
    const result = evaluateThreshold(0, 100);
    expect(result.threshold).toBe('HIGH');
    expect(result.variancePercentage).toBeNull();
    expect(result.approvalRequired).toBe(true);
  });

  test('boundary: exactly 5% is LOW', () => {
    const result = evaluateThreshold(1000, 1050);
    expect(result.threshold).toBe('LOW');
  });

  test('boundary: exactly 20% is MEDIUM', () => {
    const result = evaluateThreshold(1000, 1200);
    expect(result.threshold).toBe('MEDIUM');
  });

  test('deterministic: same inputs produce same output', () => {
    const result1 = evaluateThreshold(1200, 1100);
    const result2 = evaluateThreshold(1200, 1100);
    expect(result1.threshold).toBe(result2.threshold);
    expect(result1.varianceAmount).toBe(result2.varianceAmount);
  });
});

// ============================================================================
// OVERRIDE TYPE TESTS
// ============================================================================

describe('Phase 5C-4 Override Types', () => {
  test('ThresholdResult has required fields', () => {
    const result: ThresholdResult = {
      varianceAmount: 100,
      variancePercentage: 10,
      approvalRequired: true,
      autoApprove: false,
      threshold: 'MEDIUM',
    };

    expect(result.varianceAmount).toBe(100);
    expect(result.variancePercentage).toBe(10);
    expect(result.approvalRequired).toBe(true);
    expect(result.autoApprove).toBe(false);
    expect(result.threshold).toBe('MEDIUM');
  });
});
