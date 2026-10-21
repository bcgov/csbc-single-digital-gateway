import { describe, expect, it } from 'vitest';
import { carryIds, parseBulk, serialiseBulk } from '../src/studio/options/option-bulk';
import { draftFrom, editRow, insertAfter, type Option } from '../src/studio/options/option-draft';
import type { ChoiceOption } from '../src/renderers/ui/choice-control';

// Doc 208 rules 3-7 — the text round-trip, and the ids that make the rename cascade survive it.

const OPTIONS: ChoiceOption[] = [
  { value: 'bc', label: 'British Columbia', description: 'West coast' },
  { value: 'ab', label: 'Alberta' },
];

const ids = (draft: readonly Option[]) => draft.map((row) => row.id);
const values = (draft: readonly Option[]) => draft.map((row) => row.value);

describe('serialiseBulk (rules 3-4)', () => {
  it('writes one option per line as Label | value | Description', () => {
    expect(serialiseBulk(draftFrom(OPTIONS))).toBe(
      'British Columbia | bc | West coast\nAlberta | ab',
    );
  });

  it('omits a trailing empty description rather than leaving a dangling separator', () => {
    expect(serialiseBulk(draftFrom([{ value: 'ab', label: 'Alberta' }]))).toBe('Alberta | ab');
  });

  it('round-trips an empty draft to empty text', () => {
    expect(serialiseBulk([])).toBe('');
  });
});

describe('parseBulk (rules 3-4, 7)', () => {
  it('reads label, value and description', () => {
    expect(parseBulk('British Columbia | bc | West coast')).toEqual([
      { label: 'British Columbia', value: 'bc', description: 'West coast' },
    ]);
  });

  it('slugs a missing value from the label, as typing does (rule 4)', () => {
    expect(parseBulk('Nova Scotia')).toEqual([{ label: 'Nova Scotia', value: 'nova_scotia' }]);
  });

  it('drops blank lines (rule 3)', () => {
    expect(parseBulk('Alberta | ab\n\n   \nBC | bc')).toHaveLength(2);
  });

  it('splits on the FIRST TWO separators only, so a description may contain a pipe (rule 7)', () => {
    expect(parseBulk('Either | either | a | b')).toEqual([
      { label: 'Either', value: 'either', description: 'a | b' },
    ]);
  });

  it('trims each cell', () => {
    expect(parseBulk('  Alberta  |  ab  ')).toEqual([{ label: 'Alberta', value: 'ab' }]);
  });

  it('omits an empty description rather than writing an empty key', () => {
    // `exactOptionalPropertyTypes`: an absent description is an ABSENT KEY, never `undefined`.
    expect('description' in (parseBulk('Alberta | ab |')[0] ?? {})).toBe(false);
  });
});

describe('carryIds — the rename cascade survives the round-trip (rule 5)', () => {
  it('keeps every id when nothing changed', () => {
    const existing = draftFrom(OPTIONS);
    const carried = carryIds(parseBulk(serialiseBulk(existing)), existing);
    expect(ids(carried)).toEqual(ids(existing));
    expect(values(carried)).toEqual(values(existing));
  });

  it('keeps the id of a row whose VALUE is unchanged, even when its label changed', () => {
    const existing = draftFrom(OPTIONS);
    const carried = carryIds(parseBulk('B.C. | bc\nAlberta | ab'), existing);
    expect(ids(carried)).toEqual(ids(existing));
    expect(carried[0]?.label).toBe('B.C.');
  });

  it('gives a CHANGED value a fresh id, so it reads as delete-plus-add', () => {
    // Text carries nothing that could distinguish a rename from a replacement, and guessing would
    // cascade a rewrite of the author's Flow logic that they never asked for.
    const existing = draftFrom(OPTIONS);
    const carried = carryIds(parseBulk('British Columbia | brit_col\nAlberta | ab'), existing);
    expect(carried[0]?.id).not.toBe(existing[0]?.id);
    expect(carried[1]?.id).toBe(existing[1]?.id);
  });

  it('gives a brand new row a fresh id', () => {
    const existing = draftFrom(OPTIONS);
    const carried = carryIds(
      parseBulk('British Columbia | bc\nAlberta | ab\nOntario | on'),
      existing,
    );
    expect(carried).toHaveLength(3);
    expect(ids(carried).slice(0, 2)).toEqual(ids(existing));
    expect(new Set(ids(carried)).size).toBe(3);
  });

  it('keeps ids across a REORDER, since identity is the value not the position', () => {
    const existing = draftFrom(OPTIONS);
    const carried = carryIds(parseBulk('Alberta | ab\nBritish Columbia | bc'), existing);
    expect(ids(carried)).toEqual([existing[1]?.id, existing[0]?.id]);
  });

  it('takes each existing id ONCE when a value repeats (rule 6)', () => {
    const existing = draftFrom(OPTIONS);
    const carried = carryIds(parseBulk('One | bc\nTwo | bc'), existing);
    expect(carried[0]?.id).toBe(existing[0]?.id);
    expect(carried[1]?.id).not.toBe(existing[0]?.id);
    expect(new Set(ids(carried)).size).toBe(2);
  });

  it('marks carried rows touched, so a later label edit does not re-slug them', () => {
    const existing = draftFrom(OPTIONS);
    const carried = carryIds(parseBulk('British Columbia | bc'), existing);
    const relabelled = editRow(carried, carried[0]!.id, { label: 'Anything Else' });
    expect(relabelled[0]?.value).toBe('bc');
  });

  it('carries nothing onto an empty existing list', () => {
    const carried = carryIds(parseBulk('Alberta | ab'), []);
    expect(carried).toHaveLength(1);
    expect(carried[0]?.id).toBeTruthy();
  });

  it('leaves a row added in LIST mode alone — it has no value to match yet', () => {
    const { draft } = insertAfter(draftFrom(OPTIONS), null);
    expect(carryIds(parseBulk(serialiseBulk(draft)), draft)).toHaveLength(2);
  });
});
