import type { UISchemaElement } from '@jsonforms/core';
import { describe, expect, it, vi } from 'vitest';
import { createElementIds } from '../src/studio/layout/element-ids';
import { insertForm, insertStage } from '../src/studio/layout/flow-edits';
import {
  addressOf,
  authoredFormId,
  authoredIdsUsed,
  formIdsUsed,
  resolveAddress,
} from '../src/studio/layout/form-address';

// Doc 197 rules 1-5 — the Form address: an authored `options.id` that survives a reload, unlike the
// per-mount studio ids. Pure module (`studio/layout/form-address.ts`), so no React and no rendering.

type Element = UISchemaElement & { elements?: Element[] };
const el = (element: object) => element as Element;

const form = (options?: object, label = 'Form') =>
  el({ type: 'Form', label, elements: [], ...(options ? { options } : {}) });

/** Flow [ Applicant [ contact 'f1', plain (no id) ], Review [ decision 'f3' ] ]. */
function fixture() {
  const contact = form({ id: 'f1' }, 'Contact');
  const plain = form(undefined, 'Plain');
  const decision = form({ id: 'f3' }, 'Decision');
  const applicant = el({
    type: 'Stage',
    label: 'Applicant',
    options: { id: 's1' },
    elements: [contact, plain],
  });
  const review = el({
    type: 'Stage',
    label: 'Review',
    options: { id: 's2' },
    elements: [decision],
  });
  const flow = el({ type: 'Flow', elements: [applicant, review] });
  return { flow, applicant, review, contact, plain, decision };
}

/** A generator handing out `values` in order, like the key generators the studio passes in. */
const ids = (...values: string[]) => {
  const queue = [...values];
  return vi.fn(() => {
    const next = queue.shift();
    if (next === undefined) throw new Error('no more ids');
    return next;
  });
};

describe('authoredFormId (rule 1)', () => {
  it('returns options.id when it is a non-empty string', () => {
    expect(authoredFormId(form({ id: 'abcd1234' }))).toBe('abcd1234');
    expect(authoredFormId(form({ id: 'f1', gap: 'lg' }))).toBe('f1');
  });

  it('returns undefined for an absent, empty or non-string options.id', () => {
    expect(authoredFormId(form())).toBeUndefined();
    expect(authoredFormId(form({ gap: 'md' }))).toBeUndefined();
    expect(authoredFormId(form({ id: '' }))).toBeUndefined();
    expect(authoredFormId(form({ id: 7 }))).toBeUndefined();
    expect(authoredFormId(form({ id: null }))).toBeUndefined();
  });
});

describe('formIdsUsed (rule 2)', () => {
  it('collects every authored Form id in the document, across Stages', () => {
    expect(formIdsUsed(fixture().flow)).toEqual(new Set(['f1', 'f3']));
  });

  it('ignores Stage ids and Forms with no authored id', () => {
    const used = formIdsUsed(fixture().flow);
    expect(used.has('s1')).toBe(false);
    expect(used.has('s2')).toBe(false);
    expect(used.size).toBe(2);
  });

  it('reads a Form root, and an empty document, without failing', () => {
    expect(formIdsUsed(form({ id: 'root1' }))).toEqual(new Set(['root1']));
    expect(formIdsUsed(el({ type: 'Flow', elements: [] }))).toEqual(new Set());
  });

  it('collects Stage ids alongside Form ids in authoredIdsUsed (rule 19)', () => {
    expect(authoredIdsUsed(fixture().flow)).toEqual(new Set(['s1', 's2', 'f1', 'f3']));
  });
});

describe('addressOf (rule 2)', () => {
  it('returns the authored id of the Form with that studio id', () => {
    const { flow, contact, decision } = fixture();
    const elementIds = createElementIds();
    expect(addressOf(flow, elementIds.idOf(contact), elementIds)).toBe('f1');
    expect(addressOf(flow, elementIds.idOf(decision), elementIds)).toBe('f3');
  });

  it('returns null for a Form with no authored id, and for an unknown studio id', () => {
    const { flow, plain } = fixture();
    const elementIds = createElementIds();
    expect(addressOf(flow, elementIds.idOf(plain), elementIds)).toBeNull();
    expect(addressOf(flow, 'el-999', elementIds)).toBeNull();
    expect(addressOf(flow, null, elementIds)).toBeNull();
  });

  it('returns null for an element that is not a Form, such as its Stage', () => {
    const { flow, applicant } = fixture();
    const elementIds = createElementIds();
    expect(addressOf(flow, elementIds.idOf(applicant), elementIds)).toBeNull();
    expect(addressOf(flow, elementIds.idOf(flow), elementIds)).toBeNull();
  });
});

describe('resolveAddress (rules 2-3)', () => {
  it('returns the studio id of the Form carrying that address', () => {
    const { flow, contact, decision } = fixture();
    const elementIds = createElementIds();
    expect(resolveAddress(flow, 'f1', elementIds)).toBe(elementIds.idOf(contact));
    expect(resolveAddress(flow, 'f3', elementIds)).toBe(elementIds.idOf(decision));
  });

  it('returns the first Form in document order when two share an address', () => {
    const first = form({ id: 'dup' }, 'First');
    const second = form({ id: 'dup' }, 'Second');
    const flow = el({
      type: 'Flow',
      elements: [
        el({ type: 'Stage', options: { id: 's1' }, elements: [first] }),
        el({ type: 'Stage', options: { id: 's2' }, elements: [second] }),
      ],
    });
    const elementIds = createElementIds();
    expect(resolveAddress(flow, 'dup', elementIds)).toBe(elementIds.idOf(first));
    expect(resolveAddress(flow, 'dup', elementIds)).not.toBe(elementIds.idOf(second));
  });

  it('returns null for an unknown, empty or null address', () => {
    const { flow } = fixture();
    const elementIds = createElementIds();
    expect(resolveAddress(flow, 'nope', elementIds)).toBeNull();
    expect(resolveAddress(flow, '', elementIds)).toBeNull();
    expect(resolveAddress(flow, null, elementIds)).toBeNull();
  });

  it('returns null when the root is not a Flow, since only a Flow has drilled-in Forms', () => {
    const nested = form({ id: 'f1' }, 'Nested');
    const root = el({ type: 'Form', elements: [nested] });
    expect(resolveAddress(root, 'f1', createElementIds())).toBeNull();
  });
});

describe('insertForm / insertStage stamp a Form id (rules 4-5)', () => {
  it('gives an inserted Form a fresh authored id', () => {
    const { flow, applicant } = fixture();
    const elementIds = createElementIds();
    const result = insertForm(flow, elementIds.idOf(applicant), elementIds, ids('newform1'));

    expect(authoredFormId(result.inserted as UISchemaElement)).toBe('newform1');
    expect(formIdsUsed(result.uischema)).toEqual(new Set(['f1', 'f3', 'newform1']));
  });

  it("gives the Form inside an inserted Stage a fresh authored id, alongside the Stage's own", () => {
    const { flow } = fixture();
    const elementIds = createElementIds();
    const result = insertStage(flow, null, elementIds, ids('newstage', 'newform1'));

    const stage = result.inserted as Element;
    expect(stage.options?.['id']).toBe('newstage');
    const inner = stage.elements?.[0] as UISchemaElement;
    expect(authoredFormId(inner)).toBe('newform1');
    expect(formIdsUsed(result.uischema)).toEqual(new Set(['f1', 'f3', 'newform1']));
  });

  it('regenerates the id while the generated one is already used in the document', () => {
    const { flow, applicant } = fixture();
    const elementIds = createElementIds();
    const newId = ids('f1', 'f3', 'free1');
    const result = insertForm(flow, elementIds.idOf(applicant), elementIds, newId);

    expect(authoredFormId(result.inserted as UISchemaElement)).toBe('free1');
    expect(newId).toHaveBeenCalledTimes(3);
  });

  it('leaves a Form authored without an id addressless rather than stamping one on render', () => {
    const { flow, plain } = fixture();
    expect(authoredFormId(plain)).toBeUndefined();
    expect(addressOf(flow, createElementIds().idOf(plain), createElementIds())).toBeNull();
    expect(formIdsUsed(flow).size).toBe(2);
  });
});
