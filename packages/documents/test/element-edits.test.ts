import { describe, expect, it } from 'vitest';
import { updateElement } from '../src/studio/element-edits';

const form = {
  id: 'form',
  type: 'Form',
  elements: [
    {
      id: 'outer',
      type: 'VerticalLayout',
      elements: [{ id: 'head', type: 'Heading', options: { text: 'Hi', level: 2 } }],
    },
    { id: 'other', type: 'Heading', options: { text: 'Other' } },
  ],
};

describe('updateElement (doc 236)', () => {
  it('merges options shallowly into the element with that id at any depth', () => {
    const next = updateElement(form, 'head', { options: { text: 'Hello' } });
    expect(next).toEqual({
      ...form,
      elements: [
        {
          ...form.elements[0],
          elements: [{ id: 'head', type: 'Heading', options: { text: 'Hello', level: 2 } }],
        },
        form.elements[1],
      ],
    });
    // Untouched siblings keep their identity; the input is never mutated.
    expect((next['elements'] as unknown[])[1]).toBe(form.elements[1]);
    expect(form.elements[0]!.elements![0]!.options.text).toBe('Hi');
  });

  it('removes an option key whose patch value is undefined', () => {
    const next = updateElement(form, 'other', { options: { text: undefined } });
    const other = (next['elements'] as Record<string, unknown>[])[1]!;
    expect(other['options']).toEqual({});
    expect(Object.keys(other['options'] as object)).not.toContain('text');
  });

  it('replaces elements', () => {
    const reversed = form.elements.toReversed();
    const next = updateElement(form, 'form', { elements: reversed });
    expect(next['elements']).toBe(reversed);
    expect(next['type']).toBe('Form');
    expect(next['id']).toBe('form');
  });

  it('returns the same object when no element has the id', () => {
    expect(updateElement(form, 'missing', { options: { text: 'x' } })).toBe(form);
    expect(updateElement({}, 'form', { options: {} })).toEqual({});
  });

  it('sets the top-level label, and removes it for label: undefined', () => {
    const titled = updateElement(form, 'form', { label: 'Eligibility' });
    expect(titled['label']).toBe('Eligibility');
    expect(titled['elements']).toBe(form.elements);
    const untitled = updateElement(titled, 'form', { label: undefined });
    expect(Object.keys(untitled)).not.toContain('label');
    // A patch without the key leaves the label alone.
    expect(updateElement(titled, 'form', { options: { gap: 'sm' } })['label']).toBe('Eligibility');
    // Renaming keeps the key where it was.
    expect(Object.keys(updateElement(titled, 'form', { label: 'Renamed' }))).toEqual(
      Object.keys(titled),
    );
  });
});
