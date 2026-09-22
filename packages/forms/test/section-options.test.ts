import { describe, expect, it } from 'vitest';
import { GAP_REM } from '../src/renderers/gridstack/layout-gap';
import {
  DEFAULT_SECTION_INSET,
  DEFAULT_SECTION_VARIANT,
  INSET_CLASS,
  INSET_REM,
  SECTION_INSETS,
  SECTION_VARIANTS,
  sectionHeadingLevel,
  sectionInset,
  sectionVariant,
} from '../src/renderers/gridstack/section-options';

// Doc 212 rules 9-10, 13-18 — the Section's pure readers: its variant, its inset, and the heading level a
// depth implies. Tested directly, the way doc 182's option sanitisers are.

describe('sectionVariant (rules 13-14, 18)', () => {
  it('reads an absent variant as "plain"', () => {
    expect(sectionVariant(undefined)).toBe('plain');
    expect(sectionVariant({})).toBe('plain');
    expect(DEFAULT_SECTION_VARIANT).toBe('plain');
  });

  it('reads "container"', () => {
    expect(sectionVariant({ variant: 'container' })).toBe('container');
  });

  it('reads an unrecognised or wrong-typed value as "plain" rather than throwing', () => {
    expect(sectionVariant({ variant: 'boxed' })).toBe('plain');
    expect(sectionVariant({ variant: 'Container' })).toBe('plain');
    expect(sectionVariant({ variant: true })).toBe('plain');
    expect(sectionVariant('container')).toBe('plain');
    expect(sectionVariant(null)).toBe('plain');
  });
});

describe('sectionInset (rules 15, 18)', () => {
  it('reads an absent inset as "md" — the same 1rem the default gap is', () => {
    expect(sectionInset(undefined)).toBe('md');
    expect(sectionInset({})).toBe('md');
    expect(DEFAULT_SECTION_INSET).toBe('md');
  });

  it('reads each of xs, sm, md, lg and xl', () => {
    for (const inset of SECTION_INSETS) expect(sectionInset({ inset })).toBe(inset);
  });

  it('reads an unrecognised or wrong-typed value as the default', () => {
    expect(sectionInset({ inset: 'xxl' })).toBe('md');
    expect(sectionInset({ inset: 6 })).toBe('md');
    expect(sectionInset(null)).toBe('md');
  });

  it('has no "none" — a container always has some inset', () => {
    expect(SECTION_INSETS).not.toContain('none');
    expect(sectionInset({ inset: 'none' })).toBe('md');
  });
});

describe('the inset scale (rules 15, 17)', () => {
  it('maps every inset to a WHOLE Tailwind class string, never an interpolation', () => {
    for (const inset of SECTION_INSETS) {
      // Whole and literal: Tailwind generates nothing from a name it cannot see in the source.
      expect(INSET_CLASS[inset]).toMatch(/^p-\d+$/);
    }
    expect(new Set(Object.values(INSET_CLASS)).size).toBe(SECTION_INSETS.length);
  });

  it('uses the same rem scale the gap does, so the md default is p-4', () => {
    expect(INSET_CLASS[DEFAULT_SECTION_INSET]).toBe('p-4');
    expect(INSET_CLASS.lg).toBe('p-6');
    // One scale for both, so an author picking `lg` in two places gets 1.5rem in both.
    for (const inset of SECTION_INSETS) expect(INSET_REM[inset]).toBe(GAP_REM[inset]);
  });
});

describe('sectionHeadingLevel (rule 9)', () => {
  it('is h2 at depth 0 — one below a Form title', () => {
    expect(sectionHeadingLevel(0)).toBe(2);
  });

  it('is h3 at depth 1 and h4 at depth 2', () => {
    expect(sectionHeadingLevel(1)).toBe(3);
    expect(sectionHeadingLevel(2)).toBe(4);
  });

  it('caps at h6 however deep the nesting goes', () => {
    expect(sectionHeadingLevel(4)).toBe(6);
    expect(sectionHeadingLevel(5)).toBe(6);
    expect(sectionHeadingLevel(40)).toBe(6);
  });

  it('never goes above a Form title for a nonsense depth', () => {
    expect(sectionHeadingLevel(-1)).toBe(2);
    expect(sectionHeadingLevel(1.5)).toBe(3);
  });
});

describe('the variant list (rule 13)', () => {
  it('offers exactly plain and container', () => {
    expect(SECTION_VARIANTS).toEqual(['plain', 'container']);
  });
});
