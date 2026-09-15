import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LAYOUT_GAP,
  GAP_CLASS,
  GAP_REM,
  gridMarginFor,
  LAYOUT_GAPS,
  layoutGapOf,
} from '../src/renderers/gridstack/layout-gap';

// Doc 193 rules 1-2, 11 — the layout gap scale.

describe('layout gap scale (doc 193)', () => {
  it('lists the six names in order and defaults to md', () => {
    expect(LAYOUT_GAPS).toEqual(['none', 'xs', 'sm', 'md', 'lg', 'xl']);
    expect(DEFAULT_LAYOUT_GAP).toBe('md');
  });

  it('reads an authored valid gap and falls back to md for absent, wrong-typed or unknown values', () => {
    for (const gap of LAYOUT_GAPS) expect(layoutGapOf({ gap })).toBe(gap);
    for (const options of [undefined, null, 'lg', {}, { gap: 2 }, { gap: 'huge' }, { gap: 'MD' }]) {
      expect(layoutGapOf(options), JSON.stringify(options)).toBe('md');
    }
  });

  it('maps each name to its rem size and a literal Tailwind gap class', () => {
    expect(GAP_REM).toEqual({ none: 0, xs: 0.25, sm: 0.5, md: 1, lg: 1.5, xl: 2 });
    expect(GAP_CLASS).toEqual({
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    });
  });

  it('derives the studio grid margin as half the gap', () => {
    expect(gridMarginFor('md')).toBe('0.5rem');
    expect(gridMarginFor('none')).toBe('0rem');
    expect(gridMarginFor('xs')).toBe('0.125rem');
    expect(gridMarginFor('xl')).toBe('1rem');
  });

  it('freezes the scale tables', () => {
    for (const table of [LAYOUT_GAPS, GAP_REM, GAP_CLASS])
      expect(Object.isFrozen(table)).toBe(true);
  });
});
