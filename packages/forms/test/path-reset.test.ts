import { describe, expect, it } from 'vitest';
import { visitedAfterPathChange } from '../src/runner/path-reset';

// Doc 202 rule 10g — progress past a path change resets to upcoming. Pure.

describe('visitedAfterPathChange', () => {
  it('resets everything after an INSERTED stage, but not before it', () => {
    // Ticking "needs an inspection": Inspection lands between Supporting and Review.
    const kept = visitedAfterPathChange(
      ['A', 'I', 'S', 'R'],
      ['A', 'I', 'S', 'N', 'R'],
      new Set(['A', 'I', 'S', 'R']),
      'S',
    );
    expect([...kept]).toEqual(['A', 'I', 'S']);
  });

  it('resets a swapped-out branch and everything after it', () => {
    const kept = visitedAfterPathChange(
      ['A', 'I', 'S', 'R'],
      ['A', 'B', 'S', 'R'],
      new Set(['A', 'I', 'S', 'R']),
      'A',
    );
    expect([...kept]).toEqual(['A']);
  });

  it('never resets the stage on screen', () => {
    const kept = visitedAfterPathChange(['A', 'R'], ['A', 'N', 'R'], new Set(['A', 'R']), 'R');
    expect([...kept]).toEqual(['A', 'R']);
  });

  it('returns the SAME set when nothing reached is affected, so no state update happens', () => {
    const visited = new Set(['A']);
    expect(visitedAfterPathChange(['A'], ['A', 'I', 'S'], visited, 'A')).toBe(visited);
  });
});
