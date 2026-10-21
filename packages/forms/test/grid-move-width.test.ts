import { describe, expect, it } from 'vitest';
import { movedWidth } from '../src/renderers/gridstack/grid-move-width';

// Doc 183 rule 12c — an element moved into a free Grid keeps the share of its row it filled.

describe('movedWidth', () => {
  describe('proportional conversion', () => {
    it.each([
      { w: 1, from: 1, to: 12, expected: 12 },
      { w: 6, from: 12, to: 6, expected: 3 },
      { w: 1, from: 3, to: 12, expected: 4 },
      { w: 2, from: 3, to: 12, expected: 8 },
      { w: 12, from: 12, to: 12, expected: 12 },
    ])('converts $w of $from columns to $expected of $to', ({ w, from, to, expected }) => {
      expect(movedWidth(w, from, to)).toBe(expected);
    });
  });

  describe('rounding', () => {
    it.each([
      { w: 1, from: 5, to: 12, expected: 2 },
      { w: 3, from: 7, to: 12, expected: 5 },
      { w: 1, from: 8, to: 12, expected: 2 },
    ])(
      'rounds $w of $from columns to the nearest whole column ($expected of $to)',
      ({ w, from, to, expected }) => {
        expect(movedWidth(w, from, to)).toBe(expected);
      },
    );
  });

  describe('clamping', () => {
    it('never returns less than 1 column', () => {
      expect(movedWidth(1, 12, 4)).toBe(1);
      expect(movedWidth(0, 12, 12)).toBe(1);
    });

    it('never returns more than the target columns, even for a source width wider than its grid', () => {
      expect(movedWidth(13, 12, 12)).toBe(12);
      expect(movedWidth(4, 3, 6)).toBe(6);
    });
  });

  describe('invalid input', () => {
    it('keeps the width, clamped to the target, when the source column count is not a positive number', () => {
      expect(movedWidth(3, 0, 12)).toBe(3);
      expect(movedWidth(20, Number.NaN, 12)).toBe(12);
      expect(movedWidth(Number.NaN, 3, 12)).toBe(1);
    });
  });
});
