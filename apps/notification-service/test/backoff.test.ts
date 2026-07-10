import { describe, expect, it } from 'vitest';
import { backoffMs } from '../src/modules/email-delivery/backoff';

describe('backoffMs', () => {
  it('grows exponentially: base × 5^(attempts-1) for the attempt just recorded', () => {
    const base = 60_000;
    expect(backoffMs(1, base)).toBe(60_000); // after 1st failure: 1 min
    expect(backoffMs(2, base)).toBe(300_000); // after 2nd: 5 min
    expect(backoffMs(3, base)).toBe(1_500_000); // after 3rd: 25 min
    expect(backoffMs(4, base)).toBe(7_500_000); // after 4th: ~2 h
  });

  it('treats attempts below 1 as 1 (never a zero/negative delay)', () => {
    expect(backoffMs(0, 60_000)).toBe(60_000);
    expect(backoffMs(-3, 60_000)).toBe(60_000);
  });
});
