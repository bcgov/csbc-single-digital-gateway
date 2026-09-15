import { createContext, useContext } from 'react';

/** What an activated palette item asks of its host (doc 189 rule 9). */
export interface StudioPaletteActions {
  add(template: string): void;
}

// Kept in a module with no components, like grid-editor.ts, so components using it stay Fast Refresh-able.
const StudioPaletteContext = createContext<StudioPaletteActions | null>(null);

/** Provides the palette's actions — the Form Studio inserts the template (doc 189 rules 9, 24). */
export const StudioPaletteProvider = StudioPaletteContext.Provider;

/** The palette's actions, or `null` when the palette renders without a provider. */
export function useStudioPalette(): StudioPaletteActions | null {
  return useContext(StudioPaletteContext);
}
