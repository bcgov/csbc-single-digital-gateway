import { describe, expect, it } from 'vitest';
import { backoffMs, DEFAULT_BACKOFF_BASE_MS } from '../../../src/notifications/backoff';

describe('backoffMs', () => {
  it('should return correct base ms on first attempt', () => {
    expect(backoffMs(1, 1000)).toBe(1000);
  });

  it('should use default values correctly', () => {
    expect(DEFAULT_BACKOFF_BASE_MS).toBe(60_000);
    expect(backoffMs(1, DEFAULT_BACKOFF_BASE_MS)).toBe(60_000);
  });

  it('should exponentially backoff on subsequent attempts', () => {
    expect(backoffMs(2, 1000)).toBe(5000); // 1000 * 5^1
    expect(backoffMs(3, 1000)).toBe(25000); // 1000 * 5^2
    expect(backoffMs(4, 1000)).toBe(125000); // 1000 * 5^3
  });

  it('should floor attempts at a minimum of 1 if negative or 0 is passed', () => {
    expect(backoffMs(0, 1000)).toBe(1000);
    expect(backoffMs(-5, 1000)).toBe(1000);
  });
});
