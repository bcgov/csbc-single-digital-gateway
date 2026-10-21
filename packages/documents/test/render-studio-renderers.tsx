import { JsonForms } from '@jsonforms/react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import * as studio from '../src/renderers/studio/index';
import { StudioEditorProvider, type ElementPatch } from '../src/renderers/studio/index';
import type { GridCell } from '../src/renderers/default/grid-placement';
import type { Governance } from '../src/studio/capabilities/governance';

/** Renders `uischema` through the studio set; `editable` wraps it in a provider whose `update` is a spy. */
export function renderStudioRenderers(
  uischema: Record<string, unknown>,
  {
    editable = true,
    schema = { type: 'object' },
    removable = false,
    movable = false,
    copyable = false,
    ruleProblems,
    canAddRule,
    governance,
  }: {
    editable?: boolean;
    schema?: object;
    removable?: boolean;
    movable?: boolean;
    copyable?: boolean;
    /** Gives the editor the rule ports (doc 256): Rules opens `editRule`, and this decides the error state. */
    ruleProblems?: (id: string) => string[];
    /** Whether an element has a field above it to test (doc 256 rule 9b); absent: always. */
    canAddRule?: (id: string) => boolean;
    /** The template's rules governing the page (doc 259); absent: ungoverned. */
    governance?: Governance;
  } = {},
) {
  const update = vi.fn<(id: string, patch: ElementPatch) => void>();
  const insert =
    vi.fn<(layoutId: string, index: number, itemId: string, cell?: GridCell) => void>();
  const remove = vi.fn<(id: string, name: string) => void>();
  const move = vi.fn<(id: string, layoutId: string, index: number, cell?: GridCell) => void>();
  // Answers like the host: the copy's id (doc 254 rule 6).
  const copy = vi.fn<(id: string) => string | undefined>((id) => `${id}-copy`);
  const editRule = vi.fn<(id: string) => void>();
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
        {...(copyable && { copy })}
        {...(ruleProblems !== undefined && { editRule, ruleProblems })}
        {...(canAddRule !== undefined && { canAddRule })}
        {...(governance !== undefined && { governance })}
      >
        {form}
      </StudioEditorProvider>
    ) : (
      form
    ),
  );
  return { ...view, update, insert, remove, move, copy, editRule };
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
