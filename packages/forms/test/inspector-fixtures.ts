import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import { expect } from 'vitest';
import { inspectorForm, type InspectorForm } from '../src/studio/inspector/inspector-form';
import { createElementIds, type ElementIds } from '../src/studio/layout/element-ids';

// Shared fixtures and helpers for the doc 187 inspector form tests.

export const el = (element: object) => element as UISchemaElement;

export const schema: JsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name', description: 'Your name', maxLength: 80 },
    qty: { type: 'number', title: 'Quantity', minimum: 0, maximum: 100 },
    agree: { type: 'boolean', title: 'Agree' },
  },
  required: ['name'],
};

export const name = el({
  type: 'Control',
  scope: '#/properties/name',
  label: 'Full name',
  options: { placeholder: 'Jane', gridItem: { w: 8 } },
});
export const qty = el({ type: 'Control', scope: '#/properties/qty', options: { step: 5 } });
export const heading = el({ type: 'Heading', text: 'Hello', options: { level: 2, size: 4 } });
export const nested = el({ type: 'Control', scope: '#/properties/a/properties/b' });
export const rowQty = el({
  type: 'Control',
  scope: '#/properties/qty',
  options: { gridItem: { w: 2 } },
});
const rowAgree = el({
  type: 'Control',
  scope: '#/properties/agree',
  options: { gridItem: { w: 1 } },
});
export const row = el({
  type: 'HorizontalLayout',
  label: 'Row',
  options: { columns: 4 },
  elements: [rowQty, rowAgree],
});
export const grid = el({
  type: 'Grid',
  options: { column: 12 },
  elements: [name, qty, heading, nested],
});
export const agree = el({ type: 'Control', scope: '#/properties/agree' });
export const root = el({ type: 'VerticalLayout', elements: [grid, row, agree] });

export interface Built {
  ids: ElementIds;
  form: InspectorForm;
}

export function formFor(
  element: UISchemaElement,
  uischema: UISchemaElement = root,
  docSchema: JsonSchema = schema,
): Built {
  const ids = createElementIds();
  const form = inspectorForm({ schema: docSchema, uischema }, ids.idOf(element), ids);
  if (!form) throw new Error('no inspector form');
  return { ids, form };
}

export type Node = UISchemaElement & { elements?: Node[]; label?: string; scope?: string };

function keyOf(field: Node): string {
  expect(field.type).toBe('Control');
  return (field.scope ?? '').replace('#/properties/', '');
}

/** `[section label, field keys]` in rendered order — every section child must be a field Control. */
export function sections(form: InspectorForm): [string, string[]][] {
  const top = form.uischema as Node;
  expect(top.type).toBe('VerticalLayout');
  return (top.elements ?? []).map((section) => {
    expect(section.type).toBe('Group');
    return [section.label ?? '', (section.elements ?? []).map(keyOf)];
  });
}

export const fieldSchema = (form: InspectorForm, key: string) => form.schema.properties?.[key];

/** The field Control for `key`. */
export const fieldControl = (form: InspectorForm, key: string) =>
  ((form.uischema as Node).elements ?? [])
    .flatMap((section) => section.elements ?? [])
    .find((field) => field.scope === `#/properties/${key}`);
