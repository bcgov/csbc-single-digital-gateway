import { describe, expect, it } from 'vitest';
import { draftFrom, editRow, type Option } from '../src/studio/options/option-draft';
import { carryIds, detectDelimiter, parseImport } from '../src/studio/options/option-import';
import type { ChoiceOption } from '../src/renderers/ui/choice-options';

// Doc 255 rules 9-10 (ported from @repo/forms doc 208 rules 8-12) — pasted text becoming rows. Pure.

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

const OPTIONS: ChoiceOption[] = [
  { value: 'bc', label: 'British Columbia', description: 'West coast' },
  { value: 'ab', label: 'Alberta' },
];
const ids = (draft: readonly Option[]) => draft.map((row) => row.id);

describe('carryIds — Replace keeps identity, so the cascade reads it right (rule 10)', () => {
  it('keeps the id of a row whose VALUE is unchanged, even when its label changed, and across a reorder', () => {
    const existing = draftFrom(OPTIONS);
    const carried = carryIds(parseImport('Alberta,ab\nB.C.,bc'), existing);
    expect(ids(carried)).toEqual([existing[1]?.id, existing[0]?.id]);
    expect(carried[1]?.label).toBe('B.C.');
  });

  it('gives a CHANGED value or a new row a fresh id, so it reads as delete-plus-add', () => {
    const existing = draftFrom(OPTIONS);
    const carried = carryIds(
      parseImport('British Columbia,brit_col\nAlberta,ab\nOntario,on'),
      existing,
    );
    expect(carried[0]?.id).not.toBe(existing[0]?.id);
    expect(carried[1]?.id).toBe(existing[1]?.id);
    expect(new Set(ids(carried)).size).toBe(3);
  });

  it('takes each existing id ONCE when a value repeats', () => {
    const existing = draftFrom(OPTIONS);
    const carried = carryIds(parseImport('One,bc\nTwo,bc'), existing);
    expect(carried[0]?.id).toBe(existing[0]?.id);
    expect(carried[1]?.id).not.toBe(existing[0]?.id);
  });

  it('marks imported rows touched, so a later label edit does not re-slug them', () => {
    const carried = carryIds(parseImport('British Columbia,bc'), []);
    expect(editRow(carried, carried[0]!.id, { label: 'Anything Else' })[0]?.value).toBe('bc');
  });
});
