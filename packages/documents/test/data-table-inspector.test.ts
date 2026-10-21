import { describe, expect, it } from 'vitest';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { fieldsFor, inspectorForm } from '../src/studio/inspector/inspector-form';
import { inspectorTarget } from '../src/studio/inspector/inspector-target';
import type { DocumentContent } from '../src/studio/document-types';

const content = (control: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
  ({
    schema: {
      type: 'object',
      properties: {
        people: {
          type: 'array',
          title: 'People',
          items: { type: 'object', properties: { name: { type: 'string' } } },
          ...extra,
        },
      },
    },
    variants: {
      default: {
        id: 'F',
        type: 'Form',
        elements: [{ id: 't', type: 'Control', scope: '#/properties/people', ...control }],
      },
      short: {
        id: 'F',
        type: 'Form',
        elements: [{ id: 't', type: 'Control', scope: '#/properties/people', ...control }],
      },
    },
  }) as DocumentContent;

const target = (c: DocumentContent, variant = 'default') =>
  inspectorTarget(c, { pageSelectedId: 't', focusedId: 'F', formId: 'F' }, variant)!;
const tableOf = (c: DocumentContent) =>
  (c.schema['properties'] as Record<string, Record<string, unknown>>)['people']!;
const optionsOf = (c: DocumentContent) =>
  ((c.variants['default'] as { elements: Record<string, unknown>[] }).elements[0]!['options'] ??
    {}) as Record<string, unknown>;

describe('data table inspector fields (doc 266 rules 7-9)', () => {
  it('offers the row options to a data table only', () => {
    const keys = fieldsFor(target(content())).map((field) => field.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'minRows',
        'maxRows',
        'addRows',
        'deleteRows',
        'addLabel',
        'pageSize',
      ]),
    );
    const form = inspectorForm(target(content()));
    expect(form.data).toMatchObject({ addRows: true, deleteRows: true, pageSize: 10 });
    expect(form.data['minRows']).toBeUndefined();
  });

  it('writes minItems / maxItems to the schema and removes them when cleared', () => {
    const c = content();
    const data = inspectorForm(target(c)).data;
    const next = applyInspector(c, target(c), { ...data, minRows: 1, maxRows: 4 });
    expect(tableOf(next)).toMatchObject({ minItems: 1, maxItems: 4 });
    const cleared = applyInspector(next, target(next), {
      ...inspectorForm(target(next)).data,
      minRows: undefined,
      maxRows: undefined,
    });
    expect(tableOf(cleared)).not.toHaveProperty('minItems');
    expect(tableOf(cleared)).not.toHaveProperty('maxItems');
  });

  it('writes uischema options only when they differ from the default', () => {
    const c = content();
    const data = inspectorForm(target(c)).data;
    const next = applyInspector(c, target(c), {
      ...data,
      addRows: false,
      deleteRows: false,
      addLabel: 'Add member',
      pageSize: 25,
    });
    expect(optionsOf(next)).toEqual({
      addRows: false,
      deleteRows: false,
      addLabel: 'Add member',
      pageSize: 25,
    });
    const back = applyInspector(next, target(next), {
      ...inspectorForm(target(next)).data,
      addRows: true,
      deleteRows: true,
      addLabel: 'Add row',
      pageSize: 10,
    });
    expect(optionsOf(back)).toEqual({});
    // Nothing changed: the same content.
    expect(applyInspector(c, target(c), data)).toBe(c);
  });

  it('keeps the row limits read-only outside the default variant', () => {
    const c = content({}, { minItems: 1 });
    const t = target(c, 'short');
    const next = applyInspector(c, t, { ...inspectorForm(t).data, minRows: 3 });
    expect(tableOf(next)['minItems']).toBe(1);
  });
});
