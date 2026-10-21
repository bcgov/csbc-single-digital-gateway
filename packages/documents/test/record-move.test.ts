import { describe, expect, it } from 'vitest';
import { findById } from '../src/studio/element-ids';
import { crossingProblem, moveAcross } from '../src/studio/record-move';
import { ITEM, itemProps, items, props, recordContent } from './record-fixture';

const scopeIn = (c: ReturnType<typeof recordContent>, id: string, variant = 'default') =>
  findById(c.variants[variant]!, id)!['scope'];

describe('moving across a record (doc 271 rule 14)', () => {
  it('moves a page field into a record with its property and required flag', () => {
    const next = moveAcross(recordContent(), 'n', 'L', 1);
    expect(scopeIn(next, 'n')).toBe(`${ITEM}/name`);
    expect(Object.keys(itemProps(next))).toEqual(['first', 'name']);
    expect(items(next)['required']).toEqual(['first', 'name']);
    expect(props(next)).not.toHaveProperty('name');
    expect(next.schema).not.toHaveProperty('required');
    expect(findById(next.variants['default']!, 'L')!['elements']).toHaveLength(2);
  });

  it('moves an item field out to the page with its property', () => {
    const next = moveAcross(recordContent(), 'f', 'P', 0);
    expect(scopeIn(next, 'f')).toBe('#/properties/first');
    expect(props(next)).toHaveProperty('first');
    expect(itemProps(next)).toEqual({});
    expect(next.schema['required']).toEqual(['name', 'first']);
  });

  it('is the plain move within one space', () => {
    const c = recordContent();
    const next = moveAcross(c, 'n', 'P', 0);
    expect(scopeIn(next, 'n')).toBe('#/properties/name');
    expect(next.schema).toBe(c.schema);
  });

  it('refuses unsafe crossings and leaves the content alone', () => {
    const c = recordContent();
    // A record cannot go inside a record.
    expect(crossingProblem(c, 'r', 'L')).toBeDefined();
    expect(moveAcross(c, 'r', 'L', 0)).toBe(c);
    // Outside default nothing writes the schema.
    const withMobile = recordContent({
      variants: { mobile: { id: 'M', type: 'Form', elements: [] } },
    });
    expect(crossingProblem(withMobile, 'n', 'L', 'mobile')).toBeDefined();
    // Shown in another variant.
    const shared = recordContent({
      variants: {
        mobile: {
          id: 'M',
          type: 'Form',
          elements: [{ id: 'n2', type: 'Control', scope: '#/properties/name' }],
        },
      },
    });
    expect(moveAcross(shared, 'n', 'L', 0)).toBe(shared);
    // Tested by a rule.
    const tested = recordContent({
      rule: { effect: 'SHOW', condition: { scope: '#/properties/name', schema: { const: 'x' } } },
    });
    expect(crossingProblem(tested, 'n', 'L')).toMatch(/rule/);
    expect(crossingProblem(c, 'n', 'L')).toBeUndefined();
  });

  it('refuses a key that already exists in the destination', () => {
    const c = recordContent();
    const clash = {
      ...c,
      schema: {
        ...c.schema,
        properties: { ...props(c), first: { type: 'string' } },
      },
      variants: {
        default: {
          ...c.variants['default']!,
          elements: [
            ...(c.variants['default']!['elements'] as unknown[]),
            { id: 'pf', type: 'Control', scope: '#/properties/first' },
          ],
        },
      },
    } as typeof c;
    expect(crossingProblem(clash, 'pf', 'L')).toMatch(/already used/);
    expect(crossingProblem(clash, 'f', 'P')).toMatch(/already used/);
  });
});
