import { JsonForms } from '@jsonforms/react';
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
// The search text lives in this JsonForms' own state; a stable seed keeps it while the palette stays mounted.
const PALETTE_DATA = {};

export interface StudioPaletteProps {
  /** What an activated item does — the Form Studio inserts the template next to the selection. */
  readonly actions: StudioPaletteActions;
}

/**
 * The Form Studio palette (doc 189 rules 19, 26-27): the catalogue as a JSONForms form rendered by
 * `renderers/studio-palette`, whose items are dragged onto the canvas or activated through `actions`.
 * `data-studio-palette` keeps Escape typed in its search from walking the selection.
 */
export function StudioPalette({ actions }: StudioPaletteProps) {
  return (
    <div data-studio-palette="" className="flex flex-col gap-3 p-2">
      <StudioPaletteProvider value={actions}>
        <JsonForms
          schema={PALETTE_SCHEMA}
          uischema={PALETTE_UISCHEMA}
          data={PALETTE_DATA}
          renderers={PALETTE_RENDERERS}
          cells={paletteSet.cells}
        />
      </StudioPaletteProvider>
    </div>
  );
}
