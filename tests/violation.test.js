const {
  calculateViolationScore,
  getStatusFromScore,
  getDeltasFromLabel,
  isViolationLabel,
  VIOLATION_WEIGHTS,
  STATUS_THRESHOLDS
} = require('../utils/violation');

describe('Violation Scoring', () => {
  describe('VIOLATION_WEIGHTS', () => {
    test('should have correct weights', () => {
      expect(VIOLATION_WEIGHTS.SPAM).toBe(1);
      expect(VIOLATION_WEIGHTS.TOXIC).toBe(3);
    });
  });

  describe('STATUS_THRESHOLDS', () => {
    test('should have correct thresholds', () => {
      expect(STATUS_THRESHOLDS.WARNING).toBe(5);
      expect(STATUS_THRESHOLDS.BANNED).toBe(10);
    });
  });

  describe('calculateViolationScore', () => {
    test('should calculate score correctly', () => {
      expect(calculateViolationScore(0, 0)).toBe(0);
      expect(calculateViolationScore(1, 0)).toBe(1);
      expect(calculateViolationScore(0, 1)).toBe(3);
      expect(calculateViolationScore(5, 2)).toBe(11); // 5*1 + 2*3
    });
  });

  describe('getStatusFromScore', () => {
    test('should return ACTIVE for score below WARNING threshold', () => {
      expect(getStatusFromScore(0)).toBe('ACTIVE');
      expect(getStatusFromScore(4)).toBe('ACTIVE');
    });

    test('should return WARNING for score >= 5 and < 10', () => {
      expect(getStatusFromScore(5)).toBe('WARNING');
      expect(getStatusFromScore(9)).toBe('WARNING');
    });

    test('should return BANNED for score >= 10', () => {
      expect(getStatusFromScore(10)).toBe('BANNED');
      expect(getStatusFromScore(15)).toBe('BANNED');
    });

    test('should keep BANNED status if already banned', () => {
      expect(getStatusFromScore(3, 'BANNED')).toBe('BANNED');
    });
  });

  describe('getDeltasFromLabel', () => {
    test('should return correct deltas for SPAM', () => {
      const { spamDelta, toxicDelta } = getDeltasFromLabel('SPAM');
      expect(spamDelta).toBe(1);
      expect(toxicDelta).toBe(0);
    });

    test('should return correct deltas for TOXIC', () => {
      const { spamDelta, toxicDelta } = getDeltasFromLabel('TOXIC');
      expect(spamDelta).toBe(0);
      expect(toxicDelta).toBe(1);
    });

    test('should return zeros for other labels', () => {
      const { spamDelta, toxicDelta } = getDeltasFromLabel('NORMAL');
      expect(spamDelta).toBe(0);
      expect(toxicDelta).toBe(0);
    });
  });

  describe('isViolationLabel', () => {
    test('should return true for SPAM and TOXIC', () => {
      expect(isViolationLabel('SPAM')).toBe(true);
      expect(isViolationLabel('TOXIC')).toBe(true);
    });

    test('should return false for other labels', () => {
      expect(isViolationLabel('NORMAL')).toBe(false);
      expect(isViolationLabel('AI_UNAVAILABLE')).toBe(false);
    });
  });
});