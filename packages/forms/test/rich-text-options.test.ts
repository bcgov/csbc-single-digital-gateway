import { describe, expect, it } from 'vitest';
import { richTextConfig, RICH_TEXT_FEATURES } from '../src/renderers/ui/rich-text-options';

// Doc 207 rules 10-14 — the authored `uischema.options` for a rich text control, sanitised.
//
// Following `control-options.ts` (doc 182): a wrong-typed value becomes an ABSENT KEY, never `undefined`,
// because of `exactOptionalPropertyTypes`.

const has = (config: object, key: string) => key in config;

describe('the feature allow-list (rule 11)', () => {
  it('offers exactly the closed set', () => {
    expect([...RICH_TEXT_FEATURES]).toEqual([
      'bold',
      'italic',
      'underline',
      'heading',
      'bulletList',
      'numberedList',
      'link',
    ]);
  });

  it('leaves the toolbar ABSENT when none is authored, which means all of them', () => {
    expect(has(richTextConfig({}), 'toolbar')).toBe(false);
    expect(has(richTextConfig(undefined), 'toolbar')).toBe(false);
  });

  it('keeps the authored order and drops unknown entries', () => {
    expect(richTextConfig({ toolbar: ['link', 'nonsense', 'bold'] }).toolbar).toEqual([
      'link',
      'bold',
    ]);
  });

  it('keeps an EMPTY list, which means a toolbar-less editor', () => {
    // Distinct from absent: an author asking for no toolbar is not an author asking for the default.
    expect(richTextConfig({ toolbar: [] }).toolbar).toEqual([]);
  });

  it('drops a toolbar that is not an array, or whose entries are not strings', () => {
    expect(has(richTextConfig({ toolbar: 'bold' }), 'toolbar')).toBe(false);
    expect(richTextConfig({ toolbar: [1, 'bold'] }).toolbar).toEqual(['bold']);
  });

  it('de-duplicates repeated features', () => {
    expect(richTextConfig({ toolbar: ['bold', 'bold'] }).toolbar).toEqual(['bold']);
  });
});

describe('placeholder (rule 12)', () => {
  it('keeps a non-empty string', () => {
    expect(richTextConfig({ placeholder: 'Describe it' }).placeholder).toBe('Describe it');
  });

  it('drops an empty string and a wrong type', () => {
    expect(has(richTextConfig({ placeholder: '' }), 'placeholder')).toBe(false);
    expect(has(richTextConfig({ placeholder: 3 }), 'placeholder')).toBe(false);
  });
});

describe('rows (rule 13)', () => {
  it('keeps a positive whole number', () => {
    expect(richTextConfig({ rows: 6 }).rows).toBe(6);
  });

  it('drops a fractional, zero, negative or non-finite value', () => {
    for (const rows of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '6'])
      expect(has(richTextConfig({ rows }), 'rows'), String(rows)).toBe(false);
  });

  it('clamps an absurd value rather than passing it through', () => {
    expect(richTextConfig({ rows: 10_000 }).rows).toBe(50);
  });
});

describe('readOnly (rule 14)', () => {
  it('keeps a boolean', () => {
    expect(richTextConfig({ readOnly: true }).readOnly).toBe(true);
    expect(richTextConfig({ readOnly: false }).readOnly).toBe(false);
  });

  it('drops a non-boolean — "true" is not true', () => {
    expect(has(richTextConfig({ readOnly: 'true' }), 'readOnly')).toBe(false);
  });
});

describe('unknown options', () => {
  it('ignores keys it does not know, rather than passing them to the editor', () => {
    expect(richTextConfig({ mask: '999', component: 'textarea' })).toEqual({});
  });
});
