import { describe, expect, it } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { findById } from '../src/studio/element-ids';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { inspectorForm } from '../src/studio/inspector/inspector-form';
import { inspectorTarget } from '../src/studio/inspector/inspector-target';
import { control, form } from './funnel-fixtures';
import { richText } from './rich-text-fixtures';

const content = (
  elements: Uischema[],
  properties: Record<string, unknown> = {},
  required?: string[],
): DocumentContent => ({
  schema: { type: 'object', properties, ...(required && { required }) },
  variants: { default: form('F', 'Page', elements) },
});

/** Applies the inspector form's current data with `changes` over it, as JSONForms would emit it. */
function edit(c: DocumentContent, id: string, changes: Record<string, unknown>) {
  const target = inspectorTarget(c, { pageSelectedId: id, focusedId: 'F', formId: 'F' })!;
  const values = { ...inspectorForm(target).data, ...changes };
  for (const [key, value] of Object.entries(changes)) if (value === undefined) delete values[key];
  return applyInspector(c, target, values);
}

const element = (c: DocumentContent, id: string) => findById(c.variants.default, id);
const property = (c: DocumentContent, key: string) =>
  (c.schema['properties'] as Record<string, unknown>)[key];

describe('applyInspector (doc 249 rules 7-15)', () => {
  it('returns the same content object when no value changed', () => {
    const c = content([control('t'), { id: 'h', type: 'Heading' }], { t: { type: 'string' } });
    expect(edit(c, 'c-t', {})).toBe(c);
    expect(edit(c, 'h', {})).toBe(c);
    expect(edit(c, 'F', {})).toBe(c);
  });

  it('writes a Form title and description into the uischema', () => {
    // The description is rich text (doc 251 rule 7).
    const description = richText('Tell us.');
    const next = edit(content([]), 'F', { formTitle: 'About you', formDescription: description });
    expect(next.variants.default).toMatchObject({
      label: 'About you',
      options: { description },
    });
  });

  it('removes a key for an emptied value or a default value', () => {
    const c = content([{ id: 'h', type: 'Heading', options: { text: 'Hi', level: 3, size: 4 } }]);
    const next = edit(c, 'h', { headingText: undefined, headingLevel: 2, headingSize: undefined });
    expect(element(next, 'h')).toEqual({ id: 'h', type: 'Heading', options: {} });
    const page = edit(content([]), 'F', { formTitle: undefined, gap: 'lg' });
    expect(page.variants.default).toEqual({
      id: 'F',
      type: 'Form',
      elements: [],
      options: { gap: 'lg' },
    });
  });

  it('writes the palette spelling of Display as, removing component for Checkbox and Text', () => {
    const c = content([control('b'), { ...control('t'), options: { component: 'textarea' } }], {
      b: { type: 'boolean' },
      t: { type: 'string' },
    });
    expect(element(edit(c, 'c-b', { component: 'switch' }), 'c-b')?.['options']).toEqual({
      component: 'switch',
    });
    expect(element(edit(c, 'c-t', { component: 'text' }), 'c-t')?.['options']).toEqual({});
  });

  it('writes Label, Description and limits into the schema property', () => {
    const c = content([control('t')], { t: { type: 'string', title: 'Old' } });
    const next = edit(c, 'c-t', {
      label: 'Name',
      description: 'As on your ID.',
      minLength: 1,
      maxLength: 40,
    });
    expect(property(next, 't')).toEqual({
      type: 'string',
      title: 'Name',
      description: 'As on your ID.',
      minLength: 1,
      maxLength: 40,
    });
    expect(next.variants).toBe(c.variants);
  });

  it('removes the Control options.description override when Description is written', () => {
    const c = content([{ ...control('t'), options: { description: 'Override' } }], {
      t: { type: 'string', description: 'Prop' },
    });
    const next = edit(c, 'c-t', { description: 'New' });
    expect(property(next, 't')).toEqual({ type: 'string', description: 'New' });
    expect(element(next, 'c-t')?.['options']).toEqual({});
  });

  it('adds and removes the key from required, dropping an empty required array', () => {
    const c = content([control('t')], { t: { type: 'string' } });
    const on = edit(c, 'c-t', { required: true });
    expect(on.schema['required']).toEqual(['t']);
    expect('required' in edit(on, 'c-t', { required: false }).schema).toBe(false);
  });

  it('switches type between number and integer, keeping bounds and step', () => {
    const c = content([control('n')], { n: { type: 'number', minimum: 0, multipleOf: 0.5 } });
    const whole = edit(c, 'c-n', { integer: true });
    expect(property(whole, 'n')).toEqual({ type: 'integer', minimum: 0, multipleOf: 0.5 });
    expect(property(edit(whole, 'c-n', { integer: false }), 'n')).toEqual({
      type: 'number',
      minimum: 0,
      multipleOf: 0.5,
    });
  });

  it('never writes a value the field schema rejects (negative maxLength, zero step)', () => {
    const c = content(
      [control('t'), control('n'), { ...control('a'), options: { component: 'textarea' } }],
      {
        t: { type: 'string', maxLength: 5 },
        n: { type: 'number' },
        a: { type: 'string' },
      },
    );
    expect(edit(c, 'c-t', { maxLength: -1 })).toBe(c);
    expect(edit(c, 'c-t', { minLength: 1.5 })).toBe(c);
    expect(edit(c, 'c-n', { step: 0 })).toBe(c);
    expect(edit(c, 'c-a', { rows: 40 })).toBe(c);
    // A valid field in the same emit is still written.
    expect(property(edit(c, 'c-t', { maxLength: -1, label: 'T' }), 't')).toEqual({
      type: 'string',
      maxLength: 5,
      title: 'T',
    });
  });
});

describe('rich Form description writes (doc 251 rule 7)', () => {
  it('writes a rich state, removes the key for no text, and leaves an untouched legacy string alone', () => {
    const legacy: DocumentContent = {
      schema: { type: 'object', properties: {} },
      variants: { default: { ...form('F', 'Page'), options: { description: 'Old text' } } },
    };
    expect(edit(legacy, 'F', {})).toBe(legacy);
    expect(edit(legacy, 'F', { formTitle: 'New' }).variants.default['options']).toEqual({
      description: 'Old text',
    });
    const rich = richText('New text');
    const written = edit(legacy, 'F', { formDescription: rich });
    expect(written.variants.default['options']).toEqual({ description: rich });
    expect(edit(written, 'F', { formDescription: undefined }).variants.default['options']).toEqual(
      {},
    );
    expect(edit(written, 'F', { formDescription: 'plain string' })).toBe(written);
  });
});
