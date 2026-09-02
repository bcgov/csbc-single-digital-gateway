import { describe, expect, it } from 'vitest';
import {
  applyItemBound,
  applyRequiredToggle,
  parseItemBound,
} from '@/components/form-builder/item-bounds';
import type { ControlNode } from '@/components/form-builder/model';

const node = (overrides: Partial<ControlNode> = {}): ControlNode => ({
  kind: 'control',
  fieldType: 'accordiongroup',
  key: 'faq',
  label: 'FAQ',
  required: false,
  options: {},
  itemLabel: 'question',
  defaultOpen: 'none',
  ...overrides,
});

/** MDD doc 171, revision 3 — the two invariants behind the Min / Max items settings. */
describe('accordion item bounds (feature 171)', () => {
  describe('parseItemBound', () => {
    it('reads a blank or whitespace input as unbounded', () => {
      expect(parseItemBound('')).toBeUndefined();
      expect(parseItemBound('   ')).toBeUndefined();
    });

    it('reads a non-negative integer', () => {
      expect(parseItemBound('0')).toBe(0);
      expect(parseItemBound('4')).toBe(4);
    });

    it('floors a decimal — half an item is not a thing', () => {
      expect(parseItemBound('2.7')).toBe(2);
    });

    it('rejects junk and negatives as unbounded', () => {
      expect(parseItemBound('abc')).toBeUndefined();
      expect(parseItemBound('-3')).toBeUndefined();
    });
  });

  describe('invariant 1 — a minimum of 1 or more implies required', () => {
    it('marks the field required when a minimum is set', () => {
      expect(applyItemBound(node(), 'minItems', 2)).toMatchObject({ minItems: 2, required: true });
    });

    it('does not mark it required for a minimum of 0', () => {
      expect(applyItemBound(node(), 'minItems', 0).required).toBeUndefined();
    });

    it('does not mark it required for a maximum alone', () => {
      expect(applyItemBound(node(), 'maxItems', 5).required).toBeUndefined();
    });

    it('clears the minimum when Required is switched off', () => {
      // The other half of the invariant: an optional field cannot still demand three items.
      expect(applyRequiredToggle(false)).toEqual({ required: false, minItems: undefined });
    });

    it('leaves the minimum alone when Required is switched on', () => {
      expect(applyRequiredToggle(true)).toEqual({ required: true });
    });
  });

  describe('invariant 2 — the range stays satisfiable', () => {
    it('raises the maximum when a larger minimum is typed', () => {
      // The author is editing Min, so Min keeps what they typed and Max gives way.
      const patch = applyItemBound(node({ minItems: 1, maxItems: 3 }), 'minItems', 5);
      expect(patch).toMatchObject({ minItems: 5, maxItems: 5 });
    });

    it('lowers the minimum when a smaller maximum is typed', () => {
      const patch = applyItemBound(node({ minItems: 4, maxItems: 6 }), 'maxItems', 2);
      expect(patch).toMatchObject({ minItems: 2, maxItems: 2 });
    });

    it('leaves a satisfiable range untouched', () => {
      const patch = applyItemBound(node({ minItems: 1, maxItems: 6 }), 'maxItems', 4);
      expect(patch).toMatchObject({ minItems: 1, maxItems: 4 });
    });

    it('does not clamp when only one end is set', () => {
      expect(applyItemBound(node(), 'maxItems', 2)).toMatchObject({
        minItems: undefined,
        maxItems: 2,
      });
    });

    it('clears a bound without disturbing the other', () => {
      const patch = applyItemBound(node({ minItems: 2, maxItems: 6 }), 'maxItems', undefined);
      expect(patch).toMatchObject({ minItems: 2, maxItems: undefined });
    });
  });
});
