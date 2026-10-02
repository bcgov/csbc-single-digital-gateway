import { describe, expect, it } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { inspectorTarget, type TargetInputs } from '../src/studio/inspector/inspector-target';
import { control, edge, form, funnel } from './funnel-fixtures';

const NONE: TargetInputs = { pageSelectedId: null, focusedId: null, formId: null };

const heading: Uischema = { id: 'h1', type: 'Heading', options: { text: ' Eligibility ' } };
const layout: Uischema = { id: 'v1', type: 'VerticalLayout', elements: [control('name')] };

const content = (root: Uischema, properties: Record<string, unknown> = {}, required?: string[]) =>
  ({
    schema: { type: 'object', properties, ...(required && { required }) },
    variants: { default: root },
  }) as DocumentContent;

const twoForms = content(
  funnel([form('A', 'About you', [heading, layout]), form('B', '')], [edge('e1', 'A', 'B')]),
  { name: { type: 'string', title: 'Name' } },
);

describe('inspectorTarget (doc 249 rules 1-6)', () => {
  it('inspects the page element when a Form is focused and the id resolves inside it', () => {
    const target = inspectorTarget(twoForms, { pageSelectedId: 'h1', focusedId: 'A', formId: 'A' });
    expect(target?.id).toBe('h1');
    expect(target?.kind).toBe('heading');
    expect(target?.element).toBe(heading);
  });

  it('skips a stale page selection (deleted, or outside the focused Form) and falls back to the Form', () => {
    const gone = inspectorTarget(twoForms, { pageSelectedId: 'zz', focusedId: 'A', formId: 'A' });
    const elsewhere = inspectorTarget(twoForms, {
      pageSelectedId: 'h1',
      focusedId: 'B',
      formId: 'B',
    });
    expect(gone?.id).toBe('A');
    expect(elsewhere?.id).toBe('B');
    expect(elsewhere?.kind).toBe('form');
  });

  it('ignores the page selection when no Form is focused', () => {
    const target = inspectorTarget(twoForms, {
      pageSelectedId: 'h1',
      focusedId: null,
      formId: 'B',
    });
    expect(target?.id).toBe('B');
    expect(target?.kind).toBe('form');
  });

  it('falls back to the selected/focused Form, then to the root Funnel or root Form', () => {
    const funnelRoot = inspectorTarget(twoForms, NONE);
    const formRoot = inspectorTarget(content(form('R', 'Root')), NONE);
    const selected = inspectorTarget(twoForms, { ...NONE, formId: 'A' });
    expect(funnelRoot?.kind).toBe('funnel');
    expect(funnelRoot?.element).toBe(twoForms.variants.default);
    expect(formRoot?.id).toBe('R');
    expect(selected?.id).toBe('A');
  });

  it('returns null for an empty root', () => {
    expect(inspectorTarget(content({}), NONE)).toBeNull();
    expect(inspectorTarget(content({ id: 'x' }), NONE)).toBeNull();
  });

  it('classifies Controls with the renderer predicates and options.component', () => {
    const kinds = [
      [{ type: 'boolean' }, undefined, 'checkbox'],
      [{ type: 'boolean' }, 'switch', 'switch'],
      [{ type: 'string' }, undefined, 'text'],
      [{ type: 'string' }, 'textarea', 'textarea'],
      [{ type: 'integer' }, undefined, 'number'],
      [{ type: 'string', oneOf: [{ const: 'a' }] }, 'select', 'select'],
      [{ type: 'number', oneOf: [{ const: 1 }] }, 'radio-group', 'radio-group'],
      [{ type: 'array', items: { oneOf: [{ const: 'a' }] } }, undefined, 'multi-select'],
      [{ type: 'array', items: { oneOf: [{ const: 'a' }] } }, 'checkbox-group', 'checkbox-group'],
    ] as const;
    for (const [schema, component, kind] of kinds) {
      const c = { ...control('p'), ...(component && { options: { component } }) };
      const target = inspectorTarget(content(form('F', 'F', [c]), { p: schema }), {
        pageSelectedId: 'c-p',
        focusedId: 'F',
        formId: 'F',
      });
      expect(target?.kind, `${JSON.stringify(schema)} ${component}`).toBe(kind);
    }
  });

  it('classifies a Control with a non-property scope or unmatched schema as unknown', () => {
    const odd = { id: 'odd', type: 'Control', scope: '#/properties/a/properties/b' };
    const root = form('F', 'F', [odd, control('missing'), control('obj')]);
    const c = content(root, { a: { type: 'object' }, obj: { type: 'object' } });
    const at = (id: string) =>
      inspectorTarget(c, { pageSelectedId: id, focusedId: 'F', formId: 'F' });
    expect(at('odd')?.kind).toBe('unknown');
    expect(at('c-missing')?.kind).toBe('unknown');
    expect(at('c-missing')?.property).toBeUndefined();
    expect(at('c-obj')?.kind).toBe('unknown');
  });

  it('names the target: Funnel/Form label, Heading text, Control title else key, with fallbacks', () => {
    const c = content(
      form('F', '  ', [heading, { id: 'h2', type: 'Heading' }, control('a'), control('b')]),
      {
        a: { type: 'string', title: 'Given name' },
        b: { type: 'string' },
      },
    );
    const at = (id: string) =>
      inspectorTarget(c, { pageSelectedId: id, focusedId: 'F', formId: 'F' })?.name;
    expect(at('F')).toBe('Untitled form');
    expect(at('h1')).toBe('Eligibility');
    expect(at('h2')).toBe('Untitled heading');
    expect(at('c-a')).toBe('Given name');
    expect(at('c-b')).toBe('b');
    expect(inspectorTarget(content(funnel([], [])), NONE)?.name).toBe('Funnel');
  });

  it('counts the Controls sharing the bound property', () => {
    const c = content(
      funnel(
        [form('A', 'A', [control('n')]), form('B', 'B', [{ ...control('n'), id: 'c-n2' }])],
        [],
      ),
      { n: { type: 'string' } },
      ['n'],
    );
    const target = inspectorTarget(c, { pageSelectedId: 'c-n', focusedId: 'A', formId: 'A' });
    expect(target?.property).toEqual({
      key: 'n',
      schema: { type: 'string' },
      required: true,
      shared: 2,
    });
  });
});

describe('rich kinds (doc 250 rule 17)', () => {
  it('classifies a rich text Control and a RichContent element', () => {
    const rich = { id: 'rc', type: 'RichContent' };
    const c = content(form('F', 'F', [control('bio'), rich]), {
      bio: { type: 'object', required: ['root'], title: 'Bio' },
    });
    const at = (id: string) =>
      inspectorTarget(c, { pageSelectedId: id, focusedId: 'F', formId: 'F' });
    expect(at('c-bio')).toMatchObject({ kind: 'rich-text', name: 'Bio' });
    expect(at('rc')).toMatchObject({ kind: 'rich-content', name: undefined });
    const plainObject = content(form('F', 'F', [control('o')]), { o: { type: 'object' } });
    expect(
      inspectorTarget(plainObject, { pageSelectedId: 'c-o', focusedId: 'F', formId: 'F' })?.kind,
    ).toBe('unknown');
  });
});
