import { createContext, useContext } from 'react';

/** What an activated palette item asks of its host (doc 189 rule 9). */
export interface StudioPaletteActions {
  add(template: string): void;
  /**
   * Doc 224: a drag of this template has begun.
   *
   * The palette announces its OWN drags because they start outside every grid — gridstack tells no
   * grid anything until `dropover`, by which point the author has already chosen a target and the
   * highlight has missed its moment. An existing element's drag needs no such call: it starts ON a
   * grid, which reports it through `GridEditor.onDragSource`.
   *
   * Optional, so a host that does not want the highlight is unaffected.
   */
  beginDrag?(template: string): void;
}

// Kept in a module with no components, like grid-editor.ts, so components using it stay Fast Refresh-able.
const StudioPaletteContext = createContext<StudioPaletteActions | null>(null);

/** Provides the palette's actions — the Form Studio inserts the template (doc 189 rules 9, 24). */
export const StudioPaletteProvider = StudioPaletteContext.Provider;

/** The palette's actions, or `null` when the palette renders without a provider. */
export function useStudioPalette(): StudioPaletteActions | null {
  return useContext(StudioPaletteContext);
}
