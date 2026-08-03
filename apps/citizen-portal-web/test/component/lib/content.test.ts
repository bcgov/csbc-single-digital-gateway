import { describe, expect, it } from 'vitest';
import { FEATURE_CARDS } from '@/lib/content';

describe('content lib', () => {
  it('defines correct static FEATURE_CARDS marketing data', () => {
    expect(FEATURE_CARDS).toBeDefined();
    expect(Array.isArray(FEATURE_CARDS)).toBe(true);
    expect(FEATURE_CARDS).toHaveLength(3);

    for (const card of FEATURE_CARDS) {
      expect(card).toHaveProperty('id');
      expect(card).toHaveProperty('title');
      expect(card).toHaveProperty('description');
      expect(card).toHaveProperty('icon');

      expect(typeof card.id).toBe('string');
      expect(card.id.length).toBeGreaterThan(0);

      expect(typeof card.title).toBe('string');
      expect(card.title.length).toBeGreaterThan(0);

      expect(typeof card.description).toBe('string');
      expect(card.description.length).toBeGreaterThan(0);

      expect(typeof card.icon).toBe('string');
      expect(card.icon.length).toBeGreaterThan(0);
    }
  });

  it('contains the expected features', () => {
    const ids = FEATURE_CARDS.map((c) => c.id);
    expect(ids).toContain('discover');
    expect(ids).toContain('apply');
    expect(ids).toContain('manage');
  });
});
