import { JsonForms } from '@jsonforms/react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import * as studio from '../src/renderers/studio/index';
import { StudioEditorProvider, type ElementPatch } from '../src/renderers/studio/index';

/** Renders `uischema` through the studio set; `editable` wraps it in a provider whose `update` is a spy. */
export function renderStudioRenderers(
  uischema: Record<string, unknown>,
  { editable = true, schema = { type: 'object' } }: { editable?: boolean; schema?: object } = {},
) {
  const update = vi.fn<(id: string, patch: ElementPatch) => void>();
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
    editable ? <StudioEditorProvider update={update}>{form}</StudioEditorProvider> : form,
  );
  return { ...view, update };
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
