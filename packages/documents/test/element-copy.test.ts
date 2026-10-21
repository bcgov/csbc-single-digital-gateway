import { describe, expect, it } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { findById } from '../src/studio/element-ids';
import { copyElement } from '../src/studio/element-copy';
import { control, form } from './funnel-fixtures';

const content = (
  root: Uischema,
  properties: Record<string, unknown>,
  required?: string[],
): DocumentContent => ({
  schema: { type: 'object', properties, ...(required && { required }) },
  variants: { default: root },
});
const ids = (layout: Uischema | undefined) =>
  ((layout?.['elements'] as Uischema[] | undefined) ?? []).map((e) => e['id']);
const keyOf = (element: Uischema | undefined) =>
  /^#\/properties\/(.+)$/.exec(String(element?.['scope']))?.[1];

describe('copyElement (doc 254 rule 6)', () => {
  it('inserts the copy right after the element with a new id, returning that id', () => {
    const heading = { id: 'h', type: 'Heading', options: { text: 'Hi' } };
    const c = content(form('F', 'F', [heading, { id: 's', type: 'Separator' }]), {});
    const result = copyElement(c, 'h')!;
    const order = ids(result.content.variants.default);
    expect(order).toEqual(['h', result.copyId, 's']);
    expect(result.copyId).not.toBe('h');
    expect(findById(result.content.variants.default, result.copyId)).toEqual({
      ...heading,
      id: result.copyId,
    });
    // The original document is untouched.
    expect(ids(c.variants.default)).toEqual(['h', 's']);
  });

  it('binds a copied Control to a NEW property copied from the original, required like it', () => {
    const c = content(
      form('F', 'F', [control('age')]),
      { age: { type: 'integer', title: 'Age', minimum: 0 } },
      ['age'],
    );
    const result = copyElement(c, 'c-age')!;
    const copy = findById(result.content.variants.default, result.copyId);
    const key = keyOf(copy)!;
    expect(key).toMatch(/^[\w-]{8}$/);
    expect(key).not.toBe('age');
    const properties = result.content.schema['properties'] as Record<string, unknown>;
    expect(properties[key]).toEqual({ type: 'integer', title: 'Age', minimum: 0 });
    expect(properties[key]).not.toBe(properties['age']);
    expect(result.content.schema['required']).toEqual(['age', key]);
  });

  it('copies a nested layout deeply: new ids throughout, shared properties stay shared', () => {
    const layout = {
      id: 'v',
      type: 'VerticalLayout',
      elements: [control('x'), { ...control('x'), id: 'c-x2' }, control('y')],
    };
    const c = content(form('F', 'F', [layout]), { x: { type: 'string' }, y: { type: 'boolean' } });
    const result = copyElement(c, 'v')!;
    const copy = findById(result.content.variants.default, result.copyId)!;
    const children = copy['elements'] as Uischema[];
    expect(children.map((e) => e['id'])).not.toContain('c-x');
    expect(new Set(children.map((e) => e['id'])).size).toBe(3);
    const [k1, k2, k3] = children.map(keyOf);
    expect(k1).toBe(k2);
    expect(k3).not.toBe(k1);
    expect(Object.keys(result.content.schema['properties'] as object)).toEqual(['x', 'y', k1, k3]);
    expect('required' in result.content.schema).toBe(false);
  });

  it('finds an element at any depth and copies nothing for an unknown id or the root', () => {
    const c = content(
      form('F', 'F', [
        { id: 'v', type: 'VerticalLayout', elements: [{ id: 'h', type: 'Heading' }] },
      ]),
      {},
    );
    const deep = copyElement(c, 'h')!;
    expect(ids(findById(deep.content.variants.default, 'v'))).toEqual(['h', deep.copyId]);
    expect(copyElement(c, 'zz')).toBeUndefined();
    expect(copyElement(c, 'F')).toBeUndefined();
  });
});
