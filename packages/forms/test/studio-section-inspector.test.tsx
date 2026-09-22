import type { UISchemaElement } from '@jsonforms/core';
import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SECTION_FIELDS } from '../src/studio/inspector/section-fields';
import type { InspectorContext } from '../src/studio/inspector/inspector-context';
import type { InspectorField } from '../src/studio/inspector/inspector-fields';
import { renderSeededStudio } from './render-studio';
import { richText } from './rich-text-fixtures';

// Doc 212 rules 20-22 — what the inspector shows for a selected Section.
//
// The field DEFINITIONS are exercised directly (doc 182's discipline for anything pure): `applies`, `read` and
// `write` are plain functions, and asserting them here says exactly what each rule claims. One end-to-end render
// then pins that a real selected Section reaches those fields at all.

const field = (key: string): InspectorField => {
  const found = SECTION_FIELDS.find((entry) => entry.key === key);
  if (!found) throw new Error(`no ${key} field`);
  return found;
};

const el = (element: object) => element as UISchemaElement;
const section = (options: object = {}) =>
  el({ type: 'Section', label: 'Contact', elements: [], options });

/** Just enough context for a field's `applies` and `read`; the fields read nothing else. */
const ctxFor = (element: UISchemaElement) => ({ element }) as unknown as InspectorContext;

/**
 * What `write` produces, as the edited element. `write` RETURNS a new edit — it never mutates the one it is
 * given — so the result is read from the return value.
 */
const writeOn = (key: string, element: UISchemaElement, value: unknown) => {
  const edit = { element } as unknown as Parameters<InspectorField['write']>[1];
  return field(key).write(ctxFor(element), edit, value).element as UISchemaElement;
};

describe('the fields a Section shows (rule 20)', () => {
  it('shows Label and Gap with no new field, because both key off the layout kind', () => {
    // Neither is in SECTION_FIELDS: a Section's kind is `vertical`, so LAYOUT_FIELDS already covers it.
    expect(SECTION_FIELDS.map((entry) => entry.key)).toEqual([
      'variant',
      'inset',
      'sectionDescription',
    ]);
  });

  it('shows a Variant picker of plain and container', () => {
    const schema = field('variant').schema(ctxFor(section())) as {
      oneOf: { const: string; title: string }[];
    };
    expect(schema.oneOf.map((entry) => entry.const)).toEqual(['plain', 'container']);
  });

  it('shows a rich Description field, whose schema dispatches the rich text control', () => {
    // Doc 207 rule 31: the rich text property shape IS what picks the control — no inspector-only renderer.
    const schema = field('sectionDescription').schema(ctxFor(section())) as {
      type: string;
      required: string[];
    };
    expect(schema.type).toBe('object');
    expect(schema.required).toEqual(['root']);
  });

  it('shows none of these for an element that is not a Section', () => {
    const heading = ctxFor(el({ type: 'Heading', text: 'One' }));
    const stack = ctxFor(el({ type: 'VerticalLayout', elements: [] }));

    for (const entry of SECTION_FIELDS) {
      expect(entry.applies(heading), entry.key).toBe(false);
      expect(entry.applies(stack), entry.key).toBe(false);
    }
  });
});

describe('the Inset field (rule 21)', () => {
  it('is absent while the variant is plain, rather than present and inert', () => {
    expect(field('inset').applies(ctxFor(section()))).toBe(false);
    expect(field('inset').applies(ctxFor(section({ variant: 'plain' })))).toBe(false);
  });

  it('appears once the variant is container', () => {
    expect(field('inset').applies(ctxFor(section({ variant: 'container' })))).toBe(true);
  });

  it('offers xs through xl and no "none"', () => {
    const schema = field('inset').schema(ctxFor(section({ variant: 'container' }))) as {
      oneOf: { const: string }[];
    };
    expect(schema.oneOf.map((entry) => entry.const)).toEqual(['xs', 'sm', 'md', 'lg', 'xl']);
  });
});

describe('reading the current value', () => {
  it('reads the EFFECTIVE variant and inset, so the field shows what the Section IS', () => {
    expect(field('variant').read(ctxFor(section()))).toBe('plain');
    expect(field('inset').read(ctxFor(section({ variant: 'container' })))).toBe('md');
    expect(field('inset').read(ctxFor(section({ variant: 'container', inset: 'xs' })))).toBe('xs');
  });

  it('reads an unusable authored value as the default rather than showing it', () => {
    expect(field('variant').read(ctxFor(section({ variant: 'boxed' })))).toBe('plain');
  });

  it('reads a rich description, and nothing for a malformed one', () => {
    const value = richText('Tell us more');
    expect(field('sectionDescription').read(ctxFor(section({ description: value })))).toBeDefined();
    expect(
      field('sectionDescription').read(ctxFor(section({ description: 'plain text' }))),
    ).toBeUndefined();
  });
});

describe('writing back', () => {
  it('writes options.variant when container is chosen', () => {
    const written = writeOn('variant', section(), 'container');
    expect(written?.options?.['variant']).toBe('container');
  });

  it('REMOVES options.variant when plain is chosen back, rather than storing the default', () => {
    const written = writeOn('variant', section({ variant: 'container' }), 'plain');
    expect(written?.options?.['variant']).toBeUndefined();
  });

  it('removes options.inset when the default is chosen', () => {
    const written = writeOn('inset', section({ variant: 'container', inset: 'xl' }), 'md');
    expect(written?.options?.['inset']).toBeUndefined();
  });

  it('writes options.description as rich content, and removes it when emptied', () => {
    const value = richText('Tell us more');
    expect(writeOn('sectionDescription', section(), value)?.options?.['description']).toBe(value);
    expect(
      writeOn('sectionDescription', section({ description: value }), undefined)?.options?.[
        'description'
      ],
    ).toBeUndefined();
  });

  it('leaves an authored inset alone when the variant goes back to plain (rule 16)', () => {
    // Inert, not stripped: the Section remembers its inset for when it becomes a container again.
    const written = writeOn('variant', section({ variant: 'container', inset: 'xl' }), 'plain');
    expect(written?.options?.['inset']).toBe('xl');
  });
});

describe('a Section selected in the studio', () => {
  const sectionDocument = el({
    type: 'Form',
    label: 'Untitled form',
    elements: [{ type: 'Section', label: 'Contact', elements: [] }],
  });

  it('reaches the Section fields, and the layout ones it inherits', async () => {
    const view = renderSeededStudio({ uischema: sectionDocument });
    const frame = await screen.findByText('Contact');
    // Selection is a pointer press on the element's studio frame (doc 183).
    fireEvent.pointerDown(frame);
    fireEvent.pointerUp(document);

    const inspector = view.container.querySelector<HTMLElement>('[data-studio-inspector]');
    if (!inspector) throw new Error('no inspector');
    const panel = within(inspector);

    expect(panel.getByRole('combobox', { name: 'Variant' })).toBeInTheDocument();
    // Rule 20: these two arrive from LAYOUT_FIELDS, with no field of their own.
    expect(panel.getByRole('combobox', { name: 'Gap' })).toBeInTheDocument();
    expect(panel.getByRole('textbox', { name: 'Label' })).toBeInTheDocument();
    // Rule 21: plain by default, so no Inset control yet.
    expect(panel.queryByRole('combobox', { name: 'Inset' })).toBeNull();
  });
});
