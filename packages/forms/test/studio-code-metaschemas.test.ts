import { createAjv, type JsonSchema, type UISchemaElement } from '@jsonforms/core';
import { describe, it, expect } from 'vitest';
import { SCHEMA_METASCHEMA } from '../src/studio/code/metaschema/schema-metaschema';
import { UISCHEMA_METASCHEMA } from '../src/studio/code/metaschema/uischema-metaschema';
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
const root = (...elements: object[]) => ({ type: 'VerticalLayout', elements });

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
      expect(uischemaOk({ type: 'Grid' })).toBe(false);
      expect(uischemaOk({ type: 'HorizontalLayout' })).toBe(false);
      expect(uischemaOk({ type: 'VerticalLayout' })).toBe(false);
      expect(uischemaOk(root({ type: 'Control' }))).toBe(false);
    });

    it('rejects an unknown element type', () => {
      expect(uischemaOk(root({ type: 'Group', elements: [] }))).toBe(false);
      expect(uischemaOk({ elements: [] })).toBe(false);
    });

    it('rejects out-of-range Heading level, Grid column and HorizontalLayout columns', () => {
      expect(uischemaOk(root({ type: 'Heading', text: 'H', options: { level: 7 } }))).toBe(false);
      expect(uischemaOk(root({ type: 'Heading', text: 'H', options: { size: 1.5 } }))).toBe(false);
      expect(uischemaOk({ type: 'Grid', options: { column: 13 }, elements: [] })).toBe(false);
      expect(uischemaOk({ type: 'HorizontalLayout', options: { columns: 1 }, elements: [] })).toBe(
        false,
      );
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
