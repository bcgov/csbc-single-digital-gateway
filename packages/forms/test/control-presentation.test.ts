import { describe, expect, it } from 'vitest';
import { isReadonly, PLAIN_CONFIG, presentationOf } from '../src/renderers/ui/control-presentation';

// Doc 211 rules 1-4 — the presentation axis. Pure, so it is exercised directly rather than through
// <JsonForms>, exactly as doc 182's option sanitisers are.

describe('presentationOf (rules 1-2)', () => {
  it('reads an absent config as "fill"', () => {
    expect(presentationOf(undefined)).toBe('fill');
    expect(presentationOf({})).toBe('fill');
  });

  it('reads config.readonly true as "readonly", so doc 202 rule 50 is unchanged', () => {
    expect(presentationOf({ readonly: true })).toBe('readonly');
    // The review page's own config, verbatim — it must keep meaning what it meant.
    expect(presentationOf({ readonly: true, plainFormTitle: true })).toBe('readonly');
  });

  it('reads config.presentation "plain" as "plain"', () => {
    expect(presentationOf({ presentation: 'plain' })).toBe('plain');
  });

  it('lets presentation "plain" win over a readonly flag set alongside it (rule 3)', () => {
    expect(presentationOf({ presentation: 'plain', readonly: true })).toBe('plain');
    expect(presentationOf(PLAIN_CONFIG)).toBe('plain');
  });

  it('reads an unrecognised presentation value as "fill" — the authored end', () => {
    expect(presentationOf({ presentation: 'PLAIN' })).toBe('fill');
    expect(presentationOf({ presentation: 'text' })).toBe('fill');
    expect(presentationOf({ presentation: true })).toBe('fill');
  });

  it('reads a non-object config (null, a string, undefined) as "fill"', () => {
    expect(presentationOf(null)).toBe('fill');
    expect(presentationOf('plain')).toBe('fill');
    expect(presentationOf(42)).toBe('fill');
  });

  it('reads a falsy readonly as "fill", so only an explicit true turns it on', () => {
    expect(presentationOf({ readonly: false })).toBe('fill');
    expect(presentationOf({ readonly: 'true' })).toBe('fill');
  });
});

describe('isReadonly keeps its meaning (rule 2)', () => {
  it('is true for a readonly config', () => {
    expect(isReadonly({ readonly: true })).toBe(true);
  });

  it('is true for a plain config, so every existing caller needs no edit', () => {
    expect(isReadonly({ presentation: 'plain' })).toBe(true);
    expect(isReadonly(PLAIN_CONFIG)).toBe(true);
  });

  it('is false for a fill config', () => {
    expect(isReadonly({})).toBe(false);
    expect(isReadonly(undefined)).toBe(false);
  });
});

describe('PLAIN_CONFIG (rule 3)', () => {
  it('sets readonly as well, so JSONForms own view of the subtree agrees with ours', () => {
    // JSONForms reads `config.readonly` itself and reports `enabled: false` for the subtree; a plain config
    // that set only `presentation` would leave the two disagreeing.
    expect(PLAIN_CONFIG.readonly).toBe(true);
    expect(PLAIN_CONFIG.presentation).toBe('plain');
  });
});
