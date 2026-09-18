import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { createElementIds } from '../src/studio/layout/element-ids';
import type { StudioDocument } from '../src/studio/layout/schema-properties';
import { setChoices } from '../src/studio/layout/set-choices';

// Doc 206 rules 26-28 — the ONLY writer of an option list. Pure.

const NO_RENAMES = new Map<string | number, string | number>();

const single = (): JsonSchema => ({
  type: 'object',
  required: ['k1'],
  properties: {
    k1: {
      type: 'string',
      title: 'Province',
      description: 'Where you live',
      oneOf: [{ const: 'bc', title: 'BC' }],
    },
  },
});

const multi = (items: object = { oneOf: [{ const: 'wheelchair', title: 'Wheelchair' }] }) =>
  ({
    type: 'object',
    properties: {
      k2: { type: 'array', title: 'Supports', uniqueItems: true, items },
    },
  }) as JsonSchema;

const uischemaFor = (key: string): UISchemaElement =>
  ({
    type: 'Form',
    elements: [{ type: 'Control', scope: `#/properties/${key}` }],
  }) as unknown as UISchemaElement;

/** The document plus the id of its one Control. */
const setup = (schema: JsonSchema, key: string) => {
  const ids = createElementIds();
  const uischema = uischemaFor(key);
  const control = (uischema as unknown as { elements: object[] }).elements[0]!;
  return { document: { schema, uischema } as StudioDocument, ids, controlId: ids.idOf(control) };
};

const ENTRIES = [
  { const: 'bc', title: 'British Columbia' },
  { const: 'ab', title: 'Alberta', description: 'Wild Rose Country' },
];

const propertyOf = (document: StudioDocument, key: string) =>
  document.schema.properties?.[key] as Record<string, unknown>;

describe('a single-choice field (rule 26)', () => {
  it('writes the list at property.oneOf', () => {
    const { document, ids, controlId } = setup(single(), 'k1');
    const next = setChoices(document, controlId, ENTRIES, NO_RENAMES, ids);
    expect(propertyOf(next, 'k1')['oneOf']).toEqual(ENTRIES);
  });

  it('keeps every other key of the property, and the root required', () => {
    const { document, ids, controlId } = setup(single(), 'k1');
    const next = setChoices(document, controlId, ENTRIES, NO_RENAMES, ids);
    expect(propertyOf(next, 'k1')).toMatchObject({
      type: 'string',
      title: 'Province',
      description: 'Where you live',
    });
    expect(next.schema.required).toEqual(['k1']);
  });

  it('does not mutate the document it was given', () => {
    const { document, ids, controlId } = setup(single(), 'k1');
    setChoices(document, controlId, ENTRIES, NO_RENAMES, ids);
    expect(propertyOf(document, 'k1')['oneOf']).toEqual([{ const: 'bc', title: 'BC' }]);
  });
});

describe('a multi-choice field (rules 26-27)', () => {
  it('writes the list at property.items.oneOf, never at the top level', () => {
    const { document, ids, controlId } = setup(multi(), 'k2');
    const next = setChoices(document, controlId, ENTRIES, NO_RENAMES, ids);
    const property = propertyOf(next, 'k2');
    expect((property['items'] as Record<string, unknown>)['oneOf']).toEqual(ENTRIES);
    expect(property['oneOf']).toBeUndefined();
  });

  it('keeps type, title and uniqueItems', () => {
    const { document, ids, controlId } = setup(multi(), 'k2');
    const next = setChoices(document, controlId, ENTRIES, NO_RENAMES, ids);
    expect(propertyOf(next, 'k2')).toMatchObject({
      type: 'array',
      title: 'Supports',
      uniqueItems: true,
    });
  });

  it('never introduces items.type when the author declared none (rule 27)', () => {
    const { document, ids, controlId } = setup(multi(), 'k2');
    const next = setChoices(document, controlId, ENTRIES, NO_RENAMES, ids);
    expect('type' in (propertyOf(next, 'k2')['items'] as object)).toBe(false);
  });

  it('keeps a DECLARED items.type, and every other key of items', () => {
    const { document, ids, controlId } = setup(
      multi({ type: 'string', oneOf: [{ const: 'x' }] }),
      'k2',
    );
    const next = setChoices(document, controlId, ENTRIES, NO_RENAMES, ids);
    expect(propertyOf(next, 'k2')['items']).toMatchObject({ type: 'string' });
  });
});

describe('the rename cascade (rules 21-22)', () => {
  it('rewrites the option list and the clauses in ONE update', () => {
    const ids = createElementIds();
    const uischema = {
      type: 'Flow',
      options: { edges: [] },
      elements: [
        {
          type: 'Stage',
          options: { id: 's1' },
          elements: [{ type: 'Form', elements: [{ type: 'Control', scope: '#/properties/k1' }] }],
        },
        {
          type: 'Condition',
          options: {
            id: 'x',
            rows: [
              {
                id: 'r1',
                label: 'In BC',
                match: 'all',
                clauses: [{ id: 'c1', field: 'k1', operator: 'equals', value: 'bc' }],
              },
            ],
          },
        },
      ],
    } as unknown as UISchemaElement;
    const control = (
      (uischema as unknown as { elements: { elements: { elements: object[] }[] }[] }).elements[0]!
        .elements[0]!.elements as object[]
    )[0]!;
    const document = { schema: single(), uischema } as StudioDocument;

    const next = setChoices(
      document,
      ids.idOf(control),
      [{ const: 'brit_col', title: 'British Columbia' }],
      new Map<string | number, string | number>([['bc', 'brit_col']]),
      ids,
    );

    const rows = (next.uischema as unknown as { elements: { options?: { rows?: unknown[] } }[] })
      .elements[1]!.options!.rows as { clauses: { value: unknown }[] }[];
    expect(rows[0]!.clauses[0]!.value).toBe('brit_col');
    expect(propertyOf(next, 'k1')['oneOf']).toEqual([
      { const: 'brit_col', title: 'British Columbia' },
    ]);
  });
});

describe('refusals (rule 28)', () => {
  it('returns the SAME document when the element is not in it', () => {
    const { document, ids } = setup(single(), 'k1');
    expect(setChoices(document, 'el-999', ENTRIES, NO_RENAMES, ids)).toBe(document);
  });

  it('returns the SAME document when the list is unchanged', () => {
    const { document, ids, controlId } = setup(single(), 'k1');
    const same = [{ const: 'bc', title: 'BC' }];
    expect(setChoices(document, controlId, same, NO_RENAMES, ids)).toBe(document);
  });

  it('returns the SAME document for an empty list, which the metaschema forbids (rule 19)', () => {
    const { document, ids, controlId } = setup(single(), 'k1');
    expect(setChoices(document, controlId, [], NO_RENAMES, ids)).toBe(document);
  });
});
