import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { maskConfig } from '../src/renderers/ui/control-options';
import { maskedValue, useMaskRef, type MaskRef } from '../src/renderers/ui/mask-input';

// Doc 204 rules 3-7 — the Text field's mask: the sanitiser, the memoised ref helper, and what is stored.
// The renderer wiring (rules 8-10) is in renderers-ui-controls.test.tsx; real masked typing is hand-verified
// (rule 28), since inputmask rewrites input.value and moves the caret, which jsdom models poorly.

describe('maskConfig (rules 5-6)', () => {
  it('keeps a non-empty string pattern', () => {
    expect(maskConfig({ mask: '(999) 999-9999' })).toStrictEqual({ mask: '(999) 999-9999' });
  });

  it('drops a non-string or empty pattern as an ABSENT key, never undefined', () => {
    // `exactOptionalPropertyTypes`: `{ mask: undefined }` would not spread onto a component cleanly.
    for (const mask of ['', 7, null, {}, [], true, undefined]) {
      expect(maskConfig({ mask }), String(mask)).toStrictEqual({});
    }
    expect(maskConfig(undefined)).toStrictEqual({});
  });

  it('keeps unmasked only when it is a boolean', () => {
    expect(maskConfig({ mask: '999', maskUnmasked: true })).toStrictEqual({
      mask: '999',
      unmasked: true,
    });
    expect(maskConfig({ mask: '999', maskUnmasked: false })).toStrictEqual({
      mask: '999',
      unmasked: false,
    });
    for (const unmasked of ['yes', 1, null]) {
      expect(maskConfig({ mask: '999', maskUnmasked: unmasked }), String(unmasked)).toStrictEqual({
        mask: '999',
      });
    }
  });

  it('ignores maskUnmasked when there is no mask, so a field cannot claim to unmask nothing', () => {
    expect(maskConfig({ maskUnmasked: true })).toStrictEqual({});
  });
});

describe('useMaskRef (rule 3)', () => {
  it('returns the same ref callback for the same pattern across renders', () => {
    // A new identity re-attaches the mask to the live element and drops the caret mid-typing.
    const { result, rerender } = renderHook(({ mask }) => useMaskRef(mask), {
      initialProps: { mask: '999-999' as string | undefined },
    });
    const first = result.current;
    rerender({ mask: '999-999' });
    expect(result.current).toBe(first);
  });

  it('returns a new ref callback when the pattern changes', () => {
    const { result, rerender } = renderHook(({ mask }) => useMaskRef(mask), {
      initialProps: { mask: '999-999' as string | undefined },
    });
    const first = result.current;
    rerender({ mask: '(999) 999-9999' });
    expect(result.current).not.toBe(first);
  });

  it('returns undefined when no pattern is authored, so withMask is never called', () => {
    const { result } = renderHook(() => useMaskRef(undefined));
    expect(result.current).toBeUndefined();
  });
});

describe('maskedValue (rules 6-7)', () => {
  /** A stand-in for what `withMask` returns — the renderer only ever reads `unmaskedValue()`. */
  const refWith = (unmasked: string): MaskRef =>
    Object.assign(() => undefined, {
      unmaskedValue: () => unmasked,
      isComplete: () => true,
    }) as unknown as MaskRef;

  it('stores the masked string as shown when unmasked is absent or false', () => {
    const ref = refWith('2505550123');
    expect(maskedValue('(250) 555-0123', ref, undefined)).toBe('(250) 555-0123');
    expect(maskedValue('(250) 555-0123', ref, false)).toBe('(250) 555-0123');
  });

  it('stores the raw characters when unmasked is true', () => {
    expect(maskedValue('(250) 555-0123', refWith('2505550123'), true)).toBe('2505550123');
  });

  it('writes undefined for an emptied field, never an empty string', () => {
    // Doc 182 rule 15: Ajv counts '' as present, so `required` would never fail.
    expect(maskedValue('', refWith(''), undefined)).toBeUndefined();
    expect(maskedValue('(___) ___-____', refWith(''), true)).toBeUndefined();
  });

  it('falls back to the shown value when asked to unmask without a ref', () => {
    expect(maskedValue('abc', undefined, true)).toBe('abc');
  });
});
