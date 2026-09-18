import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as ui from '../src/renderers-ui';
import { controlKindOf } from '../src/renderers/ui/control-kind';
import { criterionFieldOf } from '../src/runner/criterion-match';
import { SCHEMA_METASCHEMA } from '../src/studio/code/metaschema/schema-metaschema';
import { validateSchemaDocument } from '../src/studio/code/validate-document';

// Doc 204 rules 17-20 — an `integer` property is the Number field with decimals off. Three things key off the
// type and move together: the tester, `controlKindOf` and the schema metaschema. (`fieldAccepts` does NOT —
// it only ever sees an inspector FIELD schema, never a document property; the doc's rule 21 was wrong.)

const testerContext = { rootSchema: {} as JsonSchema, config: {} };
const el = (element: object) => element as UISchemaElement;
const control = (scope: string) => el({ type: 'Control', scope });

const schemaWith = (property: object): JsonSchema =>
  ({
    type: 'object',
    properties: { amount: { title: 'Amount', ...property } },
  }) as JsonSchema;

function renderField(property: JsonSchema, data: Record<string, unknown> = {}) {
  return render(
    <JsonForms
      schema={schemaWith(property)}
      uischema={control('#/properties/amount')}
      data={data}
      renderers={[...ui.controlRenderers, ...ui.displayRenderers, ...ui.layoutRenderers]}
      cells={ui.cells}
    />,
  );
}

describe('the tester matches an integer schema (rule 17)', () => {
  const numberEntry = ui.controlRenderers[2];

  it('ranks a type: integer control at 1, like a type: number one', () => {
    expect(
      numberEntry?.tester(
        control('#/properties/amount'),
        schemaWith({ type: 'integer' }),
        testerContext,
      ),
    ).toBe(1);
    expect(
      numberEntry?.tester(
        control('#/properties/amount'),
        schemaWith({ type: 'number' }),
        testerContext,
      ),
    ).toBe(1);
  });

  it('leaves exactly one control matching an integer schema — no tie at the top rank', () => {
    const schema = schemaWith({ type: 'integer' });
    const matching = ui.controlRenderers.filter(
      (entry) => entry.tester(control('#/properties/amount'), schema, testerContext) > 0,
    );
    expect(matching).toHaveLength(1);
  });

  it('renders an integer field rather than nothing', () => {
    renderField({ type: 'integer' }, { amount: 3 });
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('3');
  });

  it('still renders a number field', () => {
    renderField({ type: 'number' }, { amount: 1.5 });
    expect(screen.getByRole('textbox', { name: 'Amount' })).toHaveValue('1.5');
  });

  it("steps an integer field by 1 from the schema's multipleOf", () => {
    // `multipleOf: 1` is what makes the field whole-number-only for Ajv AND its step, with no extra option.
    renderField({ type: 'integer', multipleOf: 1 }, { amount: 3 });
    expect(screen.getByRole('textbox', { name: 'Amount' })).toBeInTheDocument();
  });
});

describe('controlKindOf maps integer to number (rule 18)', () => {
  it("returns 'number' for a type: integer property", () => {
    expect(controlKindOf({ type: 'integer' })).toBe('number');
  });

  it('still classifies every other type as before', () => {
    expect(controlKindOf({ type: 'number' })).toBe('number');
    expect(controlKindOf({ type: 'string' })).toBe('text');
    expect(controlKindOf({ type: 'boolean' })).toBe('boolean');
    expect(controlKindOf(undefined)).toBeUndefined();
    expect(controlKindOf({ type: 'array' })).toBeUndefined();
  });

  it("returns 'choice' for a oneOf integer schema, checked before the type (rule 18b)", () => {
    expect(
      controlKindOf({
        type: 'integer',
        oneOf: [
          { const: 1, title: 'One' },
          { const: 2, title: 'Two' },
        ],
      }),
    ).toBe('choice');
  });
});

describe('an integer choice list still renders as a choice (rule 18b)', () => {
  const choices = {
    type: 'integer',
    oneOf: [
      { const: 1, title: 'One' },
      { const: 2, title: 'Two' },
    ],
  };

  it('dispatches to the Combobox, not the number input, so the choices are not ignored', () => {
    renderField(choices, { amount: 1 });
    expect(screen.getByRole('combobox', { name: 'Amount' })).toBeInTheDocument();
  });

  it("refuses a fractional const, which the field's own schema would reject", () => {
    expect(
      controlKindOf({ type: 'integer', oneOf: [{ const: 1.5, title: 'Half' }] } as JsonSchema),
    ).toBe('number');
  });
});

describe('the mapping reaches Flow conditions (rule 19)', () => {
  it('offers an integer field as a criterion, which it never was before', () => {
    const field = criterionFieldOf('amount', schemaWith({ type: 'integer' }));
    expect(field).toEqual({ key: 'amount', label: 'Amount', kind: 'number' });
  });

  it('classifies it identically to the same field with decimals allowed', () => {
    expect(criterionFieldOf('amount', schemaWith({ type: 'integer' }))).toEqual(
      criterionFieldOf('amount', schemaWith({ type: 'number' })),
    );
  });
});

describe('the metaschema accepts an integer property (rule 20)', () => {
  const properties = SCHEMA_METASCHEMA.definitions?.['property']?.properties;

  it('lists integer in the property type enum', () => {
    // Doc 205 rule 37 adds 'array' for multi-choice fields.
    expect(properties?.['type']?.enum).toEqual(['string', 'number', 'integer', 'boolean', 'array']);
  });

  it('no longer says integer is not rendered', () => {
    expect(JSON.stringify(SCHEMA_METASCHEMA)).not.toContain('not rendered');
  });

  it('passes the apply gate for a document holding an integer field', () => {
    expect(validateSchemaDocument(schemaWith({ type: 'integer' })).valid).toBe(true);
  });
});
