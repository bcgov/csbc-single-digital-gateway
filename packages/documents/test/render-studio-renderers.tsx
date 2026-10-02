import { JsonForms } from '@jsonforms/react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import * as studio from '../src/renderers/studio/index';
import { StudioEditorProvider, type ElementPatch } from '../src/renderers/studio/index';

/** Renders `uischema` through the studio set; `editable` wraps it in a provider whose `update` is a spy. */
export function renderStudioRenderers(
  uischema: Record<string, unknown>,
  {
    editable = true,
    schema = { type: 'object' },
    removable = false,
    movable = false,
  }: { editable?: boolean; schema?: object; removable?: boolean; movable?: boolean } = {},
) {
  const update = vi.fn<(id: string, patch: ElementPatch) => void>();
  const insert = vi.fn<(layoutId: string, index: number, itemId: string) => void>();
  const remove = vi.fn<(id: string, name: string) => void>();
  const move = vi.fn<(id: string, layoutId: string, index: number) => void>();
  const form = (
    <JsonForms
      schema={schema}
      uischema={uischema as never}
      data={{}}
      renderers={studio.renderers}
      cells={studio.cells}
      validationMode="NoValidation"
    />
  );
  const view = render(
    editable ? (
      <StudioEditorProvider
        update={update}
        insert={insert}
        {...(removable && { remove })}
        {...(movable && { move })}
      >
        {form}
      </StudioEditorProvider>
    ) : (
      form
    ),
  );
  return { ...view, update, insert, remove, move };
}

export const studioHeading = (
  id: string,
  text?: string,
  options: Record<string, unknown> = {},
) => ({
  id,
  type: 'Heading',
  options: { ...(text !== undefined && { text }), ...options },
});
