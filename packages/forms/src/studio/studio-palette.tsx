import type { JsonFormsCore } from '@jsonforms/core';
import { JsonForms } from '@jsonforms/react';
import { useState } from 'react';
import * as paletteSet from '../renderers/studio-palette/index';
import {
  StudioPaletteProvider,
  type StudioPaletteActions,
} from '../renderers/studio-palette/palette-actions';
import { PALETTE_SCHEMA, PALETTE_UISCHEMA } from './palette/palette-form';

// Built once at module load — a new array per render would make JSONForms re-dispatch everything.
const PALETTE_RENDERERS = [
  ...paletteSet.controlRenderers,
  ...paletteSet.displayRenderers,
  ...paletteSet.layoutRenderers,
];

export interface StudioPaletteProps {
  /** What an activated item does — the Form Studio inserts the template next to the selection. */
  readonly actions: StudioPaletteActions;
}

/**
 * The Form Studio palette (doc 189 rules 19, 26-27): the catalogue as a JSONForms form rendered by
 * `renderers/studio-palette`, whose items are dragged onto the canvas or activated through `actions`.
 * `data-studio-palette` keeps Escape typed in its search from walking the selection. The search text is held here rather
 * than only in JSONForms, which resets its data to the `data` prop whenever the uischema prop changes.
 *
 * Doc 198 rule 19: there is one catalogue again. A Flow is authored on the canvas, so the palette is never shown there.
 */
export function StudioPalette({ actions }: StudioPaletteProps) {
  const [data, setData] = useState<unknown>({});

  return (
    <div data-studio-palette="" className="flex flex-col gap-3 p-2">
      <StudioPaletteProvider value={actions}>
        <JsonForms
          schema={PALETTE_SCHEMA}
          uischema={PALETTE_UISCHEMA}
          data={data}
          renderers={PALETTE_RENDERERS}
          cells={paletteSet.cells}
          onChange={({ data: next }: Pick<JsonFormsCore, 'data'>) => setData(next)}
        />
      </StudioPaletteProvider>
    </div>
  );
}
