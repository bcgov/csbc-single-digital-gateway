import type { JsonFormsCore } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { useState } from 'react';
import * as paletteSet from '../renderers/studio-palette/index';
import {
  StudioPaletteProvider,
  type StudioPaletteActions,
} from '../renderers/studio-palette/palette-actions';
import { PALETTE_SCHEMA, PALETTE_UISCHEMAS, type PaletteView } from './palette/palette-form';

// Built once at module load — a new array per render would make JSONForms re-dispatch everything.
const PALETTE_RENDERERS = [
  ...paletteSet.controlRenderers,
  ...paletteSet.displayRenderers,
  ...paletteSet.layoutRenderers,
];

export interface StudioPaletteProps {
  /** What an activated item does — the Form Studio inserts the template next to the selection. */
  readonly actions: StudioPaletteActions;
  /** Which catalogue to show (doc 196 rule 17): the form groups, or a Flow's Stage and Form. Defaults to `'form'`. */
  readonly view?: PaletteView;
}

/**
 * The Form Studio palette (doc 189 rules 19, 26-27): the catalogue as a JSONForms form rendered by
 * `renderers/studio-palette`, whose items are dragged onto the canvas or activated through `actions`.
 * `data-studio-palette` keeps Escape typed in its search from walking the selection. The search text is held here, not
 * only in JSONForms: JSONForms resets its data to the `data` prop when the uischema prop changes, and switching the view
 * swaps the uischema while the search must survive (doc 196 rule 17).
 */
export function StudioPalette({ actions, view = 'form' }: StudioPaletteProps) {
  const [data, setData] = useState<unknown>({});

  return (
    <div data-studio-palette="" className="flex flex-col gap-3 p-2">
      <StudioPaletteProvider value={actions}>
        <JsonForms
          schema={PALETTE_SCHEMA}
          uischema={PALETTE_UISCHEMAS[view]}
          data={data}
          renderers={PALETTE_RENDERERS}
          cells={paletteSet.cells}
          onChange={({ data: next }: Pick<JsonFormsCore, 'data'>) => setData(next)}
        />
      </StudioPaletteProvider>
    </div>
  );
}
