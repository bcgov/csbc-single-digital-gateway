import { describe, expect, it } from 'vitest';
import { detectDelimiter, parseImport } from '../src/studio/options/option-import';

// Doc 208 rules 8-12 — pasted text becoming rows. Pure.

describe('detectDelimiter (rule 8)', () => {
  it('prefers tab, then comma, then pipe', () => {
    expect(detectDelimiter('a\tb,c|d')).toBe('\t');
    expect(detectDelimiter('a,b|c')).toBe(',');
    expect(detectDelimiter('a|b')).toBe('|');
  });

  it('reports none for a single column', () => {
    expect(detectDelimiter('Alberta\nBritish Columbia')).toBeNull();
  });

  it('reports none for empty text', () => {
    expect(detectDelimiter('')).toBeNull();
    expect(detectDelimiter('   \n  ')).toBeNull();
  });
});

describe('parseImport (rules 8-10)', () => {
  it('reads label, value and description in that order', () => {
    expect(parseImport('Alberta,ab,The prairies')).toEqual([
      { label: 'Alberta', value: 'ab', description: 'The prairies' },
    ]);
  });

  it('reads a single column as labels, slugging the values (rule 8)', () => {
    expect(parseImport('Nova Scotia\nAlberta')).toEqual([
      { label: 'Nova Scotia', value: 'nova_scotia' },
      { label: 'Alberta', value: 'alberta' },
    ]);
  });

  it('handles tab and pipe separated text the same way', () => {
    expect(parseImport('Alberta\tab')).toEqual([{ label: 'Alberta', value: 'ab' }]);
    expect(parseImport('Alberta|ab')).toEqual([{ label: 'Alberta', value: 'ab' }]);
  });

  it('strips surrounding quotes (rule 9)', () => {
    expect(parseImport('"Alberta","ab"')).toEqual([{ label: 'Alberta', value: 'ab' }]);
  });

  it('skips a header row by its FIRST CELL (rule 10)', () => {
    for (const header of ['label', 'Label', 'VALUE', 'name', 'Option'])
      expect(parseImport(`${header},value\nAlberta,ab`), header).toEqual([
        { label: 'Alberta', value: 'ab' },
      ]);
  });

  it('does NOT skip a first row that merely looks like data', () => {
    expect(parseImport('Alberta,ab\nBC,bc')).toHaveLength(2);
  });

  it('drops blank lines', () => {
    expect(parseImport('Alberta,ab\n\n\nBC,bc')).toHaveLength(2);
  });

  it('ignores columns beyond the third', () => {
    expect(parseImport('Alberta,ab,Prairies,ignored')).toEqual([
      { label: 'Alberta', value: 'ab', description: 'Prairies' },
    ]);
  });

  it('parses nothing from empty or header-only text (rule 12)', () => {
    expect(parseImport('')).toEqual([]);
    expect(parseImport('label,value')).toEqual([]);
  });

  it('omits an empty description rather than writing an empty key', () => {
    expect('description' in (parseImport('Alberta,ab,')[0] ?? {})).toBe(false);
  });
});
