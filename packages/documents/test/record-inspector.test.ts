import { describe, expect, it } from 'vitest';
import type { DocumentContent } from '../src/studio/document-types';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { fieldsFor, inspectorForm } from '../src/studio/inspector/inspector-form';
import { keyProblem, renamePropertyKey } from '../src/studio/inspector/property-rename';
import { inspectorTarget } from '../src/studio/inspector/inspector-target';
import { saveOptions } from '../src/studio/options/save-options';
import { optionsTargetOf } from '../src/studio/options/options-target';

const ITEM = '#/properties/people/items/properties';
const content = (): DocumentContent =>
  ({
    schema: {
      type: 'object',
      properties: {
        first: { type: 'string', title: 'Page first' },
        people: {
          type: 'array',
          title: 'People',
          items: {
            type: 'object',
            properties: {
              first: { type: 'string', title: 'First' },
              colour: { type: 'string', title: 'Colour', oneOf: [{ const: 'red', title: 'Red' }] },
            },
          },
        },
      },
    },
    variants: {
      default: {
        id: 'F',
        type: 'Form',
        elements: [
          { id: 'p', type: 'Control', scope: '#/properties/first' },
          {
            id: 'r',
            type: 'Control',
            scope: '#/properties/people',
            options: { component: 'record' },
            elements: [
              {
                id: 'L',
                type: 'VerticalLayout',
                elements: [
                  { id: 'f', type: 'Control', scope: `${ITEM}/first` },
                  { id: 'c', type: 'Control', scope: `${ITEM}/colour` },
                ],
              },
            ],
          },
        ],
      },
    },
  }) as DocumentContent;

const target = (c: DocumentContent, id: string) =>
  inspectorTarget(c, { pageSelectedId: id, focusedId: 'F', formId: 'F' })!;
const items = (c: DocumentContent) =>
  (c.schema['properties'] as { people: { items: Record<string, unknown> } }).people.items;

describe('record inspector (doc 271 rules 16-17)', () => {
  it('resolves an item field to its items property, not the page field of the same key', () => {
    const t = target(content(), 'f');
    expect(t.kind).toBe('text');
    expect(t.property).toMatchObject({ key: 'first', array: 'people', required: false });
    expect(t.name).toBe('First');
    expect(target(content(), 'p').property).toMatchObject({ key: 'first' });
    expect(target(content(), 'p').property).not.toHaveProperty('array');
  });

  it('writes Label and Required to the item property and items.required', () => {
    const c = content();
    const t = target(c, 'f');
    const next = applyInspector(c, t, { ...inspectorForm(t).data, label: 'Given', required: true });
    expect(items(next)['properties']).toMatchObject({ first: { title: 'Given' } });
    expect(items(next)['required']).toEqual(['first']);
    expect(next.schema['properties']).toMatchObject({ first: { title: 'Page first' } });
    expect(next.schema).not.toHaveProperty('required');
  });

  it('renames an item key within items, rescoping its Controls, and checks clashes there', () => {
    const c = content();
    expect(keyProblem(c, 'first', 'colour', 'people')).toBe('colour is already used.');
    // The page's `first` does not clash with an item key.
    expect(keyProblem(c, 'colour', 'first', 'people')).toBe('first is already used.');
    expect(keyProblem(c, 'first', 'given', 'people')).toBeUndefined();
    const next = renamePropertyKey(c, 'first', 'given', 'people');
    expect(Object.keys(items(next)['properties'] as object)).toEqual(['given', 'colour']);
    const layout = (
      next.variants['default'] as { elements: { elements?: { elements: { scope: string }[] }[] }[] }
    ).elements[1]!.elements![0]!.elements;
    expect(layout.map((e) => e.scope)).toEqual([`${ITEM}/given`, `${ITEM}/colour`]);
    expect(next.schema['properties']).toHaveProperty('first');
  });

  it('saves an item choice field options into items.properties', () => {
    const c = content();
    const options = optionsTargetOf(target(c, 'c'))!;
    expect(options.ref).toEqual({ array: 'people', key: 'colour' });
    const next = saveOptions(c, options, [{ const: 'blue', title: 'Blue' }], new Map());
    expect(items(next)['properties']).toMatchObject({
      colour: { oneOf: [{ const: 'blue', title: 'Blue' }] },
    });
  });

  it('gives a record its own kind with the row options and no page size', () => {
    const t = target(content(), 'r');
    expect(t.kind).toBe('record');
    const keys = fieldsFor(t).map((field) => field.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'label',
        'required',
        'minRows',
        'maxRows',
        'addRows',
        'deleteRows',
        'addItemLabel',
      ]),
    );
    expect(keys).not.toContain('pageSize');
    expect(keys).not.toContain('addLabel');
    expect(keys).not.toContain('component');
  });
});
