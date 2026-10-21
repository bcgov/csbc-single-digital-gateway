import { JsonForms } from '@jsonforms/react';
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as studio from '../src/renderers/studio/index';
import { StudioEditorProvider, type ElementPatch } from '../src/renderers/studio/index';
import type { Grid } from './grid-move';
import { studioHeading } from './render-studio-renderers';

describe('nested VerticalLayout reorder (doc 260 bug B1, doc 243)', () => {
  it("hears its OWN change once remounted under a live root grid — gridstack dispatches a sub-grid's on the root", () => {
    const update = vi.fn<(id: string, patch: ElementPatch) => void>();
    const page = (elements: unknown[]) => (
      <StudioEditorProvider update={update} insert={vi.fn()}>
        <JsonForms
          schema={{ type: 'object' }}
          data={{}}
          renderers={studio.renderers}
          cells={studio.cells}
          validationMode="NoValidation"
          uischema={
            {
              id: 'form',
              type: 'Form',
              label: 'Page',
              elements: [{ id: 'v', type: 'VerticalLayout', elements }],
            } as never
          }
        />
      </StudioEditorProvider>
    );
    const view = render(page([studioHeading('a', 'A'), studioHeading('b', 'B')]));
    // A new order is a new grid (doc 236 rule 30): this one is created while the root grid is live, so it gets linked.
    view.rerender(
      page([studioHeading('a', 'A'), studioHeading('b', 'B'), studioHeading('c', 'C')]),
    );
    const nested = view.container.querySelector(
      '[data-element-type="VerticalLayout"] [data-slot="studio-vertical-layout"]',
    ) as Grid;
    act(() => {
      // gridstack's real path: update() → _triggerChangeEvent → _triggerEvent.
      nested.gridstack.update(nested.querySelector<HTMLElement>('[gs-id="a"]')!, { y: 500 });
    });
    expect(update).toHaveBeenCalledTimes(1);
    const [id, patch] = update.mock.calls[0]!;
    expect(id).toBe('v');
    expect((patch.elements as { id: string }[]).map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });
});
