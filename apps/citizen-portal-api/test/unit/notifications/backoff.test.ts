import { describe, expect, it } from 'vitest';
import { backoffMs, DEFAULT_BACKOFF_BASE_MS } from '../../../src/notifications/backoff';

describe('backoff unit tests', () => {
  describe('backoffMs', () => {
    const base = 1000; // 1 second base

    it('should return baseMs for 1st attempt', () => {
      expect(backoffMs(1, base)).toBe(1000);
    });

    it('should scale exponentially by factor of 5 for subsequent attempts', () => {
      expect(backoffMs(2, base)).toBe(5000);
      expect(backoffMs(3, base)).toBe(25000);
      expect(backoffMs(4, base)).toBe(125000);
      expect(backoffMs(5, base)).toBe(625000);
    });

    it('should handle zero or negative attempt counts by treating them as 1st attempt', () => {
      expect(backoffMs(0, base)).toBe(1000);
      expect(backoffMs(-5, base)).toBe(1000);
    });
  });

  describe('DEFAULT_BACKOFF_BASE_MS', () => {
    it('should be 1 minute (60,000 ms)', () => {
      expect(DEFAULT_BACKOFF_BASE_MS).toBe(60000);
    });
  });
});
