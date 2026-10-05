import { describe, expect, it } from 'vitest';
import type { DocumentContent, Uischema } from '../src/studio/document-types';
import { variantProblems } from '../src/studio/variants/variant-problems';

const control = (key: string, extra: Uischema = {}): Uischema => ({
  id: `c-${key}`,
  type: 'Control',
  scope: `#/properties/${key}`,
  ...extra,
});
const form = (...elements: Uischema[]): Uischema => ({ id: 'f', type: 'Form', elements });
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' },
    email: { type: 'string', title: 'Email' },
    age: { type: 'integer' },
    note: { type: 'string', title: 'Note' },
  },
  required: ['name', 'email', 'age'],
};
const content = (variants: Record<string, Uischema>): DocumentContent => ({
  schema,
  variants: { default: form(control('name'), control('email'), control('age')), ...variants },
});

describe('variantProblems (doc 262 rule 15)', () => {
  it('returns [] when every variant binds every required property', () => {
    expect(
      variantProblems(content({ Mobile: form(control('age'), control('email'), control('name')) })),
    ).toEqual([]);
    expect(variantProblems({ schema: { type: 'object' }, variants: { default: {} } })).toEqual([]);
  });

  it("lists each variant's missing required fields with key and title, in key order", () => {
    const problems = variantProblems(
      content({ Mobile: form(control('name')), Print: form(control('email'), control('note')) }),
    );
    expect(problems).toEqual([
      {
        variant: 'Mobile',
        missing: [
          { key: 'email', title: 'Email' },
          { key: 'age', title: 'age' },
        ],
      },
      {
        variant: 'Print',
        missing: [
          { key: 'name', title: 'Name' },
          { key: 'age', title: 'age' },
        ],
      },
    ]);
  });

  it('finds Controls at any depth and in any Form of a Funnel', () => {
    const funnel: Uischema = {
      id: 'fun',
      type: 'Funnel',
      elements: [
        {
          id: 'f1',
          type: 'Form',
          elements: [{ id: 'v', type: 'VerticalLayout', elements: [control('name')] }],
        },
        {
          id: 'f2',
          type: 'Form',
          elements: [{ id: 'g', type: 'Grid', elements: [control('email'), control('age')] }],
        },
      ],
    };
    expect(variantProblems(content({ Steps: funnel }))).toEqual([]);
  });

  it('counts a Control hidden by a rule as present', () => {
    const hidden = {
      rule: { effect: 'HIDE', condition: { scope: '#/properties/note', schema: {} } },
    };
    expect(
      variantProblems(
        content({ Mobile: form(control('name', hidden), control('email'), control('age')) }),
      ),
    ).toEqual([]);
  });

  it('reports an empty variant as missing every required field', () => {
    expect(variantProblems(content({ Blank: {} }))).toEqual([
      {
        variant: 'Blank',
        missing: [
          { key: 'name', title: 'Name' },
          { key: 'email', title: 'Email' },
          { key: 'age', title: 'age' },
        ],
      },
    ]);
  });

  it('falls back to the property key when it has no title', () => {
    const [problem] = variantProblems(content({ Mobile: form(control('name'), control('email')) }));
    expect(problem?.missing).toEqual([{ key: 'age', title: 'age' }]);
    // The default variant is checked too.
    const broken: DocumentContent = { schema, variants: { default: form(control('name')) } };
    expect(variantProblems(broken).map((p) => p.variant)).toEqual(['default']);
  });
});
