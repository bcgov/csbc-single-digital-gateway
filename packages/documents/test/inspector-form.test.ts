import { describe, expect, it } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { inspectorForm } from '../src/studio/inspector/inspector-form';
import { inspectorTarget } from '../src/studio/inspector/inspector-target';
import { control, form, funnel } from './funnel-fixtures';

const content = (root: Uischema, properties: Record<string, unknown> = {}): DocumentContent => ({
  schema: { type: 'object', properties },
  variants: { default: root },
});

/** The inspector form for the element `id` on Form `F`'s page (or the root when `id` is null). */
function formFor(root: Uischema, id: string | null, properties: Record<string, unknown> = {}) {
  const target = inspectorTarget(content(root, properties), {
    pageSelectedId: id,
    focusedId: id === null ? null : 'F',
    formId: id === null ? null : 'F',
  });
  if (target === null) throw new Error('no target');
  return inspectorForm(target);
}

/** `[section, [field labels]]` in display order. */
function layoutOf(uischema: Record<string, unknown>) {
  return (uischema['elements'] as Array<{ label: string; elements: Array<{ label: string }> }>).map(
    (group) => [group.label, group.elements.map((c) => c.label)],
  );
}

const page = (...elements: Uischema[]) => form('F', 'Page', elements);

describe('inspectorForm (doc 249 fields table)', () => {
  it('builds Name for a Funnel and Title, Description, Spacing for a Form', () => {
    expect(layoutOf(formFor(funnel([], []), null).uischema)).toEqual([['General', ['Name']]]);
    expect(layoutOf(formFor(page(), 'F').uischema)).toEqual([
      ['General', ['Title', 'Description']],
      ['Appearance', ['Spacing']],
    ]);
  });

  it('builds Text, Level, Size for a Heading and Spacing for a VerticalLayout', () => {
    const root = page(
      { id: 'h', type: 'Heading' },
      { id: 'v', type: 'VerticalLayout', elements: [] },
    );
    expect(layoutOf(formFor(root, 'h').uischema)).toEqual([
      ['General', ['Text']],
      ['Appearance', ['Level', 'Size']],
    ]);
    expect(layoutOf(formFor(root, 'v').uischema)).toEqual([['Appearance', ['Spacing']]]);
  });

  it('builds Label, Description, Required for every control kind', () => {
    const schemas = {
      b: { type: 'boolean' },
      s: { type: 'string' },
      n: { type: 'number' },
      c: { type: 'string', oneOf: [{ const: 'a' }] },
      m: { type: 'array', items: { oneOf: [{ const: 'a' }] } },
    };
    const root = page(...Object.keys(schemas).map((key) => control(key)));
    for (const key of Object.keys(schemas)) {
      const [general] = layoutOf(formFor(root, `c-${key}`, schemas).uischema);
      expect(general, key).toEqual(['General', ['Label', 'Description', 'Required']]);
    }
  });

  it('offers Display as with the two variants of the kind', () => {
    const root = page(control('b'), control('m'));
    const schemas = {
      b: { type: 'boolean' },
      m: { type: 'array', items: { oneOf: [{ const: 1 }] } },
    };
    const props = (id: string) =>
      formFor(root, id, schemas).schema['properties'] as Record<string, Record<string, unknown>>;
    expect(props('c-b')['component']).toEqual({
      type: 'string',
      oneOf: [
        { const: 'checkbox', title: 'Checkbox' },
        { const: 'switch', title: 'Switch' },
      ],
    });
    expect(props('c-m')['component']?.['oneOf']).toEqual([
      { const: 'multi-select', title: 'Multi-select' },
      { const: 'checkbox-group', title: 'Checkbox group' },
    ]);
    expect(formFor(root, 'c-b', schemas).schema['required']).toEqual(['component']);
  });

  it('adds Placeholder, Rows and length limits for text kinds; Whole numbers, Minimum, Maximum, Step for number', () => {
    const root = page(
      control('t'),
      { ...control('a'), options: { component: 'textarea' } },
      control('n'),
    );
    const schemas = { t: { type: 'string' }, a: { type: 'string' }, n: { type: 'integer' } };
    const rest = (id: string) => layoutOf(formFor(root, id, schemas).uischema).slice(1);
    expect(rest('c-t')).toEqual([
      ['Validation', ['Minimum length', 'Maximum length']],
      ['Appearance', ['Display as', 'Placeholder']],
    ]);
    expect(rest('c-a')).toEqual([
      ['Validation', ['Minimum length', 'Maximum length']],
      ['Appearance', ['Display as', 'Placeholder', 'Rows']],
    ]);
    expect(rest('c-n')).toEqual([
      ['Validation', ['Whole numbers only', 'Minimum', 'Maximum', 'Step']],
      ['Appearance', ['Placeholder']],
    ]);
  });

  it('orders sections General, Validation, Appearance and drops empty ones', () => {
    const sections = layoutOf(
      formFor(page(control('n')), 'c-n', { n: { type: 'number' } }).uischema,
    );
    expect(sections.map(([section]) => section)).toEqual(['General', 'Validation', 'Appearance']);
    expect(
      layoutOf(formFor(page(control('b')), 'c-b', { b: { type: 'boolean' } }).uischema).map(
        ([section]) => section,
      ),
    ).toEqual(['General', 'Appearance']);
  });

  it('reads current values, with the effective control description', () => {
    const c = {
      ...control('t'),
      options: { component: 'textarea', description: 'Override', rows: 5 },
    };
    const heading = { id: 'h', type: 'Heading', options: { text: 'Hi', size: 3 } };
    const schemas = { t: { type: 'string', title: 'Bio', description: 'Prop', maxLength: 50 } };
    const root = page(c, heading);
    expect(formFor(root, 'c-t', schemas).data).toEqual({
      label: 'Bio',
      description: 'Override',
      required: false,
      maxLength: 50,
      component: 'textarea',
      rows: 5,
    });
    expect(formFor(root, 'h').data).toEqual({ headingText: 'Hi', headingLevel: 2, headingSize: 3 });
    expect(formFor(root, 'F').data).toEqual({ formTitle: 'Page', gap: 'md' });
  });

  it('returns no fields for a Separator or unknown kind', () => {
    const root = page({ id: 's', type: 'Separator' }, { id: 'x', type: 'Mystery' });
    for (const id of ['s', 'x']) {
      const view = formFor(root, id);
      expect(view.empty).toBe(true);
      expect(view.uischema['elements']).toEqual([]);
      expect(view.data).toEqual({});
    }
  });
});

describe('rich fields (doc 250 rule 18)', () => {
  it('gives rich text Label, Description, Required and Placeholder, and rich content nothing', () => {
    const root = page(control('bio'), { id: 'rc', type: 'RichContent' });
    const schemas = { bio: { type: 'object', required: ['root'], title: 'Bio' } };
    expect(layoutOf(formFor(root, 'c-bio', schemas).uischema)).toEqual([
      ['General', ['Label', 'Description', 'Required']],
      ['Appearance', ['Placeholder']],
    ]);
    const richContent = formFor(root, 'rc', schemas);
    expect(richContent.empty).toBe(true);
    expect(richContent.uischema['elements']).toEqual([]);
  });
});
