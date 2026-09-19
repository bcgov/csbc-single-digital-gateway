import type { JsonSchema } from '@jsonforms/core';
import { describe, expect, it } from 'vitest';
import { fieldAccepts } from '../src/studio/inspector/field-accepts';
import { applyInspector } from '../src/studio/inspector/apply-inspector';
import { inspectorForm } from '../src/studio/inspector/inspector-form';
import { createElementIds } from '../src/studio/layout/element-ids';
import { componentsOf } from '../src/studio/inspector/control-components';
import { OPERATORS_BY_KIND, operatorsFor } from '../src/renderers/xyflow/criteria';
import type { TreeElement } from '../src/studio/layout/element-tree';
import { richText } from './rich-text-fixtures';

// Doc 207 rules 24-29, 31 — editing rich content in the inspector, and what a rich text field may NOT do.

const OBJECT_SCHEMA = { type: 'object' } as JsonSchema;

describe('fieldAccepts (rule 24)', () => {
  it('accepts an object for a field whose schema says object', () => {
    expect(fieldAccepts(OBJECT_SCHEMA, richText())).toBe(true);
  });

  it('still refuses an object for a string, boolean or number field', () => {
    for (const schema of [
      { type: 'string' },
      { type: 'boolean' },
      { type: 'number' },
    ] as JsonSchema[])
      expect(fieldAccepts(schema, richText())).toBe(false);
  });

  it('still refuses an ARRAY, which doc 206 rule 2 keeps off this channel', () => {
    expect(fieldAccepts(OBJECT_SCHEMA, [{ const: 'a' }])).toBe(false);
  });

  it('still accepts clearing', () => {
    expect(fieldAccepts(OBJECT_SCHEMA, undefined)).toBe(true);
  });

  it('leaves every existing acceptance unchanged', () => {
    expect(fieldAccepts({ type: 'string' } as JsonSchema, 'x')).toBe(true);
    expect(fieldAccepts({ type: 'number' } as JsonSchema, 3)).toBe(true);
    expect(fieldAccepts({ type: 'boolean' } as JsonSchema, true)).toBe(true);
    expect(fieldAccepts({ type: 'string' } as JsonSchema, 3)).toBe(false);
  });
});

describe('applyInspector compares structurally (rules 25-26)', () => {
  const docOf = () => {
    const uischema = {
      type: 'Form',
      label: 'A form',
      options: { description: richText('Guidance') },
      elements: [],
    } as unknown as TreeElement;
    return { schema: { type: 'object', properties: {} } as JsonSchema, uischema };
  };

  it('returns the SAME document when an equal-but-new object comes back', () => {
    // The trap: `Object.is` is a REFERENCE check, and JSONForms hands back a new object every change —
    // so without a structural compare an untouched editor re-renders the canvas on every pass.
    const ids = createElementIds();
    const document = docOf();
    const id = ids.idOf(document.uischema);
    const form = inspectorForm(document, id, ids);
    const values = { ...form!.data, formDescription: richText('Guidance') };
    expect(applyInspector(document, id, values, ids)).toBe(document);
  });

  it('writes when the content actually differs', () => {
    const ids = createElementIds();
    const document = docOf();
    const id = ids.idOf(document.uischema);
    const form = inspectorForm(document, id, ids);
    const next = applyInspector(
      document,
      id,
      { ...form!.data, formDescription: richText('Something else') },
      ids,
    );
    expect(next).not.toBe(document);
  });

  it('clears the description when the value is removed', () => {
    const ids = createElementIds();
    const document = docOf();
    const id = ids.idOf(document.uischema);
    const form = inspectorForm(document, id, ids);
    const next = applyInspector(document, id, { ...form!.data, formDescription: undefined }, ids);
    expect((next.uischema as TreeElement).options?.['description']).toBeUndefined();
  });
});

describe('the Form description field (rule 31)', () => {
  it('is a rich text control, keyed formDescription', () => {
    const ids = createElementIds();
    const uischema = { type: 'Form', label: 'A form', elements: [] } as unknown as TreeElement;
    const document = { schema: { type: 'object', properties: {} } as JsonSchema, uischema };
    const form = inspectorForm(document, ids.idOf(uischema), ids);
    const field = form!.schema.properties?.['formDescription'];
    expect(field?.type).toBe('object');
    // Not `description`: that name is already the bound property's field.
    expect(form!.schema.properties?.['description']).toBeUndefined();
  });
});

describe('a rich text field cannot be swapped or mis-configured (rules 27-28)', () => {
  it('offers NO Component picker', () => {
    // `COMPONENTS` is Partial, so an absent kind is legal and means no picker — this is what makes the
    // field non-interchangeable with Input and Textarea, enforced by the type system.
    expect(componentsOf({ controlKind: 'rich-text' } as never)).toBeUndefined();
  });

  it('is not treated as text by the kind-keyed settings', () => {
    expect(componentsOf({ controlKind: 'text' } as never)).toBeDefined();
  });
});

describe('Flow conditions (rule 29)', () => {
  it('offers exactly isEmpty and isNotEmpty', () => {
    expect(operatorsFor('rich-text')).toEqual(['isEmpty', 'isNotEmpty']);
  });

  it('offers no text comparison, which would compare a string to a node tree', () => {
    for (const operator of ['contains', 'startsWith', 'endsWith', 'equals'])
      expect(operatorsFor('rich-text')).not.toContain(operator);
  });

  it('is present in the exhaustive operator record', () => {
    expect(Object.keys(OPERATORS_BY_KIND)).toContain('rich-text');
  });
});
