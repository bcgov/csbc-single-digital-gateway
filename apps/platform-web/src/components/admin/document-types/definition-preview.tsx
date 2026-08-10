import { JsonForms, type JsonSchema, type UISchemaElement } from '@repo/react/jsonforms';
import { displayRenderers } from '@repo/react/jsonforms-renderers-display';
import { useEffect, useRef, useState } from 'react';

export type PreviewMode = 'interactive' | 'readonly';

/**
 * Live preview of a document-type `definition`, rendered through JSONForms. The definition text is
 * debounced and parsed; when it exposes a `schema` object the form is rendered (`uischema` is optional
 * — JSONForms auto-generates one when absent), otherwise a muted notice is shown. Invalid JSON keeps
 * the last valid preview so the pane doesn't flicker while editing.
 *
 * `mode` swaps the renderer set: `interactive` uses the default `@repo/ui` form renderers, `readonly`
 * uses the display renderers — so both renderer sets can be exercised from one place.
 */
export function DefinitionPreview({ text, mode }: { text: string; mode: PreviewMode }) {
  const [debounced, setDebounced] = useState(text);
  const [data, setData] = useState<Record<string, unknown>>({});
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), 300);
    return () => clearTimeout(timer);
  }, [text]);

  // Parse the debounced text; retain the last valid object so invalid keystrokes don't blank the pane.
  const lastValid = useRef<Record<string, unknown> | null>(null);
  let parsed: unknown;
  try {
    parsed = JSON.parse(debounced);
  } catch {
    parsed = undefined;
  }
  if (parsed !== null && typeof parsed === 'object') {
    lastValid.current = parsed as Record<string, unknown>;
  }

  const definition = lastValid.current;
  const schema =
    definition && typeof definition.schema === 'object' && definition.schema !== null
      ? (definition.schema as JsonSchema)
      : undefined;
  const uischema =
    definition && typeof definition.uischema === 'object' && definition.uischema !== null
      ? (definition.uischema as unknown as UISchemaElement)
      : undefined;

  if (!schema) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Preview unavailable for this definition shape.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4" data-testid="definition-preview">
      <JsonForms
        schema={schema}
        {...(uischema ? { uischema } : {})}
        data={data}
        readonly={mode === 'readonly'}
        {...(mode === 'readonly' ? { renderers: displayRenderers } : {})}
        onChange={({ data: next }) => setData(next as Record<string, unknown>)}
      />
    </div>
  );
}
