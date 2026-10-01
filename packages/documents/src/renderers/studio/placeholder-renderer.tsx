import { rankWith, type LayoutProps, type UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';

/** Any element with a type, at rank 0 — below every real renderer (doc 236 rule 33). */
export const placeholderTester = rankWith(
  0,
  (uischema: UISchemaElement) => typeof uischema.type === 'string',
);

/** A dashed box naming an element the studio has no renderer for yet, so the page never says "No applicable renderer". */
export function PlaceholderRenderer({ uischema, schema }: LayoutProps) {
  return (
    <div
      data-slot="studio-placeholder"
      className="rounded-md border border-dashed border-border px-3 py-2 text-sm"
    >
      {placeholderName(uischema, schema)}
    </div>
  );
}

/** A Control by its label, else its property's title, else its scope's last segment; anything else by its type. */
export function placeholderName(uischema: UISchemaElement, schema: unknown): string {
  const element = uischema as unknown as Record<string, unknown>;
  if (element['type'] !== 'Control') return uischema.type;
  const label = element['label'];
  if (typeof label === 'string' && label !== '') return label;
  const scope = element['scope'];
  const key = typeof scope === 'string' ? (scope.split('/').at(-1) ?? scope) : 'Field';
  const properties = isRecord(schema) && isRecord(schema['properties']) ? schema['properties'] : {};
  const property = properties[key];
  const title = isRecord(property) ? property['title'] : undefined;
  return typeof title === 'string' && title !== '' ? title : key;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const placeholderEntry = {
  tester: placeholderTester,
  renderer: withJsonFormsLayoutProps(PlaceholderRenderer),
};
