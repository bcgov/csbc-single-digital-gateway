import { createAjv, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { describe, it, expect } from 'vitest';
import { SCHEMA_METASCHEMA } from '../src/studio/code/metaschema/schema-metaschema';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
import { validateUischemaDocument } from '../src/studio/code/validate-document';
import { createElementIds } from '../src/studio/layout/element-ids';
import { addTargetId, insertElement } from '../src/studio/layout/insert-element';
import { newPropertyKey } from '../src/studio/layout/schema-properties';
import { PALETTE_TEMPLATES } from '../src/studio/palette/palette-templates';
import { STUDIO_SAMPLE_SCHEMA, STUDIO_SAMPLE_UISCHEMA } from '../src/studio/sample';

// Doc 191 rules 11-14 — the studio metaschemas (completion, markers and the apply gate share them).

const ajv = createAjv();
const schemaOk = (value: unknown) => ajv.validate(SCHEMA_METASCHEMA, value) === true;
const uischemaOk = (value: unknown) => ajv.validate(UISCHEMA_METASCHEMA, value) === true;

const withProperty = (property: object) => ({ type: 'object', properties: { a: property } });
const control = (extra: object = {}) => ({ type: 'Control', scope: '#/properties/a', ...extra });
// Doc 192 rule 11: every studio uischema's root is a Form.
const root = (...elements: object[]) => ({ type: 'Form', elements });
// Doc 197 rule 6: a Stage holding one Form, and the Flow around it.
const stage = (form: object, id = 's1') => ({ type: 'Stage', elements: [form], options: { id } });
const flowOf = (form: object) => ({ type: 'Flow', elements: [stage(form)] });

/** Paths of named subschemas (in `properties` / `definitions`) that have neither a description nor a `$ref`. */
function undescribed(schema: unknown, path = '#'): string[] {
  if (schema === null || typeof schema !== 'object') return [];
  const node = schema as Record<string, unknown>;
  const found: string[] = [];
  for (const map of ['properties', 'definitions'] as const) {
    for (const [name, child] of Object.entries((node[map] ?? {}) as Record<string, object>)) {
      if (!('description' in child) && !('$ref' in child)) found.push(`${path}/${map}/${name}`);
      found.push(...undescribed(child, `${path}/${map}/${name}`));
    }
  }
  // `if` conditions are skipped: they are matchers, not keys an author writes, and must carry no description (rule 11).
  for (const key of ['items', 'additionalProperties', 'then']) {
    found.push(...undescribed(node[key], `${path}/${key}`));
  }
  for (const [index, branch] of ((node.allOf ?? []) as object[]).entries()) {
    found.push(...undescribed(branch, `${path}/allOf/${index}`));
  }
  return found;
}

/** Every `if` condition anywhere in `schema`. */
function ifConditions(schema: unknown): Record<string, unknown>[] {
  if (schema === null || typeof schema !== 'object') return [];
  const node = schema as Record<string, unknown>;
  const own =
    typeof node.if === 'object' && node.if !== null ? [node.if as Record<string, unknown>] : [];
  return [...own, ...Object.values(node).flatMap(ifConditions)];
}

// Doc 197 rule 6 — a Form may carry the authored `options.id` that addresses it in a URL.
describe('UISCHEMA_METASCHEMA Form options.id (doc 197 rule 6)', () => {
  it('accepts a Form whose options carry a non-empty string id', () => {
    expect(uischemaOk({ type: 'Form', elements: [], options: { id: 'abcd1234' } })).toBe(true);
    expect(uischemaOk(flowOf({ type: 'Form', elements: [], options: { id: 'abcd1234' } }))).toBe(
      true,
    );
    expect(uischemaOk({ type: 'Form', elements: [], options: { id: 'abcd1234', gap: 'lg' } })).toBe(
      true,
    );
  });

  it('rejects an empty or non-string Form options.id', () => {
    expect(uischemaOk({ type: 'Form', elements: [], options: { id: '' } })).toBe(false);
    expect(uischemaOk({ type: 'Form', elements: [], options: { id: 7 } })).toBe(false);
    expect(uischemaOk({ type: 'Form', elements: [], options: { id: null } })).toBe(false);
    expect(uischemaOk(flowOf({ type: 'Form', elements: [], options: { id: '' } }))).toBe(false);
  });

  it('does not require options.id on a Form, so documents predating it still apply', () => {
    expect(uischemaOk(root())).toBe(true);
    expect(uischemaOk({ type: 'Form', elements: [], options: { gap: 'md' } })).toBe(true);
    expect(uischemaOk(flowOf({ type: 'Form', elements: [] }))).toBe(true);
    expect(uischemaOk(STUDIO_SAMPLE_UISCHEMA)).toBe(true);
  });

  it("still requires a Stage's options.id", () => {
    const form = { type: 'Form', elements: [], options: { id: 'abcd1234' } };
    expect(uischemaOk({ type: 'Flow', elements: [{ type: 'Stage', elements: [form] }] })).toBe(
      false,
    );
    expect(
      uischemaOk({ type: 'Flow', elements: [{ type: 'Stage', elements: [form], options: {} }] }),
    ).toBe(false);
    expect(uischemaOk(flowOf(form))).toBe(true);
  });

  it('describes the Form id, so completion documents it', () => {
    expect(JSON.stringify(UISCHEMA_METASCHEMA)).toContain('addresses this form in a link');
    expect(undescribed(UISCHEMA_METASCHEMA)).not.toContain(
      '#/definitions/form/properties/options/properties/id',
    );
  });
});

describe('UISCHEMA_METASCHEMA Form root (doc 192 rule 11)', () => {
  it('accepts a Form root with elements, label, rule and options', () => {
    expect(uischemaOk(root())).toBe(true);
    expect(
      uischemaOk({
        type: 'Form',
        label: 'Signup',
        options: { anything: 1 },
        rule: { effect: 'SHOW', condition: { scope: '#/properties/a', schema: { const: true } } },
        elements: [
          { type: 'Heading', text: 'H' },
          { type: 'VerticalLayout', elements: [] },
        ],
      }),
    ).toBe(true);
  });

  it('requires the root to be a Form with elements', () => {
    expect(uischemaOk({ type: 'Form' })).toBe(false);
    expect(uischemaOk({ type: 'VerticalLayout', elements: [] })).toBe(false);
    expect(uischemaOk({ type: 'Grid', elements: [] })).toBe(false);
    expect(uischemaOk({ elements: [] })).toBe(false);
    expect(uischemaOk({ type: 'Form', elements: [], label: false })).toBe(false);
  });

  it('rejects a Form nested at any depth, reporting its path', () => {
    const direct = validateUischemaDocument(root({ type: 'Form', elements: [] }));
    expect(direct.valid).toBe(false);
    if (!direct.valid) {
      expect(direct.problems).toContainEqual(expect.objectContaining({ path: '/elements/0/type' }));
    }

    const deep = validateUischemaDocument(
      root({
        type: 'VerticalLayout',
        elements: [{ type: 'Grid', elements: [{ type: 'Form', elements: [] }] }],
      }),
    );
    expect(deep.valid).toBe(false);
    if (!deep.valid) {
      expect(deep.problems).toContainEqual(
        expect.objectContaining({ path: '/elements/0/elements/0/elements/0/type' }),
      );
    }
  });

  it('gives the root type a description and no if-condition descriptions', () => {
    // Doc 195 rule 17: a Flow root is checked as a flow, every other root as a Form.
    expect(UISCHEMA_METASCHEMA.allOf).toEqual([
      {
        if: { properties: { type: { const: 'Flow' } }, required: ['type'] },
        // eslint-disable-next-line unicorn/no-thenable -- the JSON Schema draft-07 `then` keyword; never awaited
        then: { $ref: '#/definitions/flow' },
        else: { $ref: '#/definitions/form' },
      },
    ]);
    expect(UISCHEMA_METASCHEMA.definitions.form.properties.type).toMatchObject({
      const: 'Form',
      description: expect.any(String),
    });
    expect(UISCHEMA_METASCHEMA.definitions.element.properties.type.enum).not.toContain('Form');
    const conditions = ifConditions(UISCHEMA_METASCHEMA);
    expect(conditions.length).toBeGreaterThan(0);
    expect(JSON.stringify(conditions)).not.toContain('description');
  });
});

describe('UISCHEMA_METASCHEMA layout gap (doc 193 rule 16)', () => {
  const GAPS = ['none', 'xs', 'sm', 'md', 'lg', 'xl'];
  const LAYOUTS = ['Grid', 'VerticalLayout', 'HorizontalLayout'];

  it('accepts every gap name on Form, Grid, VerticalLayout and HorizontalLayout', () => {
    for (const gap of GAPS) {
      const nested = LAYOUTS.map((type) => ({ type, options: { gap }, elements: [] }));
      expect(uischemaOk({ type: 'Form', options: { gap }, elements: nested }), gap).toBe(true);
    }
  });

  it('rejects an unknown gap name and a numeric gap', () => {
    for (const type of LAYOUTS) {
      expect(uischemaOk(root({ type, options: { gap: 'huge' }, elements: [] })), type).toBe(false);
      expect(uischemaOk(root({ type, options: { gap: 8 }, elements: [] })), type).toBe(false);
    }
    expect(uischemaOk({ type: 'Form', options: { gap: 'huge' }, elements: [] })).toBe(false);
  });

  it('no longer describes Grid margin, but still accepts it as an unknown option', () => {
    type Branch = {
      if: { properties: { type: { const: string } } };
      then: { properties: { options?: { properties: Record<string, unknown> } } };
    };
    const branches = UISCHEMA_METASCHEMA.definitions.element.allOf as unknown as Branch[];
    const grid = branches.find((branch) => branch.if.properties.type.const === 'Grid');
    const gridOptions = grid?.then.properties.options?.properties ?? {};
    expect(Object.keys(gridOptions)).toContain('gap');
    expect(Object.keys(gridOptions)).not.toContain('margin');
    expect(uischemaOk(root({ type: 'Grid', options: { margin: '0.5rem' }, elements: [] }))).toBe(
      true,
    );
  });
});

describe('Form Studio code metaschemas (doc 191)', () => {
  describe('shared shape (rule 11)', () => {
    it('declares draft-07, is frozen, and gives every property a description', () => {
      for (const metaschema of [SCHEMA_METASCHEMA, UISCHEMA_METASCHEMA]) {
        expect(metaschema.$schema).toBe('http://json-schema.org/draft-07/schema#');
        expect(Object.isFrozen(metaschema)).toBe(true);
        expect(Object.isFrozen(metaschema.definitions)).toBe(true);
        expect(undescribed(metaschema)).toEqual([]);
        expect(ajv.validateSchema(metaschema)).toBe(true);
      }
    });
  });

  describe('SCHEMA_METASCHEMA — studio profile (rule 12)', () => {
    it('accepts an object root with properties, required, title and description', () => {
      expect(
        schemaOk({ type: 'object', title: 'F', description: 'D', properties: {}, required: ['a'] }),
      ).toBe(true);
      expect(schemaOk({})).toBe(true);
      expect(schemaOk({ required: ['a', 'a'] })).toBe(false);
    });

    it('accepts string, number and boolean properties with their studio keywords', () => {
      expect(
        schemaOk(
          withProperty({
            type: 'string',
            title: 'T',
            description: 'D',
            maxLength: 0,
            default: 'x',
          }),
        ),
      ).toBe(true);
      expect(
        schemaOk(withProperty({ type: 'number', minimum: -1, maximum: 5.5, multipleOf: 0.5 })),
      ).toBe(true);
      expect(schemaOk(withProperty({ type: 'boolean', default: true }))).toBe(true);
    });

    it('accepts a oneOf choice of const/title entries', () => {
      expect(
        schemaOk(
          withProperty({ type: 'string', oneOf: [{ const: 'a', title: 'A' }, { const: 'b' }] }),
        ),
      ).toBe(true);
      expect(schemaOk(withProperty({ type: 'number', oneOf: [{ const: 1, title: 'One' }] }))).toBe(
        true,
      );
    });

    it('rejects a non-object root, an integer property type, a negative maxLength and multipleOf 0', () => {
      expect(schemaOk({ type: 'array' })).toBe(false);
      expect(schemaOk([])).toBe(false);
      expect(schemaOk(withProperty({ type: 'integer' }))).toBe(false);
      expect(schemaOk(withProperty({ type: 'string', maxLength: -1 }))).toBe(false);
      expect(schemaOk(withProperty({ type: 'number', multipleOf: 0 }))).toBe(false);
    });

    it('rejects an empty oneOf and an entry without const', () => {
      expect(schemaOk(withProperty({ type: 'string', oneOf: [] }))).toBe(false);
      expect(schemaOk(withProperty({ type: 'string', oneOf: [{ title: 'A' }] }))).toBe(false);
      expect(schemaOk(withProperty({ type: 'string', oneOf: [{ const: true }] }))).toBe(false);
    });

    it('allows unknown keywords at root and property level', () => {
      expect(schemaOk({ type: 'object', $id: 'x', additionalProperties: false })).toBe(true);
      expect(schemaOk(withProperty({ type: 'string', pattern: '^a', format: 'email' }))).toBe(true);
    });
  });

  describe('UISCHEMA_METASCHEMA (rule 13)', () => {
    it('accepts each studio element type with its options', () => {
      const heading = { type: 'Heading', text: 'H', options: { level: 2, size: 6 } };
      const grid = {
        type: 'Grid',
        options: { column: 12, cellHeight: '1rem', margin: 8, float: true, minRow: 0, maxRow: 0 },
        elements: [heading],
      };
      const row = {
        type: 'HorizontalLayout',
        options: { columns: 6 },
        elements: [control({ options: { gridItem: { w: 2 } } })],
      };
      const field = control({
        label: false,
        options: {
          component: 'number',
          placeholder: 'p',
          orientation: 'horizontal',
          size: 'sm',
          step: 0.5,
          smallStep: 1,
          largeStep: 10,
          allowWheelScrub: true,
          snapOnStep: false,
          readonly: true,
          locale: 'en-CA',
          format: { style: 'percent' },
        },
      });
      expect(
        uischemaOk(
          root(grid, row, field, { type: 'VerticalLayout', label: 'Stack', elements: [] }),
        ),
      ).toBe(true);
    });

    it('requires Heading text, layout elements and Control scope', () => {
      expect(uischemaOk(root({ type: 'Heading' }))).toBe(false);
      expect(uischemaOk(root({ type: 'Grid' }))).toBe(false);
      expect(uischemaOk(root({ type: 'HorizontalLayout' }))).toBe(false);
      expect(uischemaOk(root({ type: 'VerticalLayout' }))).toBe(false);
      expect(uischemaOk(root({ type: 'Control' }))).toBe(false);
    });

    it('rejects an unknown element type', () => {
      expect(uischemaOk(root({ type: 'Group', elements: [] }))).toBe(false);
      expect(uischemaOk(root({ elements: [] }))).toBe(false);
    });

    it('rejects out-of-range Heading level, Grid column and HorizontalLayout columns', () => {
      expect(uischemaOk(root({ type: 'Heading', text: 'H', options: { level: 7 } }))).toBe(false);
      expect(uischemaOk(root({ type: 'Heading', text: 'H', options: { size: 1.5 } }))).toBe(false);
      expect(uischemaOk(root({ type: 'Grid', options: { column: 13 }, elements: [] }))).toBe(false);
      expect(
        uischemaOk(root({ type: 'HorizontalLayout', options: { columns: 1 }, elements: [] })),
      ).toBe(false);
    });

    it('rejects a nested or non-#/properties Control scope and an unknown options.component', () => {
      expect(uischemaOk(root(control({ scope: '#/properties/a/properties/b' })))).toBe(false);
      expect(uischemaOk(root(control({ scope: '#/definitions/a' })))).toBe(false);
      expect(uischemaOk(root(control({ options: { component: 'slider' } })))).toBe(false);
    });

    it('validates gridItem placement on any element and a rule effect', () => {
      expect(
        uischemaOk(
          root({
            type: 'Heading',
            text: 'H',
            options: { gridItem: { x: 0, y: 3, w: 1, h: 4, noMove: true } },
          }),
        ),
      ).toBe(true);
      expect(
        uischemaOk(root({ type: 'Heading', text: 'H', options: { gridItem: { w: 0 } } })),
      ).toBe(false);
      expect(
        uischemaOk(
          root(
            control({
              rule: {
                effect: 'HIDE',
                condition: { scope: '#/properties/a', schema: { const: true } },
              },
            }),
          ),
        ),
      ).toBe(true);
      expect(uischemaOk(root(control({ rule: { effect: 'FLASH', condition: {} } })))).toBe(false);
    });

    it('allows unknown keys inside options and gridItem', () => {
      expect(
        uischemaOk(root(control({ options: { custom: 1, gridItem: { autoPosition: true } } }))),
      ).toBe(true);
    });
  });

  describe('studio output conforms (rule 14)', () => {
    it('accepts the studio sample schema and uischema', () => {
      expect(schemaOk(STUDIO_SAMPLE_SCHEMA)).toBe(true);
      expect(uischemaOk(STUDIO_SAMPLE_UISCHEMA)).toBe(true);
    });

    it('accepts the document produced by inserting every palette template', () => {
      const ids = createElementIds();
      let document: { schema: JsonSchema; uischema: UISchemaElement } = {
        schema: STUDIO_SAMPLE_SCHEMA,
        uischema: STUDIO_SAMPLE_UISCHEMA,
      };
      const delivery = STUDIO_SAMPLE_UISCHEMA.elements.find((element) => element.type === 'Grid');
      expect(delivery).toBeDefined();
      // Doc 198 rule 19: the Flow group is gone, so every remaining template is a layout one.
      for (const { key } of PALETTE_TEMPLATES) {
        for (const gridId of [
          addTargetId(document.uischema, null, ids),
          ids.idOf(delivery ?? {}),
        ]) {
          const result = insertElement(document, key, { gridId }, ids, newPropertyKey);
          expect(result.inserted, `${key} into ${gridId}`).toBeDefined();
          document = { schema: result.schema, uischema: result.uischema };
        }
      }
      expect(schemaOk(document.schema)).toBe(true);
      expect(uischemaOk(document.uischema)).toBe(true);
    });
  });
});
