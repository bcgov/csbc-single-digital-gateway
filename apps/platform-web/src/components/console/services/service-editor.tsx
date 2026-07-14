import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { useMemo } from 'react';

interface Definition {
  schema: Record<string, unknown>;
  uischema: Record<string, unknown>;
}

interface UiElement {
  options?: { format?: string };
}

const isContactMethods = (element: unknown): boolean =>
  (element as UiElement | null)?.options?.format === 'contact-methods';

/**
 * The service version's JSONForms form (controlled). Save draft / Publish live in the detail header
 * (the detail owns the data + dirty state); this is just the rendered form.
 *
 * The title/description/about fields render inside a card; the **contact methods** field (feature 130)
 * renders as its OWN card *outside* that one. Both are separate `<JsonForms>` bound to the same `data`,
 * so each emits the full object (unrendered properties pass through untouched) — the `emit` guard drops
 * no-op re-emits to avoid the two-editable-forms feedback loop.
 */
export function ServiceEditor({
  definition,
  data,
  onChange,
  readonly = false,
}: {
  definition: Definition;
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  readonly?: boolean;
}) {
  const elements = useMemo(() => {
    const list = (definition.uischema as { elements?: unknown }).elements;
    return Array.isArray(list) ? list : [];
  }, [definition.uischema]);

  const mainUischema = useMemo(
    () => ({ ...definition.uischema, elements: elements.filter((el) => !isContactMethods(el)) }),
    [definition.uischema, elements],
  );
  const contactMethodsUischema = useMemo(
    () => ({ ...definition.uischema, elements: elements.filter((el) => isContactMethods(el)) }),
    [definition.uischema, elements],
  );
  const hasContactMethods = (contactMethodsUischema.elements as unknown[]).length > 0;

  const emit = (next: Record<string, unknown>) => {
    if (!readonly && JSON.stringify(next) !== JSON.stringify(data)) {
      onChange(next);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <JsonForms
          schema={definition.schema as JsonSchema}
          uischema={mainUischema as unknown as UISchemaElement}
          data={data}
          readonly={readonly}
          onChange={({ data: next }) => emit(next as Record<string, unknown>)}
        />
      </div>
      {hasContactMethods ? (
        <JsonForms
          schema={definition.schema as JsonSchema}
          uischema={contactMethodsUischema as unknown as UISchemaElement}
          data={data}
          readonly={readonly}
          onChange={({ data: next }) => emit(next as Record<string, unknown>)}
        />
      ) : null}
    </div>
  );
}
